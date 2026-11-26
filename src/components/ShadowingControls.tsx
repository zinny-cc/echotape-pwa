"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Headphones,
  Mic,
  Pause,
  Repeat,
  RotateCcw,
  Sparkles,
  Square,
  Subtitles,
} from "lucide-react";
import type { SubtitleMode } from "@/lib/types";
import type { RecordingResult } from "@/hooks/useAudioRecorder";

interface ShadowingControlsProps {
  playbackRate: number;
  isLooping: boolean;
  autoPause: boolean;
  subtitleMode: SubtitleMode;
  isPlaying: boolean;
  isRecording: boolean;
  isComparing: boolean;
  evaluating: boolean;
  levels: number[];
  elapsedMs: number;
  recording: RecordingResult | null;
  canPrev: boolean;
  canNext: boolean;
  onCycleRate: () => void;
  onToggleLoop: () => void;
  onToggleAutoPause: () => void;
  onCycleSubtitleMode: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReplaySegment: () => void;
  onToggleRecord: () => void;
  onCompareAudio: () => void;
  onEvaluateRecording: () => void;
}

const SUBTITLE_LABELS: Record<SubtitleMode, string> = {
  bilingual: "雙語",
  en: "僅英文",
  hidden: "盲聽",
};

export function ShadowingControls({
  playbackRate,
  isLooping,
  autoPause,
  subtitleMode,
  isPlaying,
  isRecording,
  isComparing,
  evaluating,
  levels,
  elapsedMs,
  recording,
  canPrev,
  canNext,
  onCycleRate,
  onToggleLoop,
  onToggleAutoPause,
  onCycleSubtitleMode,
  onPrev,
  onNext,
  onReplaySegment,
  onToggleRecord,
  onCompareAudio,
  onEvaluateRecording,
}: ShadowingControlsProps) {
  const secDisplay = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-paper-border bg-paper-card/95 backdrop-blur-md pb-safe">
      {/* Live Waveform / Compare Action Strip */}
      {isRecording ? (
        <div className="flex items-center justify-between border-b border-paper-border/70 bg-terracotta-soft/75 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-terracotta" />
            <span className="font-mono text-[11px] font-semibold text-terracotta-dark">
              REC · {secDisplay}s
            </span>
          </div>
          <div className="flex h-5 items-center gap-1">
            {levels.map((lv, idx) => (
              <span
                key={idx}
                className="w-1 rounded-full bg-terracotta transition-all duration-75"
                style={{ height: `${Math.max(20, Math.round(lv * 100))}%` }}
              />
            ))}
          </div>
          <span className="text-[11px] text-terracotta-dark">點擊停止並評分</span>
        </div>
      ) : recording ? (
        <div className="flex items-center justify-between gap-2 border-b border-paper-border/70 bg-paper-soft/85 px-4 py-2">
          <button
            type="button"
            onClick={onCompareAudio}
            disabled={isComparing}
            className="retro-pill inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-soft py-1.5 text-xs font-semibold text-slate-retro disabled:opacity-60"
          >
            <Headphones className="h-3.5 w-3.5" />
            {isComparing ? "對比播放中..." : "原音 → 我的錄音對比"}
          </button>
          <button
            type="button"
            onClick={onEvaluateRecording}
            disabled={evaluating}
            className="retro-pill inline-flex items-center justify-center gap-1 rounded-xl bg-sage-soft px-3 py-1.5 text-xs font-semibold text-sage-dark disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {evaluating ? "分析中" : "AI 重評"}
          </button>
        </div>
      ) : null}

      {/* Utility Toggle Row */}
      <div className="flex items-center justify-between gap-1.5 px-4 pt-2.5 pb-2">
        <button
          type="button"
          onClick={onCycleRate}
          className="rounded-lg border border-paper-border bg-paper px-2.5 py-1 font-mono text-[11px] font-semibold text-ink hover:border-paper-border-strong"
        >
          {playbackRate.toFixed(2).replace(/\.00$/, ".0")}x
        </button>

        <button
          type="button"
          onClick={onToggleLoop}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            isLooping
              ? "border-sage bg-sage-soft text-sage-dark"
              : "border-paper-border bg-paper text-ink-muted"
          }`}
        >
          <Repeat className="h-3 w-3" />
          單句循環
        </button>

        <button
          type="button"
          onClick={onToggleAutoPause}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            autoPause
              ? "border-ochre bg-ochre-soft text-[#8B6824]"
              : "border-paper-border bg-paper text-ink-muted"
          }`}
        >
          <Pause className="h-3 w-3" />
          句尾暫停
        </button>

        <button
          type="button"
          onClick={onCycleSubtitleMode}
          className="inline-flex items-center gap-1 rounded-lg border border-paper-border bg-paper px-2.5 py-1 text-[11px] font-medium text-ink-muted hover:text-ink"
        >
          {subtitleMode === "hidden" ? (
            <EyeOff className="h-3 w-3" />
          ) : subtitleMode === "en" ? (
            <Eye className="h-3 w-3" />
          ) : (
            <Subtitles className="h-3 w-3" />
          )}
          {SUBTITLE_LABELS[subtitleMode]}
        </button>
      </div>

      {/* Main Tape Deck Controls (Thumb Zone) */}
      <div className="flex items-center justify-between px-5 pt-1 pb-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-paper-border bg-paper text-ink disabled:opacity-35"
          aria-label="上一句"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onReplaySegment}
          className="retro-pill flex h-11 items-center gap-1.5 rounded-2xl bg-paper-soft px-4 text-xs font-semibold text-ink"
          aria-label="重聽這一句"
        >
          <RotateCcw className="h-4 w-4 text-sage-dark" />
          {isPlaying ? "重聽原句" : "播放原句"}
        </button>

        <button
          type="button"
          onClick={onToggleRecord}
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-[0_3px_0_0_#C9BEA8] transition-transform active:translate-y-[1px] ${
            isRecording
              ? "border-terracotta-dark bg-terracotta text-paper-card scale-105"
              : "border-ink bg-terracotta text-paper-card hover:bg-terracotta-dark"
          }`}
          aria-label={isRecording ? "停止錄音" : "開始跟讀錄音"}
        >
          {isRecording ? (
            <Square className="h-5 w-5 fill-current" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-paper-border bg-paper text-ink disabled:opacity-35"
          aria-label="下一句"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
