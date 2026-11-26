"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookmarkCheck,
  Check,
  GraduationCap,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  WifiOff,
} from "lucide-react";
import {
  deleteSavedWord,
  getAllSavedWords,
  saveWord,
  toggleWordMastered,
} from "@/lib/db";
import type { SavedWord } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { VocabQuiz } from "@/components/VocabQuiz";

type FilterTab = "all" | "learning" | "mastered";

const STARTER_SAMPLE_WORDS: Omit<SavedWord, "savedAt">[] = [
  {
    id: "cerulean",
    word: "cerulean",
    ipa: "/səˈruː.li.ən/",
    pos: "adj./n.",
    zh: "天青藍、蔚藍色",
    contextSentence: "It's not turquoise, it's not lapis, it's actually cerulean.",
    lessonId: "devil-wears-prada-cerulean-c1",
    lessonTitle: "The Devil Wears Prada — The Cerulean Sweater Monologue",
    mastered: false,
  },
  {
    id: "leverage",
    word: "leverage",
    ipa: "/ˈlev.ɚ.ɪdʒ/",
    pos: "n.",
    zh: "談判籌碼、影響力優勢",
    contextSentence: "You walked into this room assuming leverage belongs to whoever makes the loudest threat.",
    lessonId: "suits-harvey-negotiation-c1",
    lessonTitle: "Suits — Harvey Specter Holds All the Cards",
    mastered: false,
  },
  {
    id: "ambiguous",
    word: "ambiguous",
    ipa: "/æmˈbɪɡ.ju.əs/",
    pos: "adj.",
    zh: "模稜兩可的、語意含糊的",
    contextSentence: "If I tell a friend we're going out for dinner, it's ambiguous whether they're invited.",
    lessonId: "tom-scott-english-features-c1",
    lessonTitle: "Tom Scott — Fantastic Features Missing From English",
    mastered: false,
  },
  {
    id: "nuances",
    word: "nuances",
    ipa: "/ˈnuː.ɑːn.sɪz/",
    pos: "n.",
    zh: "細微差別、微妙層次",
    contextSentence: "Listening closely forces you to confront nuances that headlines rarely capture.",
    lessonId: "vox-global-perspectives-b2",
    lessonTitle: "Vox — Empathy Across Cultural & Political Divides",
    mastered: false,
  },
  {
    id: "relentless",
    word: "relentless",
    ipa: "/rɪˈlent.ləs/",
    pos: "adj.",
    zh: "毫不間斷的、步步緊逼的",
    contextSentence: "What makes it so notoriously difficult is the relentless harmonic shifts.",
    lessonId: "vox-jazz-giant-steps-c1",
    lessonTitle: "The Most Feared Song in Jazz, Explained",
    mastered: false,
  },
  {
    id: "candor",
    word: "candor",
    ipa: "/ˈkæn.dɚ/",
    pos: "n.",
    zh: "坦率直言、真誠不諱",
    contextSentence: "When elevated into dogma, secrecy corrodes the very scientific candor it claims to protect.",
    lessonId: "oppenheimer-strauss-c2",
    lessonTitle: "Oppenheimer — Strauss & Oppenheimer Confrontation",
    mastered: false,
  },
];

export default function VocabPage() {
  const [words, setWords] = useState<SavedWord[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);

  useEffect(() => {
    getAllSavedWords()
      .then((list) => setWords(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((item) => {
      if (tab === "learning" && item.mastered) return false;
      if (tab === "mastered" && !item.mastered) return false;
      if (!q) return true;
      return (
        item.word.toLowerCase().includes(q) ||
        item.zh.toLowerCase().includes(q) ||
        (item.contextSentence ?? "").toLowerCase().includes(q)
      );
    });
  }, [words, query, tab]);

  const speakWord = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.92;
    window.speechSynthesis.speak(utter);
  };

  const handleToggleMastered = async (id: string) => {
    const updated = await toggleWordMastered(id);
    if (!updated) return;
    setWords((prev) => prev.map((w) => (w.id === id ? updated : w)));
  };

  const handleMarkMasteredBatch = async (ids: string[]) => {
    for (const id of ids) {
      const existing = words.find((w) => w.id === id);
      if (existing && !existing.mastered) {
        await toggleWordMastered(id);
      }
    }
    const refreshed = await getAllSavedWords();
    setWords(refreshed);
  };

  const handleDelete = async (id: string) => {
    await deleteSavedWord(id);
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const handleSeedStarterWords = async () => {
    const now = Date.now();
    for (let i = 0; i < STARTER_SAMPLE_WORDS.length; i++) {
      await saveWord({ ...STARTER_SAMPLE_WORDS[i], savedAt: now + i });
    }
    const refreshed = await getAllSavedWords();
    setWords(refreshed);
    setQuizOpen(true);
  };

  return (
    <main className="min-h-dvh px-4 pt-5 pb-28">
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-paper-border bg-paper-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            <WifiOff className="h-3 w-3 text-sage" />
            OFFLINE READY · INDEXEDDB
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">離線單字卡片盒</h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            離線複習收藏單字，並支援拼字、聽音、閱讀 3 種隨堂測驗
          </p>
        </div>
        <span className="shrink-0 rounded-2xl border border-paper-border bg-paper-card px-3 py-1.5 font-mono text-xs font-semibold text-sage-dark">
          {words.length} 字
        </span>
      </header>

      {quizOpen ? (
        <VocabQuiz
          words={words}
          onExit={() => setQuizOpen(false)}
          onMarkMasteredBatch={handleMarkMasteredBatch}
        />
      ) : (
        <>
          {/* Quiz Launcher Banner (when user has >= 1 word) */}
          {words.length > 0 && (
            <section className="retro-card mb-4 flex items-center justify-between gap-3 rounded-3xl p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-terracotta/25 bg-terracotta-soft text-terracotta">
                  <GraduationCap className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-serif text-base font-semibold text-ink">
                    離線單字隨堂測驗
                  </h2>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    看中拼英 · 聽音選中 · 看英選中
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuizOpen(true)}
                className="retro-pill shrink-0 rounded-2xl bg-terracotta px-4 py-2.5 text-xs font-semibold text-paper-card hover:bg-terracotta-dark"
              >
                開始測驗
              </button>
            </section>
          )}

          {/* Search & Filter */}
          <div className="mb-4 space-y-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋單字、中文解釋或原句..."
                className="w-full rounded-2xl border border-paper-border bg-paper-card py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-subtle focus:border-sage focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "all", label: `全部 (${words.length})` },
                  {
                    id: "learning",
                    label: `複習中 (${words.filter((w) => !w.mastered).length})`,
                  },
                  {
                    id: "mastered",
                    label: `已熟記 (${words.filter((w) => w.mastered).length})`,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-xl py-1.5 text-xs font-medium transition-colors ${
                    tab === item.id
                      ? "border border-ink bg-ink text-paper-card"
                      : "border border-paper-border bg-paper-card text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Word Cards */}
          {loading ? (
            <div className="py-12 text-center text-xs text-ink-muted">讀取卡片盒中...</div>
          ) : filteredWords.length === 0 ? (
            <div className="retro-card rounded-3xl p-7 text-center">
              <BookmarkCheck className="mx-auto h-8 w-8 text-sage/70" />
              <h2 className="mt-3 font-serif text-base font-semibold text-ink">
                {words.length === 0 ? "還沒有收藏任何單字" : "找不到符合條件的單字"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                在跟讀影片中點擊任何單字即可收藏；也可以先匯入 6 個精選高階示範單字立即試玩測驗！
              </p>
              {words.length === 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSeedStarterWords}
                    className="retro-pill inline-flex items-center justify-center gap-1.5 rounded-2xl bg-terracotta px-4 py-2.5 text-xs font-semibold text-paper-card"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    匯入 6 個精選示範單字並立即測驗
                  </button>
                  <Link
                    href="/"
                    className="retro-pill inline-flex items-center justify-center rounded-2xl bg-paper-soft px-4 py-2.5 text-xs font-semibold text-ink"
                  >
                    去探索磁帶收藏單字 →
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredWords.map((item) => (
                <li
                  key={item.id}
                  className={`retro-card rounded-2xl p-4 transition-opacity ${
                    item.mastered ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-serif text-lg font-semibold text-ink">
                          {item.word}
                        </h3>
                        {item.ipa && (
                          <span className="font-mono text-xs text-ink-subtle">
                            {item.ipa}
                          </span>
                        )}
                        <span className="rounded-md bg-paper-soft px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                          {item.pos}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink">{item.zh}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => speakWord(item.word)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-soft text-slate-retro transition-colors hover:bg-slate-retro hover:text-paper-card"
                        aria-label={`朗讀 ${item.word}`}
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleMastered(item.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                          item.mastered
                            ? "border-sage bg-sage text-paper-card"
                            : "border-paper-border bg-paper text-ink-muted hover:text-sage-dark"
                        }`}
                        aria-label={item.mastered ? "取消熟記" : "標記已熟記"}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-terracotta-soft hover:text-terracotta"
                        aria-label="刪除單字"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {item.contextSentence && (
                    <div className="mt-3 rounded-xl border border-paper-border/70 bg-paper px-3 py-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                        原句語境
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                        “{item.contextSentence}”
                      </p>
                      {item.lessonId && (
                        <Link
                          href={`/lesson/${item.lessonId}`}
                          className="mt-1 inline-block text-[11px] font-medium text-sage-dark hover:underline"
                        >
                          回到磁帶：{item.lessonTitle || item.lessonId} →
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <BottomNav savedCount={words.length} />
    </main>
  );
}
