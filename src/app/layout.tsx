import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "EchoTape — English Shadowing Studio",
  description:
    "清爽復古風格的英文跟讀 PWA：真實影音雙語字幕、點字翻譯、逐句錄音對比與 AI 發音回饋。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EchoTape",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F6F3EB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh antialiased selection:bg-sage-soft selection:text-ink">
        <PwaRegister />
        <div className="mx-auto min-h-dvh w-full max-w-md bg-paper/70 sm:border-x sm:border-paper-border/70">
          {children}
        </div>
      </body>
    </html>
  );
}
