import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '爱的地图',
  description: '一个记录甜蜜纪念日、倒计时，并在当天触发专属特效的网站。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
