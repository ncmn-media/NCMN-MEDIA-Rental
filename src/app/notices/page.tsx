"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Notice = { id: string; title: string; content?: string; createdAtIso?: string };
export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/notices", { cache: "no-store" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setNotices(d.notices || []); }).catch(e => setError(e instanceof Error ? e.message : "공지사항을 불러오지 못했습니다.")).finally(() => setBusy(false)); }, []);
  return <main className="page-shell">
    <header className="page-top"><Link className="brand" href="/">NCMN <span>MEDIA</span></Link><Link className="back-link" href="/">← 홈으로</Link></header>
    <section className="page-intro"><p className="eyebrow">NOTICES</p><h1>공지사항</h1><p>미디어팀의 공지와 운영 안내를 확인해주세요.</p></section>
    {busy ? <div className="surface content-empty">공지사항을 불러오는 중입니다…</div> : error ? <div className="surface content-empty error-text">{error}</div> : notices.length === 0 ? <div className="surface content-empty">등록된 공지사항이 없습니다.</div> :
      <div className="notice-list">{notices.map(n => <Link className="surface notice-item" href={`/notices/${n.id}`} key={n.id}><div><h2>{n.title}</h2><p>{n.createdAtIso ? new Date(n.createdAtIso).toLocaleDateString("ko-KR") : ""}</p></div><span aria-hidden>↗</span></Link>)}</div>}
  </main>;
}
