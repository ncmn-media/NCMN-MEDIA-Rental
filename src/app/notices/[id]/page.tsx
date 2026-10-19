"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
type Notice = { id: string; title: string; content: string; createdAtIso?: string };
export default function NoticeDetailPage() {
  const params = useParams<{id:string}>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { if (!params.id) return; fetch(`/api/notices/${encodeURIComponent(params.id)}`, { cache: "no-store" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setNotice(d.notice); }).catch(e => setError(e instanceof Error ? e.message : "공지를 불러오지 못했습니다.")); }, [params.id]);
  return <main className="page-shell"><header className="page-top"><Link className="brand" href="/">NCMN <span>MEDIA</span></Link><Link className="back-link" href="/notices">← 공지 목록</Link></header>
    <section className="page-intro"><p className="eyebrow">NOTICE DETAIL</p><h1>{notice?.title || (error ? "공지를 찾을 수 없습니다" : "공지사항")}</h1>{notice?.createdAtIso && <p>{new Date(notice.createdAtIso).toLocaleDateString("ko-KR")}</p>}</section>
    {error ? <div className="surface content-empty">{error}</div> : notice ? <article className="surface notice-content">{notice.content}</article> : <div className="surface content-empty">불러오는 중입니다…</div>}
  </main>;
}
