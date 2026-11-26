# EchoTape — English Shadowing Studio (PWA)

清爽低飽和復古風格的英文跟讀漸進式網頁應用程式（PWA），對標 Saylo 的四步學習循環：**看真實影音 → 雙語點字理解 → 逐句跟讀錄音對比 → AI 發音與語調回饋**。

## 核心特色

- **新聞報刊式 8 大主題（64 支 10 分鐘以內影片）**：影集、音樂、動漫、電影、科學、冷知識、商業、國際，每個主題皆含 `B1 / B2 / C1 / C2` 各 2 支影片與完整全片對軌雙語字幕（3,085 句）。
- **iOS / Android PWA 友善跟讀工作室**：強制 `playsinline=1` 避免 iOS 全螢幕遮擋字幕；支援 `0.75x / 1.0x / 1.25x` 倍速、單句循環、句尾自動暫停、雙語／僅英文／盲聽切換。
- **跨瀏覽器錄音與原音對比**：自動相容 `audio/webm`（Chrome）與 `audio/mp4`（iOS Safari），錄完自動釋放麥克風軌道避免音量衰減。
- **點字翻譯＋離線單字卡片盒＆3 種測驗**：支援看中文拼英文、聽音選中文、看英文選中文（全離線 IndexedDB + 語音朗讀）。
- **Gemini 多模態音訊發音評分**：支援設定 `GEMINI_API_KEY` 啟用真實 AI 聽音評分，未設定時自動降級為示範評分模式。

## 本機開發與啟動

```bash
npm install
npm run dev
```

## 部署到 Vercel

1. 將此專案推送到你的 GitHub 倉庫。
2. 前往 [vercel.com](https://vercel.com) 匯入該倉庫，Framework Preset 選擇 **Next.js**，點擊 **Deploy**。
3. （選用）於 Vercel 專案設定 **Environment Variables** 加入 `GEMINI_API_KEY`，即可啟用線上真實 AI 發音評分。
