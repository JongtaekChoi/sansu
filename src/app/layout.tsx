import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '저학년 산수',
  description: '초등 저학년 산수 학습 웹앱',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
