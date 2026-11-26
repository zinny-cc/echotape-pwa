"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  Headphones,
  Keyboard,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  XCircle,
} from "lucide-react";
import { OFFLINE_QUIZ_DISTRACTORS } from "@/data/lessons";
import type { SavedWord } from "@/lib/types";

export type QuizMode = "zh-to-spell" | "audio-to-zh" | "en-to-zh";

interface VocabQuizProps {
  words: SavedWord[];
  scopeLabel?: string;
  onExit: () => void;
  onMarkMasteredBatch: (ids: string[]) => Promise<void>;
}

interface QuizQuestion {
  word: SavedWord;
  promptZh: string;
  correctOptionZh: string;
  options: string[]; // For choice modes (sanitized pure Chinese)
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip English words, phrase prefixes ("on the house：..."), and English
 * parentheticals ("（delicate balance）") from Chinese definitions during a
 * quiz so the English answer is never spoiled inside the prompt or choices.
 */
function sanitizeZhForQuiz(rawZh: string, targetWord?: string): string {
  let text = rawZh.trim();
  if (!text) return text;

  // 1. Strip pure-ASCII English phrase prefix before colon, e.g. "on the house：店家請客"
  text = text.replace(/^[\x00-\x7F]+[：:]\s*/, "");

  // 2. Remove parenthetical remarks that contain English words (3+ letters) or the target word
  const stripEnglishParens = (match: string, inner: string) => {
    const hasTarget =
      targetWord &&
      targetWord.length >= 2 &&
      new RegExp(escapeRegExp(targetWord), "i").test(inner);
    const hasEnglishWord = /[a-zA-Z]{2,}/.test(inner);
    return hasTarget || hasEnglishWord ? "" : match;
  };
  text = text.replace(/（([^）]*)）/g, stripEnglishParens);
  text = text.replace(/\(([^)]*)\)/g, stripEnglishParens);

  // 3. Mask any direct remaining occurrence of targetWord (case-insensitive)
  if (targetWord && targetWord.trim().length >= 2) {
    const cleanTarget = targetWord.trim();
    text = text.replace(new RegExp(`\\b${escapeRegExp(cleanTarget)}\\b`, "gi"), "___");
    // Also catch inflectional stem if >= 5 letters (e.g., "observing" vs "observe")
    if (cleanTarget.length >= 5) {
      const stem = cleanTarget.slice(0, -1);
      text = text.replace(new RegExp(`\\b${escapeRegExp(stem)}[a-zA-Z]*\\b`, "gi"), "___");
    }
  }

  // 4. For Chinese-based definitions (not pure English fallback starting with "英解："),
  // strip leftover standalone English words/phrases so choices stay clean Chinese
  if (!text.startsWith("英解：") && /[\u4e00-\u9fff]/.test(text)) {
    text = text.replace(/[a-zA-Z][a-zA-Z0-9\s'’./?-]*[a-zA-Z]/g, (m) => {
      // Keep common non-spoiler acronyms like AI / C1 / C2 / CEO / ATM / GDP / Q2
      if (/^(AI|IT|UI|UX|C1|C2|B1|B2|GDP|ATM|CEO|R&D|PWA|FT|BBC|TED|QI)$/i.test(m.trim())) {
        return m;
      }
      return "";
    });
    text = text.replace(/^[：:、，,/\s-]+/, "").replace(/[：:、，,/\s-]+$/, "");
    text = text.replace(/\s{2,}/g, " ").replace(/（\s*）/g, "").replace(/\(\s*\)/g, "");
  }

  return text.trim() || "（請依發音或詞性作答）";
}

const MODE_OPTIONS: Array<{
  id: QuizMode;
  num: string;
  title: string;
  subtitle: string;
  badge: string;
}> = [
  {
    id: "zh-to-spell",
    num: "01",
    title: "看中文拼出英文",
    subtitle: "檢視中文釋義與詞性，手動拼寫出正確英文單字（支援提示）",
    badge: "SPELLING",
  },
  {
    id: "audio-to-zh",
    num: "02",
    title: "聽音選出中文意思",
    subtitle: "純聽英文發音（支援 0.75x 慢速重播），從四個選項選出對應中文",
    badge: "LISTENING",
  },
  {
    id: "en-to-zh",
    num: "03",
    title: "看英文選出中文意思",
    subtitle: "快速辨識英文單字與音標，強化閱讀反應與字義連結",
    badge: "READING",
  },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildFallbackZhPool(): string[] {
  return OFFLINE_QUIZ_DISTRACTORS.map((zh) => sanitizeZhForQuiz(zh)).filter(
    (cleaned) => Boolean(cleaned) && cleaned !== "（請依發音或詞性作答）"
  );
}

function buildSpellingMask(word: string): string {
  const trimmed = word.trim();
  if (trimmed.length <= 2) return trimmed[0] + " _";
  return `${trimmed[0]} ${"_ ".repeat(Math.max(1, trimmed.length - 2))}${
    trimmed[trimmed.length - 1]
  }`;
}

export function VocabQuiz({
  words,
  scopeLabel,
  onExit,
  onMarkMasteredBatch,
}: VocabQuizProps) {
  const [phase, setPhase] = useState<"setup" | "playing" | "summary">("setup");
  const [mode, setMode] = useState<QuizMode>("zh-to-spell");
  const [onlyUnmastered, setOnlyUnmastered] = useState(
    () => words.some((w) => !w.mastered)
  );

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [spellInput, setSpellInput] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<
    Array<{ word: SavedWord; correct: boolean; userAnswer: string }>
  >([]);
  const [markedDone, setMarkedDone] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const fallbackPool = useMemo(() => buildFallbackZhPool(), []);

  const unmasteredCount = useMemo(
    () => words.filter((w) => !w.mastered).length,
    [words]
  );

  const eligibleWords = useMemo(() => {
    if (onlyUnmastered && unmasteredCount > 0) {
      return words.filter((w) => !w.mastered);
    }
    return words;
  }, [words, onlyUnmastered, unmasteredCount]);

  const speak = useCallback((text: string, rate = 0.92) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = rate;
    window.speechSynthesis.speak(utter);
  }, []);

  const buildQuestions = useCallback(
    (pool: SavedWord[]): QuizQuestion[] => {
      const shuffled = shuffle(pool).slice(0, 10);
      const allSavedZh = words
        .map((w) => sanitizeZhForQuiz(w.zh, w.word))
        .filter((z) => z && z !== "（請依發音或詞性作答）");

      return shuffled.map((target) => {
        const correctZh = sanitizeZhForQuiz(target.zh, target.word);
        const distractors = new Set<string>();

        for (const zh of shuffle(allSavedZh)) {
          if (zh !== correctZh && distractors.size < 3) {
            distractors.add(zh);
          }
        }
        for (const zh of shuffle(fallbackPool)) {
          if (zh !== correctZh && distractors.size < 3) {
            distractors.add(zh);
          }
        }

        return {
          word: target,
          promptZh: correctZh,
          correctOptionZh: correctZh,
          options: shuffle([correctZh, ...Array.from(distractors)]),
        };
      });
    },
    [words, fallbackPool]
  );

  const startSession = (pool: SavedWord[], selectedMode: QuizMode = mode) => {
    if (pool.length === 0) return;
    const built = buildQuestions(pool);
    setMode(selectedMode);
    setQuestions(built);
    setCurrentIdx(0);
    setSpellInput("");
    setShowHint(false);
    setSelectedChoice(null);
    setAnswered(false);
    setIsCorrect(false);
    setResults([]);
    setMarkedDone(false);
    setPhase("playing");
  };

  const currentQuestion = questions[currentIdx] ?? null;

  // Auto-play pronunciation on each new question in audio-to-zh mode
  useEffect(() => {
    if (phase === "playing" && mode === "audio-to-zh" && currentQuestion && !answered) {
      const timer = window.setTimeout(() => {
        speak(currentQuestion.word.word, 0.9);
      }, 220);
      return () => window.clearTimeout(timer);
    }
  }, [phase, mode, currentIdx, currentQuestion, answered, speak]);

  // Auto-focus spelling input
  useEffect(() => {
    if (phase === "playing" && mode === "zh-to-spell" && !answered) {
      inputRef.current?.focus();
    }
  }, [phase, mode, currentIdx, answered]);

  const handleSubmitSpelling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || answered) return;
    const cleanedUser = spellInput.trim().toLowerCase();
    const cleanedTarget = currentQuestion.word.word.trim().toLowerCase();
    const ok = cleanedUser === cleanedTarget;
    setIsCorrect(ok);
    setAnswered(true);
    setResults((prev) => [
      ...prev,
      { word: currentQuestion.word, correct: ok, userAnswer: spellInput.trim() },
    ]);
    speak(currentQuestion.word.word, 0.92);
  };

  const handleSelectChoice = (option: string) => {
    if (!currentQuestion || answered) return;
    const ok = option === currentQuestion.correctOptionZh;
    setSelectedChoice(option);
    setIsCorrect(ok);
    setAnswered(true);
    setResults((prev) => [
      ...prev,
      { word: currentQuestion.word, correct: ok, userAnswer: option },
    ]);
    if (mode === "en-to-zh") {
      speak(currentQuestion.word.word, 0.92);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setPhase("summary");
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSpellInput("");
    setShowHint(false);
    setSelectedChoice(null);
    setAnswered(false);
    setIsCorrect(false);
  };

  const correctCount = results.filter((r) => r.correct).length;
  const missedWords = results.filter((r) => !r.correct).map((r) => r.word);
  const correctWordIds = results
    .filter((r) => r.correct && !r.word.mastered)
    .map((r) => r.word.id);

  // ======================== PHASE 1: SETUP ========================
  if (phase === "setup") {
    return (
      <section className="space-y-4" aria-label="單字測驗模式選擇">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onExit}
            className="retro-pill inline-flex items-center gap-1.5 rounded-full bg-paper-card px-3 py-1.5 text-xs font-medium text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回單字列表
          </button>
          <span className="font-mono text-[11px] text-ink-subtle">
            OFFLINE QUIZ DECK
          </span>
        </div>

        <div className="retro-card rounded-3xl p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-sage-dark">
              VOCABULARY DRILL · 離線測驗
            </p>
            {scopeLabel && (
              <span className="rounded-full bg-paper-soft px-2.5 py-0.5 text-[10px] font-medium text-ink-muted border border-paper-border">
                範圍：{scopeLabel}
              </span>
            )}
          </div>
          <h2 className="mt-0.5 font-serif text-xl font-semibold text-ink">
            選擇測驗方式
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            所有題庫與發音都在本機離線運作，每次最多抽出 10 題隨機測驗。
          </p>

          {/* Scope Toggle */}
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOnlyUnmastered(true)}
              disabled={unmasteredCount === 0}
              className={`rounded-xl border py-2 text-xs font-medium transition-colors disabled:opacity-45 ${
                onlyUnmastered && unmasteredCount > 0
                  ? "border-sage bg-sage-soft text-sage-dark"
                  : "border-paper-border bg-paper text-ink-muted"
              }`}
            >
              僅測複習中 ({unmasteredCount})
            </button>
            <button
              type="button"
              onClick={() => setOnlyUnmastered(false)}
              className={`rounded-xl border py-2 text-xs font-medium transition-colors ${
                !onlyUnmastered || unmasteredCount === 0
                  ? "border-sage bg-sage-soft text-sage-dark"
                  : "border-paper-border bg-paper text-ink-muted"
              }`}
            >
              全部收藏 ({words.length})
            </button>
          </div>
        </div>

        {/* 3 Quiz Mode Cards */}
        <div className="space-y-2.5">
          {MODE_OPTIONS.map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-ink bg-paper-card shadow-[0_3px_0_0_#C5BBA6]"
                    : "border-paper-border bg-paper-card/75 hover:border-paper-border-strong"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        active
                          ? "border-sage bg-sage text-paper-card"
                          : "border-paper-border bg-paper-soft text-ink-muted"
                      }`}
                    >
                      {item.id === "zh-to-spell" ? (
                        <Keyboard className="h-4 w-4" />
                      ) : item.id === "audio-to-zh" ? (
                        <Headphones className="h-4 w-4" />
                      ) : (
                        <BookOpen className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-ink-subtle">
                          MODE {item.num} · {item.badge}
                        </span>
                      </div>
                      <h3 className="mt-0.5 font-serif text-base font-semibold text-ink">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                      active
                        ? "border-sage bg-sage ring-2 ring-sage-soft"
                        : "border-paper-border-strong bg-paper"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => startSession(eligibleWords, mode)}
          disabled={eligibleWords.length === 0}
          className="retro-pill flex w-full items-center justify-center gap-2 rounded-2xl bg-terracotta py-3.5 text-sm font-semibold text-paper-card hover:bg-terracotta-dark disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          開始測驗（共 {Math.min(10, eligibleWords.length)} 題）
        </button>
      </section>
    );
  }

  // ======================== PHASE 3: SUMMARY ========================
  if (phase === "summary") {
    const pct =
      results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;

    return (
      <section className="space-y-4" aria-label="測驗結果總覽">
        <div className="retro-card rounded-3xl p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-ochre/35 bg-ochre-soft text-[#8B6824]">
            <Trophy className="h-7 w-7" />
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
            SESSION COMPLETE
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">
            答對 {correctCount} / {results.length} 題（{pct}%）
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {pct >= 90
              ? "記憶超扎實！這些字已經融入你的反應反射裡了。"
              : pct >= 60
              ? "表現很棒！把下面答錯的字再重測一次就會記牢。"
              : "別灰心，多聽幾次發音並結合原句再練一輪吧！"}
          </p>

          {correctWordIds.length > 0 && !markedDone && (
            <button
              type="button"
              onClick={async () => {
                await onMarkMasteredBatch(correctWordIds);
                setMarkedDone(true);
              }}
              className="retro-pill mt-4 inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-4 py-2 text-xs font-semibold text-sage-dark"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              將本次答對的 {correctWordIds.length} 個單字標記為「已熟記」
            </button>
          )}
          {markedDone && (
            <p className="mt-3 font-mono text-xs font-medium text-sage-dark">
              ✓ 已更新至離線單字本！
            </p>
          )}
        </div>

        {/* Review List */}
        <div className="space-y-2">
          {results.map((r, idx) => (
            <div
              key={`${r.word.id}-${idx}`}
              className="retro-card flex items-center justify-between gap-2 rounded-2xl px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {r.correct ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-sage" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-terracotta" />
                  )}
                  <span className="font-serif text-base font-semibold text-ink">
                    {r.word.word}
                  </span>
                  {r.word.ipa && (
                    <span className="font-mono text-[11px] text-ink-subtle">
                      {r.word.ipa}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate pl-6 text-xs text-ink-muted">
                  {r.word.zh}
                </p>
              </div>
              <button
                type="button"
                onClick={() => speak(r.word.word)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-soft text-slate-retro"
                aria-label={`朗讀 ${r.word.word}`}
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {missedWords.length > 0 ? (
            <button
              type="button"
              onClick={() => startSession(missedWords, mode)}
              className="retro-pill inline-flex items-center justify-center gap-1.5 rounded-2xl bg-terracotta py-3 text-xs font-semibold text-paper-card"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              只重測錯題 ({missedWords.length})
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPhase("setup")}
              className="retro-pill inline-flex items-center justify-center gap-1.5 rounded-2xl bg-sage py-3 text-xs font-semibold text-paper-card"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              換個模式再測
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="retro-pill rounded-2xl bg-paper-card py-3 text-xs font-semibold text-ink"
          >
            回到單字卡片盒
          </button>
        </div>
      </section>
    );
  }

  // ======================== PHASE 2: PLAYING ========================
  if (!currentQuestion) return null;
  const { word, promptZh, correctOptionZh, options } = currentQuestion;
  const progressPct = Math.round(((currentIdx + (answered ? 1 : 0)) / questions.length) * 100);

  return (
    <section className="space-y-4" aria-label="單字測驗進行中">
      {/* Quiz Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setPhase("setup")}
          className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          結束測驗
        </button>
        <span className="font-mono text-xs font-semibold text-ink">
          {currentIdx + 1} / {questions.length}
        </span>
        <span className="rounded-full bg-sage-soft px-2.5 py-0.5 font-mono text-[11px] font-semibold text-sage-dark">
          答對 {correctCount}
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-2 w-full overflow-hidden rounded-full border border-paper-border bg-paper-soft">
        <div
          className="h-full rounded-full bg-sage transition-all duration-300"
          style={{ width: `${Math.max(8, progressPct)}%` }}
        />
      </div>

      {/* Prompt Card */}
      <div className="retro-card rounded-3xl p-5">
        {mode === "zh-to-spell" && (
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-ochre-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-[#8B6824]">
                看中文拼出英文 · {word.pos}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowHint(true);
                  speak(word.word, 0.85);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-retro hover:underline"
              >
                <Eye className="h-3.5 w-3.5" />
                提示＋聽發音
              </button>
            </div>

            <h2 className="mt-3 font-serif text-xl font-semibold leading-snug text-ink">
              {promptZh}
            </h2>

            {showHint && !answered && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-slate-soft/75 px-3 py-2 font-mono text-xs text-slate-retro">
                <span>提示：{buildSpellingMask(word.word)}</span>
                {word.ipa && <span className="opacity-80">{word.ipa}</span>}
              </div>
            )}

            <form onSubmit={handleSubmitSpelling} className="mt-4 space-y-3">
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={answered}
                value={spellInput}
                onChange={(e) => setSpellInput(e.target.value)}
                placeholder="輸入英文單字..."
                className={`w-full rounded-2xl border bg-paper px-4 py-3 font-mono text-base tracking-wide text-ink placeholder:text-ink-subtle focus:outline-none ${
                  answered
                    ? isCorrect
                      ? "border-sage bg-sage-soft/50 text-sage-dark"
                      : "border-terracotta bg-terracotta-soft/50 text-terracotta-dark"
                    : "border-paper-border focus:border-sage"
                }`}
              />
              {!answered && (
                <button
                  type="submit"
                  disabled={!spellInput.trim()}
                  className="retro-pill w-full rounded-2xl bg-sage py-3 text-sm font-semibold text-paper-card hover:bg-sage-dark disabled:opacity-45"
                >
                  送出拼寫
                </button>
              )}
            </form>
          </div>
        )}

        {mode === "audio-to-zh" && (
          <div className="text-center">
            <span className="inline-block rounded-md bg-slate-soft px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-retro">
              聽音辨義 · LISTENING
            </span>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => speak(word.word, 0.92)}
                className="retro-pill flex h-16 w-16 items-center justify-center rounded-full bg-terracotta text-paper-card hover:bg-terracotta-dark"
                aria-label="正常速度播放發音"
              >
                <Volume2 className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={() => speak(word.word, 0.68)}
                className="retro-pill rounded-2xl bg-paper-soft px-3.5 py-2.5 font-mono text-xs font-semibold text-ink"
              >
                0.7x 慢速
              </button>
            </div>

            <p className="mt-3 text-xs text-ink-muted">
              {answered ? (
                <span className="font-serif text-lg font-semibold text-ink">
                  {word.word}{" "}
                  <span className="font-mono text-xs font-normal text-ink-subtle">
                    {word.ipa}
                  </span>
                </span>
              ) : (
                "點擊播放鍵聽單字發音，從下方選出正確的中文意思"
              )}
            </p>
          </div>
        )}

        {mode === "en-to-zh" && (
          <div className="text-center">
            <span className="inline-block rounded-md bg-sage-soft px-2.5 py-0.5 font-mono text-[10px] font-semibold text-sage-dark">
              看英選中 · {word.pos}
            </span>
            <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-ink">
              {word.word}
            </h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              {word.ipa && (
                <span className="font-mono text-xs text-ink-subtle">{word.ipa}</span>
              )}
              <button
                type="button"
                onClick={() => speak(word.word)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-soft text-slate-retro"
                aria-label="播放發音"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4 Multiple Choice Options for audio-to-zh & en-to-zh */}
      {(mode === "audio-to-zh" || mode === "en-to-zh") && (
        <div className="space-y-2.5">
          {options.map((opt, idx) => {
            const isCorrectOption = opt === correctOptionZh;
            const isPicked = selectedChoice === opt;
            let stateClass =
              "border-paper-border bg-paper-card text-ink hover:border-paper-border-strong";

            if (answered) {
              if (isCorrectOption) {
                stateClass =
                  "border-sage bg-sage-soft text-sage-dark font-semibold";
              } else if (isPicked) {
                stateClass =
                  "border-terracotta bg-terracotta-soft text-terracotta-dark";
              } else {
                stateClass = "border-paper-border/60 bg-paper-card/50 text-ink-subtle opacity-65";
              }
            }

            return (
              <button
                key={`${opt}-${idx}`}
                type="button"
                disabled={answered}
                onClick={() => handleSelectChoice(opt)}
                className={`retro-pill flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm transition-all ${stateClass}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-current/25 font-mono text-[11px] font-semibold">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="leading-snug">{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback Banner & Next Button */}
      {answered && (
        <div
          className={`rounded-2xl border p-4 ${
            isCorrect
              ? "border-sage/40 bg-sage-soft/75"
              : "border-terracotta/40 bg-terracotta-soft/75"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className={`flex items-center gap-1.5 text-sm font-semibold ${
                  isCorrect ? "text-sage-dark" : "text-terracotta-dark"
                }`}
              >
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    答對了！
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    正確答案：{word.word}
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-ink">{word.zh}</p>
              {word.contextSentence && (
                <p className="mt-1.5 text-[11px] italic text-ink-muted">
                  “{word.contextSentence}”
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => speak(word.word)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper-card text-ink"
              aria-label="再聽一次"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="retro-pill mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-xs font-semibold text-paper-card"
          >
            {currentIdx + 1 >= questions.length ? "查看測驗成績" : "下一題"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
