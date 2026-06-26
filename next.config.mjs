/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 이 줄이 있어야 Next.js가 '서버'를 끄고 '정적 파일(HTML/CSS)'만 만듭니다.
  images: { unoptimized: true }, // 이미지 관련 오류 방지
};

export default nextConfig;