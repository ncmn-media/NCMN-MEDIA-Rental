import { NextResponse } from "next/server";
import { getAdminDb } from "../../../../lib/firebase-admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{id:string}> }) {
  try {
    const { id } = await context.params;
    const snap = await getAdminDb().collection("notices").doc(id).get();
    if (!snap.exists || snap.data()?.published !== true) return NextResponse.json({ error: "공지를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ notice: { id: snap.id, ...snap.data() } }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Notice detail error", e);
    return NextResponse.json({ error: "공지사항을 불러오지 못했습니다." }, { status: 500 });
  }
}
