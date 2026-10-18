"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

const links = [
  { href: "/rental", icon: "＋", title: "장비 대여 신청", desc: "필요한 장비와 사용 일정을 신청해요.", tag: "신청하기" },
  { href: "/my-reservations", icon: "▤", title: "내 예약 확인", desc: "이름과 전화번호로 신청 내역을 확인해요.", tag: "예약 조회" },
  { href: "/equipment", icon: "▣", title: "장비 목록", desc: "대여할 수 있는 장비를 확인해요.", tag: "목록 보기" },
  { href: "/notices", icon: "✳", title: "공지사항", desc: "미디어팀 공지와 안내를 확인해요.", tag: "공지 보기" },
  { href: "/media", icon: "▧", title: "미디어 자료실", desc: "팀 자료와 노션 문서를 모아봐요.", tag: "자료 보기" },
  { href: "https://pf.kakao.com/_PxbUan/chat", icon: "💬", title: "카카오채널 문의하기", desc: "장비 대여 관련 문의를 남겨주세요.", tag: "문의하기", external: true },
];

export default function HomePage() {
  const [isAdminSignedIn, setIsAdminSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdminSignedIn(Boolean(user));
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const adminHref = isAdminSignedIn ? "/admin" : "/admin/login";
  const adminLabel = !authReady
    ? "관리자 확인 중…"
    : isAdminSignedIn
      ? "관리자 페이지 ↗"
      : "관리자 로그인 ↗";

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <Link className="brand" href="/">
          NCMN <span>MEDIA</span>
        </Link>
        <Link className="admin-link" href={adminHref}>
          {adminLabel}
        </Link>
      </header>

      <section className="hero">
        <p className="eyebrow">NCMN MEDIA TEAM</p>
        <h1>
          미디어팀을 위한
          <br />
          <span>장비 대여 포털</span>
        </h1>
        <p className="hero-copy">
          필요한 장비를 신청하고, 일정과 자료를 한곳에서 확인하세요.
        </p>
        <Link className="primary-link" href="/rental">
          장비 대여 신청하기 <span>→</span>
        </Link>


        <div className="hero-stamp">
          <img
            src="/ncmnlogo.png"
            alt="NCMN MEDIA 로고"
            width={120}
            height={120}
            style={{
              display: "block",
              width: "120px",
              height: "120px",
              objectFit: "contain",
              transform: "none",
              rotate: "0deg",
              scale: "1",
              filter: "none",
            }}
          />
        </div>

      </section>

      <section className="portal-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">QUICK MENU</p>
            <h2>무엇을 도와드릴까요?</h2>
          </div>
        </div>

        <div className="portal-grid">
          {links.map((item, i) => (
            <Link
              href={item.href}
              className={`portal-card ${i === 0 ? "featured" : ""}`}
              key={item.href}

              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}            >
              <span className="card-icon">{item.icon}</span>
              <span className="card-tag">{item.tag} ↗</span>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="portal-footer">
        <span>NCMN MEDIA · 장비 대여 포털</span>
        <span>함께 준비하고, 함께 섬깁니다.</span>
      </footer>
    </main>
  );
}
