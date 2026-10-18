import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  const existing = getApps().find((item) => item.name === "ncmn-admin");
  if (existing) return existing;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin 환경 변수가 설정되지 않았습니다.");
  }
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, "ncmn-admin");
}

export function getAdminAuth() { return getAuth(getAdminApp()); }
export function getAdminDb() { return getFirestore(getAdminApp()); }

export async function verifyAdminRequest(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) throw new Error("인증 토큰이 없습니다.");
  const decoded = await getAdminAuth().verifyIdToken(token);
  const allowedUids = (process.env.ADMIN_UIDS || "").split(",").map((v) => v.trim()).filter(Boolean);
  if (!allowedUids.includes(decoded.uid)) throw new Error("관리자 권한이 없습니다.");
  return decoded;
}
