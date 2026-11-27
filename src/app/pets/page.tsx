"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Cat,
  CheckCircle2,
  Coins,
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
import type { CanId, CatId, CatMood, PetGameState } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { CatSprite } from "@/components/CatSprite";

type PreviewMode = "live" | "belly-up" | "angry";

const MOOD_BADGE: Record<CatMood, { label: string; style: string }> = {
  "belly-up": {
    label: "開心翻肚中",
    style: "border-sage/35 bg-sage-soft text-sage-dark",
  },
  eating: {
    label: "大口吃罐頭",
    style: "border-ochre/40 bg-ochre-soft text-[#8B6824]",
  },
  idle: {
    label: "悠閒發呆",
    style: "border-paper-border bg-paper-soft text-ink-muted",
  },
  hungry: {
    label: "有點餓了",
    style: "border-ochre/40 bg-ochre-soft text-[#8B6824]",
  },
  angry: {
    label: "餓到生氣！",
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
  const [previewMode, setPreviewMode] = useState<PreviewMode>("live");
  const [eatingState, setEatingState] = useState<{
    catId: CatId;
    canId: CanId;
  } | null>(null);
  const [justPettedId, setJustPettedId] = useState<CatId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const eatingTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const petTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3200);
  };

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
      if (eatingTimerRef.current) window.clearTimeout(eatingTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (petTimerRef.current) window.clearTimeout(petTimerRef.current);
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

  const handleBuyCan = async (can: CanItemMeta) => {
    const updated = await buyCan(can.id);
    if (!updated) {
      showToast("CC 幣還不夠喔！每天多學 5 個單字就能領 +50 CC 幣");
      return;
    }
    setPetState(updated);
    showToast(`已買入「${can.name}」！現在可以在罐頭櫃選要餵 Verdi 或牛肝菌`);
  };

  const handleFeedCat = async (catId: CatId, can: CanItemMeta) => {
    if (eatingState) return;
    const updated = await feedCatWithCan(catId, can.id);
    if (!updated) return;

    setPreviewMode("live");
    setPetState(updated);
    setNow(Date.now());
    setEatingState({ catId, canId: can.id });

    const catName = updated.cats[catId].name;
    showToast(`${catName} 正在大口享用「${can.name}」...`);

    if (eatingTimerRef.current) window.clearTimeout(eatingTimerRef.current);
    eatingTimerRef.current = window.setTimeout(() => {
      setEatingState(null);
      setNow(Date.now());
      showToast(
        `${catName} 吃得超開心，滿足地翻肚呼嚕嚕了！親密度 +${can.affectionGain}`
      );
    }, 2200);
  };

  const handlePetBelly = async (catId: CatId, isBellyUp: boolean) => {
    if (!isBellyUp || !petState) return;
    const catName = petState.cats[catId].name;
    setJustPettedId(catId);
    if (petTimerRef.current) window.clearTimeout(petTimerRef.current);
    petTimerRef.current = window.setTimeout(() => setJustPettedId(null), 1200);

    if (previewMode === "live") {
      const updated = await petCatBelly(catId);
      setPetState(updated);
      showToast(`輕輕揉了揉 ${catName} 軟綿綿的肚皮，呼嚕聲變大了！親密度 +2`);
    } else {
      showToast(`${catName} 舒服地呼嚕呼嚕踩踏中（預覽模式）`);
    }
  };

  const petAlert = petState ? hasAnyUrgentCat(petState, now) : false;
  const learnedToday = petState?.daily.learnedWordIds.length ?? 0;
  const dailyGoalPct = Math.min(100, Math.round((learnedToday / DAILY_WORD_GOAL) * 100));
  const wordsRemaining = Math.max(0, DAILY_WORD_GOAL - learnedToday);

  return (
    <main className="min-h-dvh px-4 pt-5 pb-28">
      {/* Header */}
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-paper-border bg-paper-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            <Cat className="h-3 w-3 text-terracotta" />
            CAT HOUSE · 貓咪小屋
          </div>
          <h1 className="font-serif text-2xl font-semibold text-ink">
            Verdi 與 牛肝菌
          </h1>
          <p className="mt-0.5 text-xs text-ink-muted">
            每日學 5 個單字領 CC 幣，買復古罐頭餵兩隻貓主子
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

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="mb-3 flex items-center gap-2 rounded-2xl border border-sage/35 bg-sage-soft px-3.5 py-2.5 text-xs font-medium text-sage-dark shadow-sm"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Daily 5-Word Learning Mission Card */}
      <section className="retro-card mb-4 rounded-3xl p-4" aria-label="每日 5 單字獎勵任務">
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
                <CheckCircle2 className="h-3 w-3" />+{DAILY_GOAL_REWARD_CC} CC 已領
              </span>
            ) : (
              `達標送 +${DAILY_GOAL_REWARD_CC} CC`
            )}
          </span>
        </div>

        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full border border-paper-border bg-paper-soft">
          <div
            className="h-full rounded-full bg-sage transition-all duration-300"
            style={{ width: `${Math.max(learnedToday > 0 ? 10 : 0, dailyGoalPct)}%` }}
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

      {/* Cozy Living Room Cat Stage */}
      <section className="mb-5" aria-label="Verdi 與牛肝菌互動區">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
            LIVING ROOM · 兩隻主子現況
          </span>

          {/* Subtle Animation Preview Switcher */}
          <div className="inline-flex rounded-xl border border-paper-border bg-paper-card p-0.5 text-[10px]">
            {(
              [
                { id: "live", label: "實況" },
                { id: "belly-up", label: "翻肚" },
                { id: "angry", label: "生氣" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPreviewMode(opt.id)}
                className={`rounded-lg px-2 py-0.5 font-medium transition-colors ${
                  previewMode === opt.id
                    ? "bg-ink text-paper-card"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {previewMode !== "live" && (
          <p className="mb-2 text-center font-mono text-[10px] text-ink-subtle">
            目前為動畫預覽模式（不影響真實飽食度與餵食計時）
          </p>
        )}

        {petState ? (
          <div className="grid grid-cols-2 gap-3">
            {(["verdi", "porcini"] as CatId[]).map((catId) => {
              const cat = petState.cats[catId];
              const isEatingNow = eatingState?.catId === catId;
              const liveMood = computeCatMood(cat, now, isEatingNow);
              const effectiveMood: CatMood =
                previewMode === "live" || isEatingNow ? liveMood : previewMode;
              const fullnessPct =
                previewMode === "angry"
                  ? 0
                  : previewMode === "belly-up"
                  ? 100
                  : computeFullnessPct(cat, now);
              const badge = MOOD_BADGE[effectiveMood];
              const isBellyUp = effectiveMood === "belly-up";

              return (
                <div
                  key={catId}
                  className="retro-card flex flex-col justify-between rounded-3xl p-3"
                >
                  {/* Name & Breed Row */}
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h3 className="font-serif text-base font-semibold leading-tight text-ink">
                        {cat.name}
                      </h3>
                      <p className="text-[10px] text-ink-muted">{cat.breedZh}</p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badge.style}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Interactive Animated Cat Canvas */}
                  <button
                    type="button"
                    onClick={() => handlePetBelly(catId, isBellyUp)}
                    className={`my-1 flex flex-col items-center justify-center rounded-2xl bg-paper-soft/75 py-1.5 transition-transform ${
                      isBellyUp
                        ? "cursor-pointer hover:bg-sage-soft/45 active:scale-[0.98]"
                        : "cursor-default"
                    }`}
                    aria-label={
                      isBellyUp
                        ? `摸摸 ${cat.name} 的肚皮`
                        : `${cat.name} 目前狀態：${badge.label}`
                    }
                  >
                    <CatSprite
                      catId={catId}
                      mood={effectiveMood}
                      eatingCanId={isEatingNow ? eatingState.canId : undefined}
                      justPetted={justPettedId === catId}
                      size={132}
                    />
                    {isBellyUp ? (
                      <span className="mt-0.5 font-mono text-[9px] font-semibold text-sage-dark">
                        點肚皮呼嚕摸摸 +2 ♥
                      </span>
                    ) : (
                      <span className="mt-0.5 font-mono text-[9px] text-ink-subtle">
                        {effectiveMood === "angry"
                          ? "超過 24 小時沒吃會生氣"
                          : formatHoursSinceFed(cat, now)}
                      </span>
                    )}
                  </button>

                  {/* Fullness Bar & Affection Stats */}
                  <div className="mt-1.5 space-y-1.5">
                    <div>
                      <div className="mb-1 flex items-center justify-between font-mono text-[9px] text-ink-muted">
                        <span>飽食度</span>
                        <span>{fullnessPct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-soft">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            fullnessPct <= 15
                              ? "bg-terracotta"
                              : fullnessPct <= 35
                              ? "bg-ochre"
                              : "bg-sage"
                          }`}
                          style={{ width: `${Math.max(4, fullnessPct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-paper-border/70 pt-1.5 font-mono text-[10px] text-ink-muted">
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
        ) : (
          <div className="retro-card rounded-3xl p-8 text-center text-xs text-ink-muted">
            正在把 Verdi 與牛肝菌叫出來...
          </div>
        )}
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
              到下方「復古罐頭小舖」用 CC 幣買罐頭，就能決定要開給 Verdi 還是牛肝菌吃！
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
                  <div className="flex items-center justify-between gap-2">
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
                          開心翻肚 {can.happyHours} 小時 · 親密度 +{can.affectionGain}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={eatingState !== null}
                      onClick={() => handleFeedCat("verdi", can)}
                      className="retro-pill rounded-xl bg-sage py-2 text-xs font-semibold text-paper-card hover:bg-sage-dark disabled:opacity-50"
                    >
                      餵 Verdi（三花）
                    </button>
                    <button
                      type="button"
                      disabled={eatingState !== null}
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
                <div className="flex items-center gap-3 min-w-0">
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
