"use client";

import { useState } from "react";
import { X, Youtube, Sparkles } from "lucide-react";
import type {
  CefrLevel,
  Lesson,
  LessonCategory,
  TranscriptSegment,
} from "@/lib/types";
import { TOPICS } from "@/data/lessons";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: (lesson: Lesson) => Promise<void>;
}

const SAMPLE_SCRIPT = `00:05-00:10 | Good morning everyone, thanks for tuning in today. | 大家早安，謝謝你們今天的收看。
00:10-00:16 | Let's take five minutes to practice natural English rhythm. | 我們花五分鐘來練習自然的英文語調與節奏。
00:16-00:22 | Don't worry about sounding perfect on the first try. | 別擔心第一次跟讀就要唸得完美無瑕。`;

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "").slice(0, 11) || null;
    }
    const v = url.searchParams.get("v");
    if (v) return v.slice(0, 11);
    const embedMatch = url.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[2];
  } catch {
    return null;
  }
  return null;
}

function parseTimeToSec(str: string): number {
  const parts = str.trim().split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] ?? 0;
}

function parseScriptLines(raw: string): TranscriptSegment[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const segments: TranscriptSegment[] = [];
  let cursor = 0;

  lines.forEach((line, index) => {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length >= 2 && parts[0].includes("-")) {
      const [startStr, endStr] = parts[0].split("-");
      const start = parseTimeToSec(startStr);
      const end = Math.max(start + 2, parseTimeToSec(endStr));
      segments.push({
        id: `custom-${index + 1}`,
        start,
        end,
        en: parts[1],
        zh: parts[2] || "（自訂跟讀句）",
      });
      cursor = end;
    } else if (parts[0]) {
      const start = cursor;
      const end = cursor + 5;
      segments.push({
        id: `custom-${index + 1}`,
        start,
        end,
        en: parts[0],
        zh: parts[1] || "（自訂跟讀句）",
      });
      cursor = end + 0.2;
    }
  });

  return segments;
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${s}`;
}

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<CefrLevel>("B2");
  const [category, setCategory] = useState<LessonCategory>("Series");
  const [script, setScript] = useState(SAMPLE_SCRIPT);
  const [error, setError] = useState<string | null>(null);
  const [fetchingCaps, setFetchingCaps] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleAutoFetchCaptions = async () => {
    setError(null);
    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) {
      setError("請先貼上有效的 YouTube 網址或 11 碼影片 ID。");
      return;
    }
    setFetchingCaps(true);
    try {
      const res = await fetch(
        `/api/youtube-captions?videoId=${encodeURIComponent(youtubeId)}`
      );
      const data = (await res.json()) as {
        title?: string;
        segments?: TranscriptSegment[];
        error?: string;
      };
      if (!res.ok || !data.segments || data.segments.length === 0) {
        setError(data.error || "這支影片無法自動抓取字幕，可手動貼上。");
        return;
      }
      if (!title.trim() && data.title) {
        setTitle(data.title);
      }
      const formatted = data.segments
        .map((s) => `${formatSec(s.start)}-${formatSec(s.end)} | ${s.en} | ${s.zh}`)
        .join("\n");
      setScript(formatted);
    } catch {
      setError("抓取字幕失敗，請確認網路連線。");
    } finally {
      setFetchingCaps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const youtubeId = extractYouTubeId(url);
    if (!youtubeId) {
      setError("請輸入有效的 YouTube 網址或 11 碼影片 ID。");
      return;
    }

    const segments = parseScriptLines(script);
    if (segments.length === 0) {
      setError("請至少貼上一句英文台詞。");
      return;
    }

    const durationSec = Math.max(15, Math.round(segments[segments.length - 1].end));
    const newLesson: Lesson = {
      id: `custom-${Date.now()}`,
      title: title.trim() || "My Custom Shadowing Tape",
      subtitleZh: "自訂匯入 YouTube 片段 · 儲存於本機 IndexedDB",
      channel: "Custom Import",
      youtubeId,
      level,
      category,
      durationSec,
      accent: "Global",
      tapeNumber: `CUSTOM · ${level}`,
      tags: ["自訂片段"],
      segments,
      isCustom: true,
    };

    try {
      setSaving(true);
      await onImported(newLesson);
      setUrl("");
      setTitle("");
      onClose();
    } catch {
      setError("儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="匯入 YouTube 跟讀課程"
    >
      <div className="w-full max-w-md rounded-t-3xl border border-paper-border bg-paper-card p-5 shadow-xl sm:rounded-3xl pb-safe">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta">
              <Youtube className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink">製作自訂跟讀磁帶</h2>
              <p className="text-xs text-ink-muted">貼上 YouTube 連結並指定所屬主題</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-soft text-ink-muted hover:text-ink"
            aria-label="關閉視窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              YouTube 影片連結或 ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="min-w-0 flex-1 rounded-xl border border-paper-border bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-sage focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAutoFetchCaptions}
                disabled={fetchingCaps}
                className="retro-pill shrink-0 rounded-xl bg-slate-soft px-3 py-2 text-xs font-semibold text-slate-retro hover:bg-slate-retro hover:text-paper-card disabled:opacity-50"
              >
                {fetchingCaps ? "抓取中..." : "自動抓字幕"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">磁帶標題</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：Sherlock Scene / BBC World Report"
              className="w-full rounded-xl border border-paper-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-sage focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">主題分類</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LessonCategory)}
                className="w-full rounded-xl border border-paper-border bg-paper px-2.5 py-2 text-sm text-ink focus:border-sage focus:outline-none"
              >
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.num}. {t.labelZh}
                  </option>
                ))}
                <option value="Custom">自訂專區</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">難度等級</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CefrLevel)}
                className="w-full rounded-xl border border-paper-border bg-paper px-2.5 py-2 font-mono text-sm text-ink focus:border-sage focus:outline-none"
              >
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="C2">C2</option>
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-ink-muted">
                雙語時間軸字幕（起-迄 | 英文 | 中文）
              </label>
              <button
                type="button"
                onClick={() => setScript(SAMPLE_SCRIPT)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-dark hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                帶入範例
              </button>
            </div>
            <textarea
              rows={4}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full rounded-xl border border-paper-border bg-paper p-3 font-mono text-xs leading-relaxed text-ink focus:border-sage focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-terracotta-soft px-3 py-2 text-xs text-terracotta-dark">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="retro-pill w-full rounded-xl bg-sage py-3 text-sm font-semibold text-paper-card hover:bg-sage-dark disabled:opacity-60"
          >
            {saving ? "寫入磁帶中..." : "加入主題磁帶櫃"}
          </button>
        </form>
      </div>
    </div>
  );
}
