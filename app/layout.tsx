import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ahamove Lookback and Speedup",
  description: "Tạo slide hình ảnh và câu chuyện tiếng Việt dựa trên dữ liệu sử dụng Ahamove trong năm qua",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script src="https://unpkg.com/@dotlottie/player-component@latest/dist/dotlottie-player.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
