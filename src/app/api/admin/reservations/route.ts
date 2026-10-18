import { NextResponse } from "next/server";
import { getAdminDb, verifyAdminRequest } from "../../../../lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const snapshot = await getAdminDb().collection("reservations").limit(500).get();
    const reservations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    reservations.sort((a: any, b: any) => String(b.submittedAt ?? "").localeCompare(String(a.submittedAt ?? "")));
    return NextResponse.json({ reservations }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin reservations GET failed:", error);

    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";

    const status =
      message.includes("관리자 권한") ||
        message.includes("인증 토큰") ||
        message.includes("인증토큰")
        ? 403
        : 500;

    return NextResponse.json(
      {
        error:
          status === 403
            ? message
            : "관리자 예약 조회 중 오류가 발생했습니다.",
      },
      { status }
    );
  }
}