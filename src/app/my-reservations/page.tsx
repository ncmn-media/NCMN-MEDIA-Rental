"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";

type Reservation = { id: string; name?: string; team?: string; phone?: string; startDate?: string; endDate?: string; equipment?: string; location?: string; purpose?: string; requestNotes?: string; submittedAt?: string };

export default function MyReservationsPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<Reservation[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setItems([]); setSearched(false);
    try {
      const response = await fetch("/api/reservations/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "조회에 실패했습니다.");
      setItems(data.reservations || []); setSearched(true);
    } catch (err) { setError(err instanceof Error ? err.message : "조회 중 오류가 발생했습니다."); }
    finally { setBusy(false); }
  }

  return <main className="page-shell"><header className="page-top"><Link className="brand" href="/">NCMN <span>MEDIA</span></Link><Link className="back-link" href="/">← 홈으로</Link></header>
    <section className="page-intro"><p className="eyebrow">MY RESERVATIONS</p><h1>내 예약 확인</h1><p>신청할 때 입력한 이름과 전화번호를 입력해주세요.</p></section>
    <form className="surface lookup-form" onSubmit={submit}><label>이름<input required minLength={2} value={name} onChange={e=>setName(e.target.value.trimStart())} autoComplete="name" placeholder="신청자 이름" /></label><label>전화번호<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" placeholder="01012345678" /></label><button className="primary-button" disabled={busy}>{busy ? "조회 중…" : "예약 조회하기"}</button><p className="form-note">이 방식은 이름과 전화번호가 일치하는 예약을 찾습니다. 본인 인증을 대신하는 방식은 아니므로 조회 링크는 내부에서만 공유해주세요.</p>{error && <p className="error-text">{error}</p>}</form>
    {searched && <section className="results"><h2>조회 결과 <span>{items.length}건</span></h2>{items.length === 0 ? <div className="empty-state">일치하는 예약이 없어요. 입력한 정보를 다시 확인해주세요.</div> : items.map(item=><article className="surface reservation-card" key={item.id}><div className="reservation-top"><strong>{item.equipment || "대여 장비"}</strong><span className="status-pill">신청 내역</span></div><dl><div><dt>대여 시작</dt><dd>{item.startDate || "-"}</dd></div><div><dt>반납 예정</dt><dd>{item.endDate || "-"}</dd></div><div><dt>사용 장소</dt><dd>{item.location || "-"}</dd></div><div><dt>사역팀</dt><dd>{item.team || "-"}</dd></div><div><dt>사용 목적</dt><dd>{item.purpose || "-"}</dd></div>{item.requestNotes && <div><dt>추가 요청</dt><dd>{item.requestNotes}</dd></div>}</dl></article>)}</section>}
  </main>;
}
