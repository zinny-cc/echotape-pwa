"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Play } from "lucide-react";
import type { SubtitleMode, TranscriptSegment, WordAnnotation } from "@/lib/types";

interface SubtitleListProps {
  segments: TranscriptSegment[];
  activeIndex: number;
  subtitleMode: SubtitleMode;
  practicedMap: Map<string, number>;
  onSelectSegment: (index: number) => void;
  onTapWord: (word: string, contextSentence: string, note?: WordAnnotation) => void;
}

function cleanToken(token: string): string {
  return token.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, "").toLowerCase();
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SubtitleList({
  segments,
  activeIndex,
  subtitleMode,
  practicedMap,
  onSelectSegment,
  onTapWord,
}: SubtitleListProps) {
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [activeIndex]);

  return (
    <div className="space-y-2.5">
      {segments.map((seg, index) => {
        const isActive = index === activeIndex;
        const bestScore = practicedMap.get(seg.id);
        const tokens = seg.en.split(/\s+/);

        return (
          <div
            key={seg.id}
            ref={isActive ? activeRef : null}
            onClick={() => onSelectSegment(index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectSegment(index);
              }
            }}
            className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
              isActive
                ? "border-sage bg-paper-card shadow-[0_3px_0_0_#C8D6CC]"
                : "border-paper-border/80 bg-paper-card/60 opacity-75 hover:opacity-100"
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 items-center gap-1 rounded-full px-2 font-mono text-[10px] font-medium ${
                    isActive
                      ? "bg-sage text-paper-card"
                      : "bg-paper-soft text-ink-subtle"
                  }`}
                >
                  {isActive && <Play className="h-2.5 w-2.5 fill-current" />}
                  #{String(index + 1).padStart(2, "0")} · {formatTime(seg.start)}
                </span>
                {typeof bestScore === "number" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-sage-dark">
                    <CheckCircle2 className="h-3 w-3" />
                    {bestScore}
                  </span>
                )}
              </div>
              {isActive && (
                <span className="text-[10px] text-ink-subtle">點擊單字可查翻譯</span>
              )}
            </div>

            {subtitleMode === "hidden" ? (
              <p className="rounded-xl border border-dashed border-paper-border bg-paper-soft/70 py-3 text-center text-xs text-ink-muted">
                盲聽跟讀模式已開啟 · 專注聽語調模仿（切換字幕可核對）
              </p>
            ) : (
              <>
                <p
                  className={`leading-relaxed ${
                    isActive
                      ? "text-[16px] font-medium text-ink"
                      : "text-[14px] text-ink/85"
                  }`}
                >
                  {tokens.map((token, tIdx) => {
                    const normalized = cleanToken(token);
                    const matchedNote = seg.notes?.find(
                      (n) => n.word.toLowerCase() === normalized
                    );
                    return (
                      <span key={`${seg.id}-${tIdx}`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!normalized) return;
                            onTapWord(normalized, seg.en, matchedNote);
                          }}
                          className={`inline rounded-md px-0.5 transition-colors hover:bg-ochre-soft hover:text-ink ${
                            matchedNote
                              ? "underline decoration-ochre decoration-dotted decoration-2 underline-offset-4"
                              : ""
                          }`}
                        >
                          {token}
                        </button>{" "}
                      </span>
                    );
                  })}
                </p>

                {subtitleMode === "bilingual" && (
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                    {seg.zh}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
