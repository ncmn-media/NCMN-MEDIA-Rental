import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyAdminRequest } from "../../../../../lib/firebase-admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const collections = ["notices", "mediaLinks"] as const;
function validCollection(v: string) { return (collections as readonly string[]).includes(v); }
function clean(body: any, collection: string) {
  const title = String(body.title || "").trim();
  if (!title || title.length > 160) throw new Error("제목은 1~160자로 입력해 주세요.");
  if (collection === "notices") {
    const content = String(body.content || "").trim();
    if (!content) throw new Error("공지 내용을 입력해 주세요.");
    if (content.length > 30000) throw new Error("공지 내용이 너무 깁니다.");
    return { title, content, published: body.published === true };
  }
  const url = String(body.url || "").trim();
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("올바른 자료 URL을 입력해 주세요."); }
  if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("http 또는 https 링크만 등록할 수 있습니다.");
  return { title, description: String(body.description || "").trim().slice(0, 1000), url, type: ["notion-page","notion-database","youtube"].includes(body.type) ? body.type : "notion-page", published: body.published === true };
}
export async function PATCH(request: Request, context: { params: Promise<{id:string}> }) {
  try {
    await verifyAdminRequest(request);
    const { id } = await context.params;
    const body = await request.json();
    const collection = String(body.collection || "");
    if (!id || id.includes("/") || !validCollection(collection)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    const ref = getAdminDb().collection(collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    const now = new Date().toISOString();
    await ref.update({ ...clean(body, collection), updatedAt: FieldValue.serverTimestamp(), updatedAtIso: now });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const forbidden = message.includes("관리자 권한") || message.includes("인증 토큰");
    return NextResponse.json({ error: forbidden ? message : message || "수정에 실패했습니다." }, { status: forbidden ? 403 : 400 });
  }
}
export async function DELETE(request: Request, context: { params: Promise<{id:string}> }) {
  try {
    await verifyAdminRequest(request);
    const { id } = await context.params;
    const collection = new URL(request.url).searchParams.get("collection") || "";
    if (!id || id.includes("/") || !validCollection(collection)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
    const ref = getAdminDb().collection(collection).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const forbidden = message.includes("관리자 권한") || message.includes("인증 토큰");
    return NextResponse.json({ error: forbidden ? message : "삭제에 실패했습니다." }, { status: forbidden ? 403 : 500 });
  }
}
