import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // 웹 브라우저 탭에 표시되는 기본 제목과 설명
  title: "NCMN 미디어 장비 대여",
  description: "NCMN 미디어 장비 대여 신청 페이지입니다.",
  
  // 카카오톡 등 메신저 공유 시 보여지는 오픈그래프(OG) 설정
  openGraph: {
    title: "NCMN 미디어 장비 대여 신청",
    description: "원하시는 장비와 날짜를 선택하여 대여를 신청하세요.",
    url: "https://ncmn-media-rental.vercel.app", // 이전에 캡처에서 보여주신 실제 도메인
    siteName: "NCMN 미디어 장비 대여",
    images: [
      {
        // 🚨 반드시 프로젝트의 public 폴더 안에 이 이름으로 이미지를 넣으셔야 합니다!
        url: "/ncmnlogo.png", 
        width: 1200,
        height: 630,
        alt: "NCMN 미디어 장비 대여 썸네일",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko" // 한국어 사이트이므로 'en'에서 'ko'로 변경했습니다.
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}