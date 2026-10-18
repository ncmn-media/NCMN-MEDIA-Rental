
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminDb,
  verifyAdminRequest,
} from "../../../../../lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await verifyAdminRequest(request);

    const { id } = await context.params;
    if (!id || id.includes("/")) {
      return NextResponse.json(
        { error: "예약 ID가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const body = await request.json();
    if (body.action !== "confirm_return") {
      return NextResponse.json(
        { error: "지원하지 않는 처리입니다." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const ref = db.collection("reservations").doc(id);

    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists) {
        throw new Error("RESERVATION_NOT_FOUND");
      }

      const data = snapshot.data()!;

      const alreadyReturned =
        data.status === "returned" ||
        data.returnStatus === "returned" ||
        data.status === "반납 완료" ||
        Boolean(data.returnedAt);

      if (alreadyReturned) {
        return "already_returned";
      }

      transaction.update(ref, {
        status: "returned",
        returnStatus: "returned",
        returnedAt: FieldValue.serverTimestamp(),
        returnedAtIso: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return "returned";
    });

    return NextResponse.json(
      {
        success: true,
        result,
        message:
          result === "already_returned"
            ? "이미 반납 완료 처리된 예약입니다."
            : "반납 완료 처리했습니다.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "RESERVATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (
      message.includes("관리자 권한") ||
      message.includes("인증 토큰") ||
      message.includes("인증토큰")
    ) {
      return NextResponse.json(
        { error: message },
        { status: 403 }
      );
    }

    console.error("Admin return confirmation failed:", error);

    return NextResponse.json(
      { error: "반납 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

