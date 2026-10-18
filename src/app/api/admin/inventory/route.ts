
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminDb,
  verifyAdminRequest,
} from "../../../../lib/firebase-admin";
import { EQUIPMENT } from "../../../../lib/equipment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (
    message.includes("관리자 권한") ||
    message.includes("인증 토큰") ||
    message.includes("인증토큰")
  ) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  console.error("Admin inventory API failed:", error);

  return NextResponse.json(
    { error: "장비 재고 처리 중 오류가 발생했습니다." },
    { status: 500 }
  );
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : -1;
}

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);

    const snapshot = await getAdminDb().collection("inventory").get();
    const saved = new Map(
      snapshot.docs.map((doc) => [doc.id, doc.data()])
    );

    const items = EQUIPMENT.map((equipment) => {
      const data = saved.get(equipment.id) ?? {};

      const totalQuantity = Math.max(
        0,
        Number(
          data.totalQuantity ??
          data.total ??
          equipment.totalQuantity
        )
      );

      const repairQuantity = Math.max(
        0,
        Number(
          data.repairQuantity ??
          data.unavailableQuantity ??
          data.unavailable ??
          0
        )
      );

      const lostQuantity = Math.max(
        0,
        Number(data.lostQuantity ?? 0)
      );

      return {
        id: equipment.id,
        name: equipment.name,
        totalQuantity,
        repairQuantity,
        lostQuantity,
        unavailableQuantity: repairQuantity + lostQuantity,
        updatedAt:
          data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await verifyAdminRequest(request);

    const body = await request.json();
    const id = String(body.id ?? "");
    const equipment = EQUIPMENT.find((item) => item.id === id);

    if (!equipment) {
      return NextResponse.json(
        { error: "등록되지 않은 장비입니다." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const ref = db.collection("inventory").doc(id);

    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.exists ? snapshot.data()! : {};

      const currentTotal = Math.max(
        0,
        Number(
          data.totalQuantity ??
          data.total ??
          equipment.totalQuantity
        )
      );

      const currentRepair = Math.max(
        0,
        Number(
          data.repairQuantity ??
          data.unavailableQuantity ??
          data.unavailable ??
          0
        )
      );

      const currentLost = Math.max(
        0,
        Number(data.lostQuantity ?? 0)
      );

      const totalQuantity = toNonNegativeInteger(
        Object.prototype.hasOwnProperty.call(body, "totalQuantity")
          ? body.totalQuantity
          : currentTotal,
        currentTotal
      );

      const repairQuantity = toNonNegativeInteger(
        Object.prototype.hasOwnProperty.call(body, "repairQuantity")
          ? body.repairQuantity
          : currentRepair,
        currentRepair
      );

      const lostQuantity = toNonNegativeInteger(
        Object.prototype.hasOwnProperty.call(body, "lostQuantity")
          ? body.lostQuantity
          : currentLost,
        currentLost
      );

      if (
        totalQuantity < 0 ||
        repairQuantity < 0 ||
        lostQuantity < 0
      ) {
        throw new Error("INVALID_INVENTORY_QUANTITY");
      }

      if (repairQuantity + lostQuantity > totalQuantity) {
        throw new Error("INVALID_UNAVAILABLE_QUANTITY");
      }

      transaction.set(
        ref,
        {
          id: equipment.id,
          name: equipment.name,
          totalQuantity,
          repairQuantity,
          lostQuantity,
          unavailableQuantity: repairQuantity + lostQuantity,

          // 기존 버전과의 호환성을 위해 구 필드도 유지
          total: totalQuantity,
          unavailable: repairQuantity + lostQuantity,

          revision: Number(data.revision ?? 0) + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_INVENTORY_QUANTITY") {
        return NextResponse.json(
          { error: "모든 수량은 0 이상의 정수로 입력해 주세요." },
          { status: 400 }
        );
      }

      if (error.message === "INVALID_UNAVAILABLE_QUANTITY") {
        return NextResponse.json(
          {
            error:
              "수리 중 수량과 분실 수량의 합은 총보유 수량을 넘을 수 없습니다.",
          },
          { status: 400 }
        );
      }
    }

    return errorResponse(error);
  }
}
