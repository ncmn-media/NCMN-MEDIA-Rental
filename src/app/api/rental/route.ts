
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../../lib/firebase-admin";
import {
  countBooked,
  getEquipment,
  hasOverlappingLegacyVariantReservation,
} from "../../../lib/equipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const team = String(body.team ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const location = String(body.location ?? "").trim();
    const purpose = String(body.purpose ?? "").trim();
    const requestNotes = String(body.requestNotes ?? "").trim();
    const startAt = Date.parse(String(body.startAt ?? ""));
    const endAt = Date.parse(String(body.endAt ?? ""));
    const requested = body.equipmentItems;

    if (
      name.length < 2 ||
      !team ||
      phone.replace(/\D/g, "").length < 9 ||
      !location ||
      !purpose ||
      !Number.isFinite(startAt) ||
      !Number.isFinite(endAt) ||
      endAt <= startAt ||
      !Array.isArray(requested) ||
      requested.length === 0
    ) {
      return NextResponse.json(
        { error: "필수 항목과 대여 일시, 장비 선택을 확인해주세요." },
        { status: 400 }
      );
    }

    const quantities = new Map<string, number>();

    for (const raw of requested) {
      const id = String(raw?.id ?? "");
      const quantity = Number(raw?.quantity);

      if (
        !getEquipment(id) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return NextResponse.json(
          { error: "장비 선택 정보가 올바르지 않습니다." },
          { status: 400 }
        );
      }

      quantities.set(id, (quantities.get(id) ?? 0) + quantity);
    }

    const selected = [...quantities.entries()].map(([id, quantity]) => {
      const equipment = getEquipment(id)!;
      return { id: equipment.id, name: equipment.name, quantity };
    });

    const db = getAdminDb();
    const inventoryCollection = db.collection("inventory");
    const reservationsCollection = db.collection("reservations");
    const reservationRef = reservationsCollection.doc();

    const inventoryRefs = selected.map((item) =>
      inventoryCollection.doc(item.id)
    );

    const startDate = new Date(startAt).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });
    const endDate = new Date(endAt).toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });
    const submittedAt = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    });

    const equipmentString = selected
      .map((item) => `${item.name} (${item.quantity}개)`)
      .join(", ");

    await db.runTransaction(async (transaction) => {
      // Firestore 트랜잭션에서는 모든 읽기를 먼저 수행한다.
      const inventorySnapshots = await Promise.all(
        inventoryRefs.map((ref) => transaction.get(ref))
      );

      const reservationSnapshot = await transaction.get(
        reservationsCollection
      );

      const reservations = reservationSnapshot.docs.map((doc) => doc.data());

      // 규격을 알 수 없는 구형 예약과 겹치는 신규 신청을 차단한다.
      for (const item of selected) {
        const group = item.id.startsWith("ssd-")
          ? "ssd"
          : item.id.startsWith("screen-")
            ? "screen"
            : null;

        if (
          group &&
          hasOverlappingLegacyVariantReservation(
            reservations,
            group,
            startAt,
            endAt
          )
        ) {
          throw new Error(
            `LEGACY_VARIANT_CONFLICT:${group}:${item.name}`
          );
        }
      }

      // 모든 장비의 재고를 확인한다.
      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];
        const snapshot = inventorySnapshots[i];
        const defaultItem = getEquipment(item.id)!;
        const data = snapshot.exists ? snapshot.data()! : {};

        const confirmedTotals: Record<string, number> = {
          "ssd-500gb": 2,
          "ssd-1tb": 2,
          "ssd-2tb": 2,
          "screen-100": 1,
          "screen-120": 1,
          "screen-150": 1,
        };

        const totalQuantity =
          item.id in confirmedTotals
            ? confirmedTotals[item.id]
            : Math.max(
              0,
              Number(
                data.totalQuantity ??
                data.total ??
                getEquipment(selected[i].id)!.totalQuantity
              )
            );

        const legacyUnavailable = Number(
          data.unavailableQuantity ?? data.unavailable ?? 0
        );

        const repairQuantity = Math.max(
          0,
          Number(data.repairQuantity ?? legacyUnavailable)
        );

        const lostQuantity = Math.max(
          0,
          Number(data.lostQuantity ?? 0)
        );

        const unavailableQuantity = Math.min(
          totalQuantity,
          repairQuantity + lostQuantity
        );

        const booked = countBooked(
          reservations,
          item.id,
          startAt,
          endAt
        );

        const available =
          totalQuantity - unavailableQuantity - booked;

        if (item.quantity > available) {
          throw new Error(
            `재고 부족:${item.name}:현재 선택한 기간에 신청 가능한 수량은 ${Math.max(
              0,
              available
            )}개입니다.`
          );
        }
      }

      // 재고 문서의 revision을 변경해 동시 신청의 충돌을 감지한다.
      for (let i = 0; i < selected.length; i++) {
        const snapshot = inventorySnapshots[i];
        const data = snapshot.exists ? snapshot.data()! : {};
        const item = getEquipment(selected[i].id)!;

        const confirmedTotals: Record<string, number> = {
          "ssd-500gb": 2,
          "ssd-1tb": 2,
          "ssd-2tb": 2,
          "screen-100": 1,
          "screen-120": 1,
          "screen-150": 1,
        };

        const totalQuantity =
          item.id in confirmedTotals
            ? confirmedTotals[item.id]
            : Math.max(
              0,
              Number(data.totalQuantity ?? data.total ?? item.totalQuantity)
            );

        const legacyUnavailable = Number(
          data.unavailableQuantity ?? data.unavailable ?? 0
        );

        const repairQuantity = Math.max(
          0,
          Number(data.repairQuantity ?? legacyUnavailable)
        );

        const lostQuantity = Math.max(
          0,
          Number(data.lostQuantity ?? 0)
        );

        transaction.set(
          inventoryRefs[i],
          {
            id: item.id,
            name: item.name,
            totalQuantity,
            repairQuantity,
            lostQuantity,
            unavailableQuantity: Math.min(
              totalQuantity,
              repairQuantity + lostQuantity
            ),
            revision: Number(data.revision ?? 0) + 1,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      transaction.set(reservationRef, {
        name,
        team,
        phone,
        location,
        purpose,
        requestNotes,
        startDate,
        endDate,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        equipment: equipmentString,
        equipmentItems: selected,
        submittedAt,
        submittedAtIso: new Date().toISOString(),
        status: "reserved",
        returnStatus: "not_returned",
        returnedAt: null,
      });
    });

    return NextResponse.json(
      { success: true, reservationId: reservationRef.id },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.startsWith("LEGACY_VARIANT_CONFLICT:")) {
      const parts = message.split(":");
      const group = parts[1] === "ssd" ? "SSD" : "스크린";

      return NextResponse.json(
        {
          error:
            `기존 ${group} 예약 중 규격을 확인할 수 없는 예약이 있어 ` +
            "선택한 기간에는 해당 장비를 신청할 수 없습니다. " +
            "관리자에게 기존 예약의 규격을 확인해주세요.",
        },
        { status: 409 }
      );
    }

    if (message.startsWith("재고 부족:")) {
      return NextResponse.json(
        { error: message.replace("재고 부족:", "") },
        { status: 409 }
      );
    }

    console.error("Rental submission failed:", error);

    return NextResponse.json(
      {
        error:
          "예약 신청을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
