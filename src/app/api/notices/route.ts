import { NextResponse } from "next/server";
import { getAdminDb } from "../../../lib/firebase-admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const snap = await getAdminDb().collection("notices").where("published", "==", true).limit(200).get();
    const notices = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any,b: any) => String(b.createdAtIso || "").localeCompare(String(a.createdAtIso || "")));
    return NextResponse.json({ notices }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Public notices error", e);
    return NextResponse.json({ error: "공지사항을 불러오지 못했습니다." }, { status: 500 });
  }
}
