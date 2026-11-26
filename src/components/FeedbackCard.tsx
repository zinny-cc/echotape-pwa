"use client";

import { Sparkles, Volume2 } from "lucide-react";
import type { PronunciationFeedback } from "@/lib/types";

interface FeedbackCardProps {
  feedback: PronunciationFeedback | null;
  evaluating: boolean;
}

const WORD_STATUS_STYLE = {
  good: "bg-sage-soft text-sage-dark border-sage/30",
  fair: "bg-ochre-soft text-[#8B6824] border-ochre/35",
  missed: "bg-terracotta-soft text-terracotta-dark border-terracotta/30 line-through decoration-terracotta/60",
};

export function FeedbackCard({ feedback, evaluating }: FeedbackCardProps) {
  if (evaluating) {
    return (
      <div className="retro-card rounded-2xl p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-sage-dark">
          <Sparkles className="h-4 w-4 animate-spin" />
          正在分析你的發音節奏與連音自然度...
        </div>
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <section
      aria-label="AI 發音回饋"
      className="retro-card rounded-2xl p-4 transition-all"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 flex-col items-center justify-center rounded-2xl border border-sage/30 bg-sage-soft">
            <span className="font-mono text-base font-bold leading-none text-sage-dark">
              {feedback.overallScore}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-sage-dark/80">
              FLOW
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-sm font-semibold text-ink">AI 跟讀回饋</h3>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${
                  feedback.engine === "gemini"
                    ? "bg-sage text-paper-card"
                    : "bg-paper-soft text-ink-muted border border-paper-border"
                }`}
              >
                {feedback.engine === "gemini" ? "Gemini Audio" : "Demo Mode"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-ink-muted">
              <span>準確 {feedback.accuracyScore}</span>
              <span>流暢 {feedback.fluencyScore}</span>
              <span>語調 {feedback.intonationScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Word-level highlight chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {feedback.wordScores.map((item, idx) => (
          <span
            key={`${item.word}-${idx}`}
            className={`rounded-lg border px-2 py-0.5 text-xs font-medium ${
              WORD_STATUS_STYLE[item.status]
            }`}
          >
            {item.word}
          </span>
        ))}
      </div>

      {/* Natural coaching tip */}
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-paper-border/80 bg-paper px-3 py-2.5">
        <Volume2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta" />
        <p className="text-xs leading-relaxed text-ink">{feedback.tipZh}</p>
      </div>
    </section>
  );
}
