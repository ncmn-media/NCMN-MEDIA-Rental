import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const phone = digits(body.phone);
    if (name.length < 2 || phone.length < 9 || phone.length > 11) {
      return NextResponse.json({ error: "이름과 전화번호를 확인해주세요." }, { status: 400 });
    }

    // Read only on the server. Never expose the full reservations collection to the browser.
    const snapshot = await getAdminDb().collection("reservations").where("name", "==", name).limit(100).get();
    const matches = snapshot.docs
      .filter((doc) => digits(doc.get("phone")) === phone)
      .map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ reservations: matches }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Reservation lookup failed", error);
    return NextResponse.json({ error: "예약 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
