"use client";

import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Volume2, X } from "lucide-react";
import type { SavedWord, WordAnnotation } from "@/lib/types";

interface WordSheetProps {
  selectedWord: {
    word: string;
    contextSentence: string;
    curatedNote?: WordAnnotation;
  } | null;
  lessonId: string;
  lessonTitle: string;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (word: SavedWord) => Promise<void>;
}

interface LookupData {
  word: string;
  ipa: string;
  pos: string;
  zh: string;
  example: string;
}

export function WordSheet({
  selectedWord,
  lessonId,
  lessonTitle,
  isSaved,
  onClose,
  onToggleSave,
}: WordSheetProps) {
  const [data, setData] = useState<LookupData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedWord) {
      setData(null);
      return;
    }

    if (selectedWord.curatedNote) {
      setData({
        word: selectedWord.curatedNote.word,
        ipa: selectedWord.curatedNote.ipa ?? "",
        pos: selectedWord.curatedNote.pos,
        zh: selectedWord.curatedNote.zh,
        example: selectedWord.curatedNote.example ?? "",
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/dictionary?word=${encodeURIComponent(selectedWord.word)}`)
      .then((res) => res.json())
      .then((json: Partial<LookupData>) => {
        if (cancelled) return;
        setData({
          word: json.word || selectedWord.word,
          ipa: json.ipa || "",
          pos: json.pos || "word",
          zh: json.zh || "點擊收藏以結合原句複習。",
          example: json.example || "",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setData({
          word: selectedWord.word,
          ipa: "",
          pos: "word",
          zh: "離線狀態下無法查詢外部字典，仍可直接收藏到單字本。",
          example: "",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedWord]);

  if (!selectedWord) return null;

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  const handleSave = async () => {
    const entry = data ?? {
      word: selectedWord.word,
      ipa: "",
      pos: "word",
      zh: "跟讀收藏單字",
      example: "",
    };
    await onToggleSave({
      id: entry.word.toLowerCase(),
      word: entry.word,
      ipa: entry.ipa || undefined,
      pos: entry.pos,
      zh: entry.zh,
      example: entry.example || undefined,
      contextSentence: selectedWord.contextSentence,
      lessonId,
      lessonTitle,
      savedAt: Date.now(),
      mastered: false,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-[1.5px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="單字解釋"
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-x border-paper-border bg-paper-card px-5 pt-4 pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-paper-border-strong/60" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-serif text-2xl font-semibold text-ink">
                {data?.word || selectedWord.word}
              </h3>
              {data?.ipa && (
                <span className="font-mono text-xs text-ink-subtle">{data.ipa}</span>
              )}
              {data?.pos && (
                <span className="rounded-md bg-ochre-soft px-2 py-0.5 font-mono text-[10px] font-medium text-[#8B6824]">
                  {data.pos}
                </span>
              )}
            </div>
            {selectedWord.curatedNote && (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-sage-dark">
                ★ 本課精選道地用法
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => speak(data?.word || selectedWord.word)}
              className="retro-pill flex h-9 w-9 items-center justify-center rounded-xl bg-slate-soft text-slate-retro"
              aria-label="唸出單字發音"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-soft text-ink-muted hover:text-ink"
              aria-label="關閉"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3.5 min-h-[76px]">
          {loading ? (
            <p className="animate-pulse font-mono text-xs text-ink-subtle">
              查詢字典與語境釋義中...
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-ink">{data?.zh}</p>
              {data?.example && (
                <div className="mt-2.5 rounded-xl border border-paper-border/80 bg-paper px-3 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                    EXAMPLE
                  </span>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    {data.example}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          className={`retro-pill mt-4 mb-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors ${
            isSaved
              ? "bg-sage-soft text-sage-dark border-sage/30"
              : "bg-sage text-paper-card hover:bg-sage-dark"
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="h-4 w-4" />
              已收錄於離線單字本（點擊移除）
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              收藏到離線單字本
            </>
          )}
        </button>
      </div>
    </div>
  );
}
