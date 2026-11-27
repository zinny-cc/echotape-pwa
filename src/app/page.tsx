"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  Briefcase,
  Cat,
  CheckCircle2,
  Clock,
  Coins,
  Disc3,
  Film,
  Flame,
  Globe2,
  KeyRound,
  Lightbulb,
  Music,
  Play,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Tv,
  X,
} from "lucide-react";
import { CURATED_LESSONS, TOPICS, getYoutubeThumbnail } from "@/data/lessons";
import {
  deleteCustomLesson,
  getAllProgress,
  getAllSavedWords,
  getCustomLessons,
  saveCustomLesson,
} from "@/lib/db";
import { hasAnyUrgentCat, loadPetState } from "@/lib/pets";
import type {
  CefrLevel,
  Lesson,
  LessonCategory,
  PetGameState,
  PracticeProgress,
  TopicMeta,
} from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { ImportModal } from "@/components/ImportModal";

const LEVELS: Array<{ id: "ALL" | CefrLevel; label: string }> = [
  { id: "ALL", label: "全部難度" },
  { id: "B1", label: "B1 自然口語" },
  { id: "B2", label: "B2 流暢進階" },
  { id: "C1", label: "C1 高階精準" },
  { id: "C2", label: "C2 頂尖母語" },
];

const LEVEL_STYLES: Record<CefrLevel, string> = {
  B1: "bg-sage-soft text-sage-dark border-sage/25",
  B2: "bg-slate-soft text-slate-retro border-slate-retro/25",
  C1: "bg-ochre-soft text-[#8B6824] border-ochre/30",
  C2: "bg-terracotta-soft text-terracotta-dark border-terracotta/30",
};

const TONE_BADGE: Record<TopicMeta["tone"], string> = {
  terracotta: "bg-terracotta-soft text-terracotta-dark border-terracotta/20",
  slate: "bg-slate-soft text-slate-retro border-slate-retro/20",
  ochre: "bg-ochre-soft text-[#8B6824] border-ochre/25",
  sage: "bg-sage-soft text-sage-dark border-sage/25",
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function TopicIcon({
  id,
  className = "h-5 w-5",
}: {
  id: TopicMeta["id"];
  className?: string;
}) {
  switch (id) {
    case "Series":
      return <Tv className={className} />;
    case "Music":
      return <Music className={className} />;
    case "Anime":
      return <Sparkles className={className} />;
    case "Movies":
      return <Film className={className} />;
    case "Science":
      return <Atom className={className} />;
    case "Trivia":
      return <Lightbulb className={className} />;
    case "Business":
      return <Briefcase className={className} />;
    case "World":
      return <Globe2 className={className} />;
    case "Sports":
      return <Trophy className={className} />;
    case "Space":
      return <Rocket className={className} />;
  }
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // null = Newsstand Topic Selection Landing Page; value = Topic Feed View
  const [activeTopic, setActiveTopic] = useState<LessonCategory | "ALL" | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<"ALL" | CefrLevel>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [customLessons, setCustomLessons] = useState<Lesson[]>([]);
  const [progressList, setProgressList] = useState<PracticeProgress[]>([]);
  const [savedWordCount, setSavedWordCount] = useState(0);
  const [petState, setPetState] = useState<PetGameState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [keySavedToast, setKeySavedToast] = useState(false);

  useEffect(() => {
    if (searchParams.get("import") === "1") {
      setImportOpen(true);
    }
    const topicParam = searchParams.get("topic") as LessonCategory | "ALL" | null;
    if (topicParam) {
      setActiveTopic(topicParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const stored = window.localStorage.getItem("echotape_gemini_key") ?? "";
    setGeminiKey(stored);

    loadPetState()
      .then((pets) => setPetState(pets))
      .catch(() => {});

    Promise.all([getCustomLessons(), getAllProgress(), getAllSavedWords()])
      .then(([customs, prog, words]) => {
        setCustomLessons(customs);
        setProgressList(prog);
        setSavedWordCount(words.length);
      })
      .catch(() => {});
  }, []);

  const allLessons = useMemo(
    () => [...customLessons, ...CURATED_LESSONS],
    [customLessons]
  );

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: allLessons.length };
    allLessons.forEach((l) => {
      counts[l.category] = (counts[l.category] ?? 0) + 1;
    });
    return counts;
  }, [allLessons]);

  const c2Spotlights = useMemo(
    () =>
      allLessons
        .filter((l) => l.level === "C2")
        .filter((_, idx) => idx % 2 === 0)
        .slice(0, 6),
    [allLessons]
  );

  const levelCountsInTopic = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const counts: Record<string, number> = { ALL: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    allLessons.forEach((l) => {
      if (activeTopic && activeTopic !== "ALL" && l.category !== activeTopic) {
        return;
      }
      if (
        q &&
        !(
          l.title.toLowerCase().includes(q) ||
          l.subtitleZh.toLowerCase().includes(q) ||
          l.channel.toLowerCase().includes(q) ||
          (l.tags ?? []).some((t) => t.toLowerCase().includes(q))
        )
      ) {
        return;
      }
      counts.ALL += 1;
      counts[l.level] = (counts[l.level] ?? 0) + 1;
    });
    return counts;
  }, [allLessons, activeTopic, searchQuery]);

  const progressByLesson = useMemo(() => {
    const map = new Map<string, number>();
    progressList.forEach((p) => {
      map.set(p.lessonId, (map.get(p.lessonId) ?? 0) + 1);
    });
    return map;
  }, [progressList]);

  const isSearching = searchQuery.trim().length > 0;
  const showingFeed = activeTopic !== null || isSearching;

  const filteredLessons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allLessons.filter((l) => {
      if (activeTopic && activeTopic !== "ALL" && l.category !== activeTopic) {
        return false;
      }
      if (selectedLevel !== "ALL" && l.level !== selectedLevel) {
        return false;
      }
      if (!q) return true;
      return (
        l.title.toLowerCase().includes(q) ||
        l.subtitleZh.toLowerCase().includes(q) ||
        l.channel.toLowerCase().includes(q) ||
        (l.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [allLessons, activeTopic, selectedLevel, searchQuery]);

  const activeTopicMeta = useMemo(
    () => TOPICS.find((t) => t.id === activeTopic) ?? null,
    [activeTopic]
  );

  const handleOpenTopic = (topic: LessonCategory | "ALL", level?: "ALL" | CefrLevel) => {
    setActiveTopic(topic);
    setSelectedLevel(level ?? "ALL");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetToTopics = () => {
    setActiveTopic(null);
    setSelectedLevel("ALL");
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImportLesson = async (lesson: Lesson) => {
    await saveCustomLesson(lesson);
    setCustomLessons((prev) => [lesson, ...prev]);
    router.push(`/lesson/${lesson.id}`);
  };

  const handleDeleteCustom = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteCustomLesson(id);
    setCustomLessons((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = geminiKey.trim();
    if (cleaned) {
      window.localStorage.setItem("echotape_gemini_key", cleaned);
    } else {
      window.localStorage.removeItem("echotape_gemini_key");
    }
    setKeySavedToast(true);
    setTimeout(() => {
      setKeySavedToast(false);
      setApiKeyOpen(false);
    }, 900);
  };

  const practicedCount = progressList.length;
  const petAlert = petState ? hasAnyUrgentCat(petState) : false;

  return (
    <main className="min-h-dvh px-4 pt-5 pb-28">
      {/* Editorial Newsstand Masthead */}
      <header className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-paper-border bg-paper-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" />
            SHADOWING NEWSSTAND · {TOPICS.length} TOPICS
          </div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight tracking-tight text-ink">
            EchoTape
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            像翻閱雜誌報刊一樣，挑選你有興趣的主題練出高階口說
          </p>
        </div>

        <button
          type="button"
          onClick={() => setApiKeyOpen((v) => !v)}
          className={`retro-pill flex h-10 w-10 items-center justify-center rounded-2xl ${
            geminiKey
              ? "bg-sage-soft text-sage-dark"
              : "bg-paper-card text-ink-muted hover:text-ink"
          }`}
          title="設定 Gemini API Key（啟用真實 AI 發音評分）"
          aria-label="設定 Gemini API Key"
        >
          <KeyRound className="h-4 w-4" />
        </button>
      </header>

      {/* Collapsible Gemini API Key Settings Card */}
      {apiKeyOpen && (
        <form onSubmit={handleSaveGeminiKey} className="retro-card mb-4 rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-ochre" />
              Gemini 音訊評分引擎設定
            </div>
            <span className="font-mono text-[10px] text-ink-subtle">
              {geminiKey ? "LIVE MODE" : "DEMO MODE"}
            </span>
          </div>
          <p className="mb-2.5 text-[11px] leading-relaxed text-ink-muted">
            未填寫時預設使用「示範評分模式」。貼上你的 Google Gemini API Key（僅存本機），即可直接聽音分析發音、重音與連音。
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="min-w-0 flex-1 rounded-xl border border-paper-border bg-paper px-3 py-2 font-mono text-xs text-ink focus:border-sage focus:outline-none"
            />
            <button
              type="submit"
              className="retro-pill rounded-xl bg-sage px-3.5 py-2 text-xs font-semibold text-paper-card"
            >
              {keySavedToast ? "已儲存" : "套用"}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜尋主題、劇名或關鍵字（如 Sherlock、BBC、黑洞、策略）"
          className="w-full rounded-2xl border border-paper-border bg-paper-card py-2.5 pl-10 pr-9 text-xs text-ink placeholder:text-ink-subtle focus:border-sage focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
            aria-label="清除搜尋"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: NEWSSTAND TOPIC SELECTION LANDING PAGE                    */}
      {/* ================================================================= */}
      {!showingFeed ? (
        <div className="space-y-5">
          {/* Compact Daily Status & Cat House Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-paper-border bg-paper-card px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-xs text-ink">
                <Disc3 className="h-4 w-4 text-sage" />
                <span>
                  今日已練 <strong className="font-mono text-sage-dark">{practicedCount}</strong> 句 · 共{" "}
                  <strong className="font-mono">{allLessons.length}</strong> 卷磁帶
                </span>
              </div>
              <Link
                href="/vocab"
                className="font-mono text-[11px] font-medium text-sage-dark hover:underline"
              >
                單字本 {savedWordCount} →
              </Link>
            </div>

            {petState && (
              <Link
                href="/pets"
                className="retro-card flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 transition-colors hover:border-paper-border-strong"
              >
                <div className="flex items-center gap-2 text-xs text-ink">
                  <span className="relative flex h-7 w-7 items-center justify-center rounded-xl border border-terracotta/25 bg-terracotta-soft text-terracotta">
                    <Cat className="h-4 w-4" />
                    {petAlert && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-paper-card bg-terracotta" />
                    )}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ink">
                      Verdi 與 牛肝菌的小屋
                    </p>
                    <p className="text-[10px] text-ink-muted">
                      {petAlert
                        ? "有貓咪肚子餓到快生氣囉！快去餵罐頭"
                        : `今日單字任務 ${petState.daily.learnedWordIds.length}/5 字`}
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ochre/35 bg-ochre-soft px-2.5 py-1 font-mono text-[11px] font-bold text-[#8B6824]">
                  <Coins className="h-3.5 w-3.5 text-ochre" />
                  {petState.ccCoins} CC
                </span>
              </Link>
            )}
          </div>

          {/* 8-Topic Newsstand Grid */}
          <section aria-label="影片主題分類">
            <div className="mb-3 flex items-baseline justify-between border-b border-paper-border pb-2">
              <h2 className="font-serif text-lg font-semibold text-ink">選擇跟讀主題</h2>
              <button
                type="button"
                onClick={() => handleOpenTopic("ALL")}
                className="font-mono text-[11px] text-sage-dark hover:underline"
              >
                瀏覽全部 ({allLessons.length}) →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map((topic) => {
                const count = topicCounts[topic.id] ?? 0;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleOpenTopic(topic.id)}
                    className="retro-card group flex flex-col justify-between rounded-2xl p-3.5 text-left transition-all hover:border-paper-border-strong active:translate-y-[1px]"
                  >
                    <div>
                      <div className="mb-2.5 flex items-center justify-between">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                            TONE_BADGE[topic.tone]
                          }`}
                        >
                          <TopicIcon id={topic.id} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="rounded-md border border-paper-border bg-paper px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-muted">
                          {topic.levelRange}
                        </span>
                      </div>

                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                        {topic.num} · {topic.labelEn}
                      </p>
                      <h3 className="mt-0.5 font-serif text-[18px] font-semibold leading-snug text-ink">
                        {topic.labelZh}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
                        {topic.tagline}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-paper-border/70 pt-2">
                      <span className="font-mono text-[10px] text-ink-subtle">
                        {count} 卷磁帶
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* C2 Mastery Challenge Spotlight */}
          <section aria-label="C2 頂尖母語挑戰精選">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-terracotta" />
                <h2 className="font-serif text-base font-semibold text-ink">
                  C2 頂尖母語挑戰
                </h2>
              </div>
              <button
                type="button"
                onClick={() => handleOpenTopic("ALL", "C2")}
                className="font-mono text-[11px] text-terracotta-dark hover:underline"
              >
                全部 C2 (16) →
              </button>
            </div>

            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
              {c2Spotlights.map((lesson) => {
                const topicObj = TOPICS.find((t) => t.id === lesson.category);
                return (
                  <Link
                    key={lesson.id}
                    href={`/lesson/${lesson.id}`}
                    className="retro-card w-[235px] shrink-0 overflow-hidden rounded-2xl transition-transform active:translate-y-[1px]"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getYoutubeThumbnail(lesson.youtubeId)}
                        alt={lesson.title}
                        className="h-full w-full object-cover sepia-[0.12]"
                      />
                      <span className="absolute left-2 top-2 rounded-md border border-terracotta/40 bg-paper-card/95 px-1.5 py-0.5 font-mono text-[10px] font-bold text-terracotta-dark">
                        C2 · {topicObj?.labelZh ?? lesson.category}
                      </span>
                      <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-terracotta text-paper-card shadow">
                        <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="truncate font-mono text-[10px] text-sage-dark">
                        {lesson.channel}
                      </p>
                      <h3 className="mt-0.5 line-clamp-2 font-serif text-sm font-semibold leading-snug text-ink">
                        {lesson.title}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Custom Imports Quick Bar (when present) */}
          {customLessons.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenTopic("Custom")}
              className="retro-card flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
            >
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                  CUSTOM TAPES
                </p>
                <p className="text-sm font-semibold text-ink">
                  我匯入的自訂磁帶（{customLessons.length} 卷）
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-muted" />
            </button>
          )}
        </div>
      ) : (
        /* ================================================================= */
        /* VIEW 2: NEWS-STYLE TOPIC FEED VIEW                                */
        /* ================================================================= */
        <div>
          {/* Back to Topics Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToTopics}
              className="retro-pill inline-flex items-center gap-1.5 rounded-full bg-paper-card px-3 py-1.5 text-xs font-medium text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回 {TOPICS.length} 大主題
            </button>
            <span className="font-mono text-[11px] text-ink-subtle">
              共 {filteredLessons.length} 卷磁帶
            </span>
          </div>

          {/* Horizontal News-Style Topic Switcher Strip */}
          <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTopic("ALL")}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTopic === "ALL"
                  ? "border border-ink bg-ink text-paper-card"
                  : "border border-paper-border bg-paper-card text-ink-muted hover:text-ink"
              }`}
            >
              全部
            </button>
            {TOPICS.map((t) => {
              const active = activeTopic === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTopic(t.id)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border border-ink bg-ink text-paper-card"
                      : "border border-paper-border bg-paper-card text-ink-muted hover:text-ink"
                  }`}
                >
                  <span>{t.labelZh}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      active ? "text-paper-card/75" : "text-ink-subtle"
                    }`}
                  >
                    {topicCounts[t.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Topic Editorial Banner */}
          {activeTopicMeta && !isSearching && (
            <div className="mb-3 flex items-center justify-between rounded-2xl border border-paper-border bg-paper-soft/70 px-3.5 py-2.5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                  TOPIC {activeTopicMeta.num} · {activeTopicMeta.labelEn}
                </p>
                <h2 className="font-serif text-lg font-semibold text-ink">
                  {activeTopicMeta.labelZh}
                </h2>
                <p className="text-[11px] text-ink-muted">{activeTopicMeta.tagline}</p>
              </div>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  TONE_BADGE[activeTopicMeta.tone]
                }`}
              >
                <TopicIcon id={activeTopicMeta.id} />
              </span>
            </div>
          )}

          {/* Difficulty Filter Strip with Live Counts */}
          <div className="no-scrollbar mb-4 flex items-center gap-1.5 overflow-x-auto pb-1">
            {LEVELS.map((lv) => {
              const active = selectedLevel === lv.id;
              const cnt = levelCountsInTopic[lv.id] ?? 0;
              return (
                <button
                  key={lv.id}
                  type="button"
                  onClick={() => setSelectedLevel(lv.id)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                    active
                      ? "border border-sage bg-sage-soft text-sage-dark"
                      : "border border-transparent bg-paper-soft/80 text-ink-muted hover:text-ink"
                  }`}
                >
                  <span>{lv.label}</span>
                  <span className="text-[10px] opacity-75">({cnt})</span>
                </button>
              );
            })}
          </div>

          {/* Lesson Cards */}
          <section className="space-y-4">
            {filteredLessons.length === 0 ? (
              <div className="retro-card rounded-3xl p-8 text-center">
                <p className="font-serif text-base font-medium text-ink">
                  目前條件下沒有對應磁帶
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  試著切回「全部難度」或探索其他主題分類
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedLevel("ALL")}
                  className="retro-pill mt-4 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-paper-card"
                >
                  顯示本主題全部難度
                </button>
              </div>
            ) : (
              filteredLessons.map((lesson) => {
                const doneSegs = progressByLesson.get(lesson.id) ?? 0;
                const totalSegs = lesson.segmentCount ?? lesson.segments.length;
                const topicLabel =
                  TOPICS.find((t) => t.id === lesson.category)?.labelZh ?? "自訂";
                return (
                  <Link
                    key={lesson.id}
                    href={`/lesson/${lesson.id}`}
                    className="retro-card group block overflow-hidden rounded-3xl transition-transform active:translate-y-[1px]"
                  >
                    <div className="flex items-center justify-between border-b border-paper-border/80 bg-paper-soft/70 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-medium tracking-wider text-ink-muted">
                          {lesson.tapeNumber}
                        </span>
                        <span className="rounded-md border border-paper-border/80 bg-paper-card px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                          {topicLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md border border-paper-border bg-paper-card px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                          {lesson.accent}
                        </span>
                        <span
                          className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                            LEVEL_STYLES[lesson.level] ?? LEVEL_STYLES.B1
                          }`}
                        >
                          {lesson.level}
                        </span>
                        {lesson.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustom(e, lesson.id)}
                            className="ml-1 rounded-md p-1 text-ink-subtle hover:bg-terracotta-soft hover:text-terracotta"
                            aria-label="刪除自訂磁帶"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-paper-soft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getYoutubeThumbnail(lesson.youtubeId)}
                        alt={lesson.title}
                        className="h-full w-full object-cover sepia-[0.12] contrast-[0.97] transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />

                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-paper-card/90 px-2.5 py-1 font-mono text-[11px] font-medium text-ink backdrop-blur-sm">
                          <Clock className="h-3 w-3 text-sage-dark" />
                          {formatDuration(lesson.durationSec)}
                          {totalSegs > 0 ? ` · ${totalSegs} 句` : " · 即時對軌字幕"}
                        </span>
                        {doneSegs > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sage/90 px-2.5 py-1 font-mono text-[10px] font-semibold text-paper-card">
                            <CheckCircle2 className="h-3 w-3" />
                            {doneSegs}/{totalSegs}
                          </span>
                        )}
                      </div>

                      <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-paper-card/60 bg-terracotta text-paper-card shadow-md transition-transform group-hover:scale-105">
                        <Play className="ml-0.5 h-4 w-4 fill-current" />
                      </span>
                    </div>

                    <div className="p-4">
                      <p className="font-mono text-[11px] text-sage-dark">
                        {lesson.channel}
                      </p>
                      <h3 className="mt-0.5 font-serif text-[17px] font-semibold leading-snug text-ink">
                        {lesson.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                        {lesson.subtitleZh}
                      </p>
                      {lesson.tags && lesson.tags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {lesson.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-paper-soft px-2.5 py-0.5 text-[10px] font-medium text-ink-muted"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </section>
        </div>
      )}

      <BottomNav
        onOpenImport={() => setImportOpen(true)}
        onResetTopic={showingFeed ? handleResetToTopics : undefined}
        savedCount={savedWordCount}
        petAlert={petAlert}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImportLesson}
      />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-paper p-6 text-sm text-ink-muted">
          載入主題報刊中...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
