import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EchoTape — English Shadowing Studio",
    short_name: "EchoTape",
    description:
      "清爽復古風格的英文跟讀 PWA：真實影音雙語字幕、點字翻譯、逐句錄音對比與 AI 發音回饋。",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F3EB",
    theme_color: "#F6F3EB",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
