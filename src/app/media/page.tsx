"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type MediaItem = { id: string; title: string; description?: string; url: string; type: string };
const labels: Record<string,string> = { "notion-page":"NOTION PAGE", "notion-database":"NOTION DATABASE", youtube:"YOUTUBE" };
const icons: Record<string,string> = { "notion-page":"▧", "notion-database":"▤", youtube:"▶" };
export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/media", { cache: "no-store" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setItems(d.items || []); }).catch(e => setError(e instanceof Error ? e.message : "자료를 불러오지 못했습니다.")).finally(() => setBusy(false)); }, []);
  return <main className="page-shell"><header className="page-top"><Link className="brand" href="/">NCMN <span>MEDIA</span></Link><Link className="back-link" href="/">← 홈으로</Link></header>
    <section className="page-intro"><p className="eyebrow">MEDIA LIBRARY</p><h1>미디어 자료실</h1><p>팀에서 함께 사용하는 노션 페이지, 데이터베이스, 교육 영상 링크를 모아두는 공간입니다.</p></section>
    {busy ? <div className="surface content-empty">자료를 불러오는 중입니다…</div> : error ? <div className="surface content-empty error-text">{error}</div> : items.length === 0 ? <div className="surface content-empty">등록된 자료가 없습니다.</div> :
      <div className="media-grid">{items.map(item => <a className="surface media-card" href={item.url} target="_blank" rel="noopener noreferrer" key={item.id}><span className="card-icon">{icons[item.type] || "↗"}</span><span className="category-label">{labels[item.type] || "MEDIA LINK"}</span><h2>{item.title}</h2><p>{item.description || "자료를 열어 내용을 확인하세요."}</p><strong>자료 열기 ↗</strong></a>)}</div>}
    <p className="form-note standalone-note">자료는 외부 링크로 열립니다. 노션 공유 권한 또는 유튜브 일부 공개 설정에 따라 접근이 제한될 수 있습니다.</p>
  </main>;
}
