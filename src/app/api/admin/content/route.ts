import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, verifyAdminRequest } from "../../../../lib/firebase-admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const collections = ["notices", "mediaLinks"] as const;
type CollectionName = typeof collections[number];
function validCollection(v: string): v is CollectionName { return (collections as readonly string[]).includes(v); }
function clean(body: any, collection: CollectionName) {
  const title = String(body.title || "").trim();
  if (!title || title.length > 160) throw new Error("제목은 1~160자로 입력해 주세요.");
  const published = body.published === true;
  if (collection === "notices") {
    const content = String(body.content || "").trim();
    if (!content) throw new Error("공지 내용을 입력해 주세요.");
    if (content.length > 30000) throw new Error("공지 내용이 너무 깁니다.");
    return { title, content, published };
  }
  const url = String(body.url || "").trim();
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("올바른 자료 URL을 입력해 주세요."); }
  if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("http 또는 https 링크만 등록할 수 있습니다.");
  const type = ["notion-page", "notion-database", "youtube"].includes(body.type) ? body.type : "notion-page";
  return { title, description: String(body.description || "").trim().slice(0, 1000), url, type, published };
}
export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request);
    const url = new URL(request.url);
    const collection = url.searchParams.get("collection") || "";
    if (!validCollection(collection)) return NextResponse.json({ error: "잘못된 자료 유형입니다." }, { status: 400 });
    const snap = await getAdminDb().collection(collection).limit(500).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any,b: any) => String(b.createdAtIso || "").localeCompare(String(a.createdAtIso || "")));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const forbidden = message.includes("관리자 권한") || message.includes("인증 토큰");
    return NextResponse.json({ error: forbidden ? message : "관리자 콘텐츠 조회에 실패했습니다." }, { status: forbidden ? 403 : 500 });
  }
}
export async function POST(request: Request) {
  try {
    await verifyAdminRequest(request);
    const body = await request.json();
    const collection = String(body.collection || "");
    if (!validCollection(collection)) return NextResponse.json({ error: "잘못된 자료 유형입니다." }, { status: 400 });
    const data = clean(body, collection);
    const now = new Date().toISOString();
    const ref = await getAdminDb().collection(collection).add({ ...data, createdAtIso: now, updatedAt: FieldValue.serverTimestamp(), updatedAtIso: now });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    const forbidden = message.includes("관리자 권한") || message.includes("인증 토큰");
    return NextResponse.json({ error: forbidden ? message : message || "등록에 실패했습니다." }, { status: forbidden ? 403 : 400 });
  }
}
