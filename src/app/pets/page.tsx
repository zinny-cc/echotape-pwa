"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Cat,
  CheckCircle2,
  Coins,
  Hand,
  Heart,
  ShoppingBag,
  Sparkles,
  Utensils,
} from "lucide-react";
import { getAllSavedWords } from "@/lib/db";
import {
  BONUS_STEP_REWARD_CC,
  CAN_CATALOG,
  DAILY_GOAL_REWARD_CC,
  DAILY_WORD_GOAL,
  buyCan,
  computeCatMood,
  computeFullnessPct,
  feedCatWithCan,
  formatHoursSinceFed,
  hasAnyUrgentCat,
  loadPetState,
  petCatBelly,
  type CanItemMeta,
} from "@/lib/pets";
import type { CatId, CatMood, PetGameState } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import {
  PixelCatRoom,
  type FeedingCommand,
} from "@/components/PixelCatRoom";

const MOOD_BADGE: Record<CatMood, { label: string; style: string }> = {
  "belly-up": {
    label: "開心翻肚中",
    style: "border-sage/35 bg-sage-soft text-sage-dark",
  },
  eating: {
    label: "奔向碗架吃罐頭",
    style: "border-ochre/40 bg-ochre-soft text-[#8B6824]",
  },
  idle: {
    label: "客廳散步中",
    style: "border-paper-border bg-paper-soft text-ink-muted",
  },
  hungry: {
    label: "肚子餓了",
    style: "border-ochre/40 bg-ochre-soft text-[#8B6824]",
  },
  angry: {
    label: "生氣炸毛！",
    style: "border-terracotta/40 bg-terracotta-soft text-terracotta-dark",
  },
};

function MiniCanIcon({ can }: { can: CanItemMeta }) {
  return (
    <svg
      width="42"
      height="36"
      viewBox="0 0 48 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect
        x="4"
        y="10"
        width="40"
        height="24"
        rx="5"
        fill={can.tinColor}
        stroke="#2B2925"
        strokeWidth="2.2"
      />
      <ellipse
        cx="24"
        cy="10"
        rx="20"
        ry="5.5"
        fill="#EEE9DC"
        stroke="#2B2925"
        strokeWidth="2.2"
      />
      <ellipse cx="24" cy="10" rx="12" ry="2.6" fill={can.labelColor} />
      <rect x="10" y="18" width="28" height="9" rx="2.5" fill={can.labelColor} />
      <circle cx="24" cy="22.5" r="2.2" fill={can.tinColor} />
    </svg>
  );
}

export default function PetsPage() {
  const [petState, setPetState] = useState<PetGameState | null>(null);
  const [savedWordCount, setSavedWordCount] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [eatingCatId, setEatingCatId] = useState<CatId | null>(null);
  const [feedingCommand, setFeedingCommand] = useState<FeedingCommand | null>(
    null
  );
  const [pokeCommand, setPokeCommand] = useState<{
    id: number;
    catId: CatId;
  } | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    tone: "sage" | "terracotta" | "ochre";
  } | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const lastFeedMetaRef = useRef<CanItemMeta | null>(null);

  const showToast = useCallback(
    (text: string, tone: "sage" | "terracotta" | "ochre" = "sage") => {
      setToast({ text, tone });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
    },
    []
  );

  useEffect(() => {
    loadPetState()
      .then((state) => setPetState(state))
      .catch(() => {});

    getAllSavedWords()
      .then((words) => setSavedWordCount(words.length))
      .catch(() => {});

    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.clearInterval(interval);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const ownedCans = useMemo(() => {
    if (!petState) return [];
    return CAN_CATALOG.filter((item) => (petState.cans[item.id] ?? 0) > 0);
  }, [petState]);

  const totalOwnedCans = useMemo(() => {
    if (!petState) return 0;
    return (
      (petState.cans.tuna ?? 0) +
      (petState.cans.salmon ?? 0) +
      (petState.cans.scallop ?? 0)
    );
  }, [petState]);

  const liveMoods = useMemo<Record<CatId, CatMood>>(() => {
    if (!petState) {
      return { verdi: "idle", porcini: "idle" };
    }
    return {
      verdi: computeCatMood(petState.cats.verdi, now, eatingCatId === "verdi"),
      porcini: computeCatMood(
        petState.cats.porcini,
        now,
        eatingCatId === "porcini"
      ),
    };
  }, [petState, now, eatingCatId]);

  const handleBuyCan = async (can: CanItemMeta) => {
    const updated = await buyCan(can.id);
    if (!updated) {
      showToast(
        "CC 幣還不夠喔！每天學 5 個單字就能領 +50 CC 幣",
        "ochre"
      );
      return;
    }
    setPetState(updated);
    showToast(
      `已買入「${can.name}」！在下方罐頭櫃選要開給 Verdi 或牛肝菌吃`,
      "ochre"
    );
  };

  const handleFeedCat = async (catId: CatId, can: CanItemMeta) => {
    if (eatingCatId) return;
    const updated = await feedCatWithCan(catId, can.id);
    if (!updated) return;

    setPetState(updated);
    setNow(Date.now());
    setEatingCatId(catId);
    lastFeedMetaRef.current = can;
    setFeedingCommand({ id: Date.now(), catId, canId: can.id });

    const catName = updated.cats[catId].name;
    showToast(`${catName} 聽到開罐聲，飛奔去雙碗架大口享用「${can.name}」囉！`, "ochre");
  };

  const handleEatingFinished = useCallback(
    (catId: CatId) => {
      setEatingCatId(null);
      setNow(Date.now());
      const catName = catId === "verdi" ? "Verdi" : "牛肝菌";
      const gain = lastFeedMetaRef.current?.affectionGain ?? 10;
      showToast(
        `${catName} 吃飽喝足，滿足地翻肚撒嬌呼嚕嚕了！親密度 +${gain}`,
        "sage"
      );
    },
    [showToast]
  );

  const handleCatTapped = useCallback(
    async (catId: CatId, reaction: "belly-up" | "hiss") => {
      const catName = catId === "verdi" ? "Verdi" : "牛肝菌";
      if (reaction === "hiss") {
        showToast(
          `${catName} 不開心，拱背炸毛對你哈氣了！「嘶——！」快開罐頭安撫主子`,
          "terracotta"
        );
        return;
      }

      const updated = await petCatBelly(catId);
      setPetState(updated);
      showToast(
        `${catName} 開心地翻出軟綿綿的肚皮撒嬌！呼嚕嚕～ 親密度 +2 ♥`,
        "sage"
      );
    },
    [showToast]
  );

  const petAlert = petState ? hasAnyUrgentCat(petState, now) : false;
  const learnedToday = petState?.daily.learnedWordIds.length ?? 0;
  const dailyGoalPct = Math.min(
    100,
    Math.round((learnedToday / DAILY_WORD_GOAL) * 100)
  );
  const wordsRemaining = Math.max(0, DAILY_WORD_GOAL - learnedToday);

  return (
    <main className="min-h-dvh px-4 pt-5 pb-28">
      {/* Header */}
      <header className="mb-3.5 flex items-start justify-between gap-2">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-paper-border bg-paper-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            <Cat className="h-3 w-3 text-terracotta" />
            PIXEL CAT ROOM · CC狗窩
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            Verdi 與 牛肝菌
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            點牠們互動撒嬌或看哈氣，每日學 5 字領 CC 幣買罐頭
          </p>
        </div>

        <div className="retro-pill flex shrink-0 items-center gap-1.5 rounded-2xl bg-ochre-soft px-3 py-2 text-[#8B6824]">
          <Coins className="h-4 w-4 text-ochre" />
          <span className="font-mono text-sm font-bold">
            {petState ? petState.ccCoins : "--"}
          </span>
          <span className="font-mono text-[10px] font-semibold">CC</span>
        </div>
      </header>

      {/* Interactive Toast Feedback */}
      {toast && (
        <div
          role="status"
          className={`mb-3 flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-medium shadow-sm ${
            toast.tone === "terracotta"
              ? "border-terracotta/40 bg-terracotta-soft text-terracotta-dark"
              : toast.tone === "ochre"
              ? "border-ochre/45 bg-ochre-soft text-[#8B6824]"
              : "border-sage/35 bg-sage-soft text-sage-dark"
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* ==================== HERO: 2D PIXEL LIVING ROOM ==================== */}
      <section className="mb-4" aria-label="2D 像素互動客廳">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
            LIVE PIXEL ROOM · 同空間即時實況
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sage/35 bg-sage-soft px-2.5 py-0.5 font-mono text-[10px] font-semibold text-sage-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" />
            LIVE
          </span>
        </div>

        <PixelCatRoom
          moods={liveMoods}
          feedingCommand={feedingCommand}
          pokeCommand={pokeCommand}
          onCatTapped={handleCatTapped}
          onEatingFinished={handleEatingFinished}
        />

        {/* Compact Status & Direct-Poke Strip for Verdi & 牛肝菌 */}
        {petState && (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {(["verdi", "porcini"] as CatId[]).map((catId) => {
              const cat = petState.cats[catId];
              const displayMood: CatMood =
                eatingCatId === catId ? "eating" : liveMoods[catId];
              const badge = MOOD_BADGE[displayMood];
              const fullnessPct = computeFullnessPct(cat, now);
              const moodScore =
                displayMood === "belly-up" ? 100 : fullnessPct;

              return (
                <div
                  key={catId}
                  className="retro-card flex flex-col justify-between rounded-2xl p-3"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-ink/30"
                          style={{
                            backgroundColor:
                              catId === "verdi" ? "#8B755E" : "#CE7A3A",
                          }}
                        />
                        <h2 className="font-serif text-sm font-semibold text-ink">
                          {cat.name}
                        </h2>
                      </div>
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        {cat.breedZh} · {formatHoursSinceFed(cat, now)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badge.style}`}
                    >
                      {badge.label}
                    </span>
                    <button
                      type="button"
                      disabled={eatingCatId === catId}
                      onClick={() =>
                        setPokeCommand({ id: Date.now(), catId })
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-paper-border bg-paper-soft px-2 py-0.5 text-[10px] font-semibold text-ink hover:border-ink/40 disabled:opacity-50"
                    >
                      <Hand className="h-2.5 w-2.5 text-terracotta" />
                      摸一下
                    </button>
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between font-mono text-[9px] text-ink-muted">
                      <span>心情指數</span>
                      <span>{moodScore}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-soft">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          moodScore <= 25
                            ? "bg-terracotta"
                            : moodScore <= 45
                            ? "bg-ochre"
                            : "bg-sage"
                        }`}
                        style={{ width: `${Math.max(4, moodScore)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-ink-muted">
                      <span className="inline-flex items-center gap-1 text-terracotta-dark">
                        <Heart className="h-3 w-3 fill-terracotta text-terracotta" />
                        {cat.affection}
                      </span>
                      <span>已吃 {cat.totalCansEaten} 罐</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Daily 5-Word Learning Mission Card */}
      <section
        className="retro-card mb-4 rounded-3xl p-4"
        aria-label="每日 5 單字獎勵任務"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-sage-dark">
              DAILY WORD QUEST · 每日任務
            </p>
            <h2 className="mt-0.5 font-serif text-base font-semibold text-ink">
              {petState?.daily.rewardClaimed
                ? `今日已學 ${learnedToday} 個單字！任務達成`
                : `今日單字進度 ${learnedToday} / ${DAILY_WORD_GOAL} 字`}
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${
              petState?.daily.rewardClaimed
                ? "border-sage/35 bg-sage-soft text-sage-dark"
                : "border-ochre/35 bg-ochre-soft text-[#8B6824]"
            }`}
          >
            {petState?.daily.rewardClaimed ? (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />+{DAILY_GOAL_REWARD_CC} CC
                已領
              </span>
            ) : (
              `達標送 +${DAILY_GOAL_REWARD_CC} CC`
            )}
          </span>
        </div>

        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full border border-paper-border bg-paper-soft">
          <div
            className="h-full rounded-full bg-sage transition-all duration-300"
            style={{
              width: `${Math.max(learnedToday > 0 ? 10 : 0, dailyGoalPct)}%`,
            }}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-ink-muted">
          <span>
            {petState?.daily.rewardClaimed
              ? `再多學 ${
                  DAILY_WORD_GOAL - (learnedToday % DAILY_WORD_GOAL)
                } 字可領額外 +${BONUS_STEP_REWARD_CC} CC`
              : `再收藏或測驗答對 ${wordsRemaining} 個不重複單字即可領幣`}
          </span>
          <div className="flex shrink-0 items-center gap-2 font-mono text-[11px] font-medium">
            <Link href="/" className="text-sage-dark hover:underline">
              跟讀學字
            </Link>
            <span className="text-paper-border-strong">·</span>
            <Link href="/vocab" className="text-terracotta-dark hover:underline">
              測驗去 →
            </Link>
          </div>
        </div>
      </section>

      {/* Pantry: Owned Cans with Target Cat Selector */}
      <section className="mb-5" aria-label="我的罐頭櫃">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Utensils className="h-4 w-4 text-sage-dark" />
            <h2 className="font-serif text-lg font-semibold text-ink">
              我的罐頭櫃
            </h2>
          </div>
          <span className="font-mono text-[11px] text-ink-subtle">
            庫存 {totalOwnedCans} 罐
          </span>
        </div>

        {ownedCans.length === 0 ? (
          <div className="retro-card rounded-2xl border-dashed p-4 text-center">
            <p className="text-xs font-medium text-ink">罐頭櫃目前空空的</p>
            <p className="mt-1 text-[11px] text-ink-muted">
              到下方「復古罐頭小舖」買罐頭，開罐時對應的貓咪會親自跑去木頭雙碗架吃飯喔！
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {ownedCans.map((can) => {
              const qty = petState?.cans[can.id] ?? 0;
              return (
                <div
                  key={can.id}
                  className="retro-card flex flex-col gap-3 rounded-2xl p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <MiniCanIcon can={can} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-sm font-semibold text-ink">
                          {can.name}
                        </h3>
                        <span className="rounded-full bg-sage-soft px-2 py-0.5 font-mono text-[10px] font-bold text-sage-dark">
                          ×{qty}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-muted">
                        開心翻肚 {can.happyHours} 小時 · 親密度 +
                        {can.affectionGain}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={eatingCatId !== null}
                      onClick={() => handleFeedCat("verdi", can)}
                      className="retro-pill rounded-xl bg-sage py-2 text-xs font-semibold text-paper-card hover:bg-sage-dark disabled:opacity-50"
                    >
                      餵 Verdi（三花）
                    </button>
                    <button
                      type="button"
                      disabled={eatingCatId !== null}
                      onClick={() => handleFeedCat("porcini", can)}
                      className="retro-pill rounded-xl bg-terracotta py-2 text-xs font-semibold text-paper-card hover:bg-terracotta-dark disabled:opacity-50"
                    >
                      餵 牛肝菌（橘貓）
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Retro Can Shop */}
      <section aria-label="復古罐頭小舖">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="h-4 w-4 text-terracotta" />
            <h2 className="font-serif text-lg font-semibold text-ink">
              復古罐頭小舖
            </h2>
          </div>
          <span className="font-mono text-[10px] text-ink-subtle">
            CAN SHOP · CC COINS
          </span>
        </div>

        <div className="space-y-2.5">
          {CAN_CATALOG.map((can) => {
            const canAfford = (petState?.ccCoins ?? 0) >= can.priceCc;
            const ownedQty = petState?.cans[can.id] ?? 0;
            return (
              <div
                key={can.id}
                className="retro-card flex items-center justify-between gap-3 rounded-2xl p-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <MiniCanIcon can={can} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate font-serif text-sm font-semibold text-ink">
                        {can.name}
                      </h3>
                      {ownedQty > 0 && (
                        <span className="shrink-0 font-mono text-[10px] text-ink-subtle">
                          (已有 {ownedQty})
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                      {can.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => handleBuyCan(can)}
                  className={`retro-pill shrink-0 rounded-xl px-3 py-2 font-mono text-xs font-semibold transition-colors ${
                    canAfford
                      ? "bg-ochre-soft text-[#8B6824] hover:bg-ochre hover:text-paper-card"
                      : "bg-paper-soft text-ink-subtle opacity-60"
                  }`}
                >
                  {can.priceCc} CC
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <BottomNav savedCount={savedWordCount} petAlert={petAlert} />
    </main>
  );
}
