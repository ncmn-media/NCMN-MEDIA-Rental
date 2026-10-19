"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, FormEvent } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../lib/firebase";

type ContentItem = { id: string; title: string; content?: string; description?: string; url?: string; type?: string; published?: boolean; createdAtIso?: string };
type Kind = "notices" | "mediaLinks";
const empty = { title: "", content: "", description: "", url: "", type: "notion-page", published: true };
export default function AdminContentPage() {
  const [user, setUser] = useState<User|null>(null);
  const [kind, setKind] = useState<Kind>("notices");
  const [items, setItems] = useState<ContentItem[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const api = useCallback(async (url: string, init: RequestInit = {}) => {
    if (!auth.currentUser) throw new Error("관리자 로그인이 필요합니다.");
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}`, ...(init.body ? {"Content-Type":"application/json"} : {}) }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "요청에 실패했습니다.");
    return data;
  }, []);
  const load = useCallback(async (selected: Kind = kind) => {
    setLoading(true); setError("");
    try { const d = await api(`/api/admin/content?collection=${selected}`); setItems(d.items || []); }
    catch(e) { setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [api, kind]);
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); if (u) void load(); else setLoading(false); }), [load]);
  function switchKind(next: Kind) { setKind(next); setEditing(""); setForm(empty); setMessage(""); void load(next); }
  function startEdit(item: ContentItem) {
    setEditing(item.id); setForm({ title:item.title || "", content:item.content || "", description:item.description || "", url:item.url || "", type:item.type || "notion-page", published:item.published === true }); setMessage(""); window.scrollTo({top:0,behavior:"smooth"});
  }
  function reset() { setEditing(""); setForm(empty); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const payload = { collection:kind, ...form };
      if (editing) await api(`/api/admin/content/${encodeURIComponent(editing)}`, { method:"PATCH", body:JSON.stringify(payload) });
      else await api("/api/admin/content", { method:"POST", body:JSON.stringify(payload) });
      setMessage(editing ? "수정했습니다." : "등록했습니다."); reset(); await load(kind);
    } catch(e) { setError(e instanceof Error ? e.message : "저장에 실패했습니다."); }
    finally { setBusy(false); }
  }
  async function remove(item: ContentItem) {
    if (!window.confirm(`“${item.title}” 항목을 삭제할까요?`)) return;
    setError(""); setMessage("");
    try { await api(`/api/admin/content/${encodeURIComponent(item.id)}?collection=${kind}`, { method:"DELETE" }); setMessage("삭제했습니다."); if(editing===item.id) reset(); await load(kind); }
    catch(e) { setError(e instanceof Error ? e.message : "삭제에 실패했습니다."); }
  }
  if (!user && !loading) return <main className="page-shell"><header className="page-top"><Link className="brand" href="/">NCMN <span>MEDIA</span></Link><Link className="back-link" href="/admin/login">관리자 로그인</Link></header><section className="page-intro"><p className="eyebrow">ADMIN CONTENT</p><h1>공지·자료 관리</h1><p>관리자 로그인이 필요합니다.</p></section><Link className="primary-link" href="/admin/login">로그인하기 ↗</Link></main>;
  return <main className="page-shell"><header className="page-top"><Link className="brand" href="/">NCMN <span>MEDIA</span></Link><Link className="back-link" href="/admin">← 관리자 대시보드</Link></header>
    <section className="page-intro"><p className="eyebrow">ADMIN CONTENT</p><h1>공지·자료 관리</h1><p>공지사항 작성과 외부 자료 링크 등록을 관리합니다.</p></section>
    <div className="content-tabs"><button className={kind==="notices"?"active":""} onClick={()=>switchKind("notices")}>공지사항 관리</button><button className={kind==="mediaLinks"?"active":""} onClick={()=>switchKind("mediaLinks")}>자료실 관리</button></div>
    <form className="surface lookup-form content-editor" onSubmit={submit}>
      <h2>{editing ? "항목 수정" : kind==="notices" ? "새 공지 작성" : "자료 링크 등록"}</h2>
      <label>제목<input required maxLength={160} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="제목을 입력하세요" /></label>
      {kind==="notices" ? <label>공지 내용<textarea required rows={9} value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="공지 내용을 입력하세요" /></label> : <>
        <label>자료 유형<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="notion-page">노션 페이지</option><option value="notion-database">노션 데이터베이스</option><option value="youtube">유튜브 영상</option></select></label>
        <label>자료 URL<input required type="url" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://..." /></label>
        <label>설명<textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="자료에 대한 간단한 설명 (선택)" /></label>
      </>}
      <label className="publish-toggle"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})} /> 공개 게시</label>
      <div className="editor-actions"><button className="primary-button" disabled={busy}>{busy ? "저장 중…" : editing ? "수정 저장" : "등록하기"}</button>{editing && <button type="button" className="secondary-button" onClick={reset}>취소</button>}</div>
      {message && <p className="success-text">{message}</p>}{error && <p className="error-text">{error}</p>}
    </form>
    <section className="results content-results"><h2>{kind==="notices"?"공지 목록":"등록된 자료"} <span>{items.length}개</span></h2>
      {loading ? <div className="surface content-empty">불러오는 중입니다…</div> : items.length===0 ? <div className="surface content-empty">등록된 항목이 없습니다.</div> : items.map(item=><article className="surface content-admin-item" key={item.id}><div className="content-admin-copy"><div className="content-admin-meta"><span className="category-label">{kind==="notices"?"NOTICE":item.type}</span><span className={item.published?"publish-state":"draft-state"}>{item.published?"공개":"비공개"}</span></div><h3>{item.title}</h3><p>{kind==="notices" ? (item.content || "").slice(0,140) : item.description || item.url}</p></div><div className="editor-actions"><button className="secondary-button" onClick={()=>startEdit(item)}>수정</button><button className="danger-button" onClick={()=>void remove(item)}>삭제</button></div></article>)}
    </section>
  </main>;
}
