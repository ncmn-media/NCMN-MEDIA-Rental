
import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";
import {
  EQUIPMENT,
  countBooked,
  hasOverlappingLegacyVariantReservation,
} from "../../../lib/equipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get("startAt");
    const endParam = searchParams.get("endAt");

    if (Boolean(startParam) !== Boolean(endParam)) {
      return NextResponse.json(
        { error: "대여 시작일과 반납일을 모두 선택해주세요." },
        { status: 400 }
      );
    }

    let startAt: number | null = null;
    let endAt: number | null = null;

    if (startParam && endParam) {
      startAt = Date.parse(startParam);
      endAt = Date.parse(endParam);

      if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) {
        return NextResponse.json(
          { error: "대여 시작일 또는 반납일 형식이 올바르지 않습니다." },
          { status: 400 }
        );
      }

      if (endAt <= startAt) {
        return NextResponse.json(
          { error: "반납일은 대여 시작일보다 늦어야 합니다." },
          { status: 400 }
        );
      }
    }

    const db = getAdminDb();

    const [inventorySnapshot, reservationsSnapshot] = await Promise.all([
      db.collection("inventory").get(),
      db.collection("reservations").get(),
    ]);

    const inventoryById = new Map(
      inventorySnapshot.docs.map((doc) => [doc.id, doc.data()])
    );

    const reservations = reservationsSnapshot.docs.map((doc) => doc.data());

    const items = EQUIPMENT.map((equipment) => {
      const saved = inventoryById.get(equipment.id) ?? {};


      const confirmedTotals: Record<string, number> = {
        "ssd-500gb": 2,
        "ssd-1tb": 2,
        "ssd-2tb": 2,
        "screen-100": 1,
        "screen-120": 1,
        "screen-150": 1,
      };

      const totalQuantity =
        equipment.id in confirmedTotals
          ? confirmedTotals[equipment.id]
          : Math.max(
            0,
            Number(saved.totalQuantity ?? saved.total ?? equipment.totalQuantity)
          );


      const legacyUnavailable = Number(
        saved.unavailableQuantity ?? saved.unavailable ?? 0
      );

      const repairQuantity = Math.max(
        0,
        Number(saved.repairQuantity ?? legacyUnavailable)
      );

      const lostQuantity = Math.max(
        0,
        Number(saved.lostQuantity ?? 0)
      );

      const unavailableQuantity = Math.min(
        totalQuantity,
        repairQuantity + lostQuantity
      );

      const bookedQuantity =
        startAt !== null && endAt !== null
          ? countBooked(reservations, equipment.id, startAt, endAt)
          : 0;

      // 규격을 모르는 구형 예약이 겹치면 안전을 위해
      // 해당 그룹의 모든 규격을 일시적으로 신청 불가 처리한다.
      const legacyConflict =
        startAt !== null &&
        endAt !== null &&
        (
          (
            equipment.id.startsWith("ssd-") &&
            hasOverlappingLegacyVariantReservation(
              reservations, "ssd", startAt, endAt
            )
          ) ||
          (
            equipment.id.startsWith("screen-") &&
            hasOverlappingLegacyVariantReservation(
              reservations, "screen", startAt, endAt
            )
          )
        );

      const calculatedAvailable = Math.max(
        0,
        totalQuantity - unavailableQuantity - bookedQuantity
      );

      const availableQuantity = legacyConflict
        ? 0
        : calculatedAvailable;

      return {
        id: equipment.id,
        name: equipment.name,
        totalQuantity,
        unavailableQuantity,
        repairQuantity,
        lostQuantity,
        bookedQuantity,
        availableQuantity,
        legacyConflict,

        // 이전 UI 호환 필드
        total: totalQuantity,
        unavailable: unavailableQuantity,
        booked: bookedQuantity,
        available: availableQuantity,
      };
    });

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[GET /api/equipment]", error);

    return NextResponse.json(
      { error: "장비 수량을 불러오지 못했습니다." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
