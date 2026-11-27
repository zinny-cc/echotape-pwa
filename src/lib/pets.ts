"use client";

import { getStoredPetState, saveStoredPetState } from "./db";
import type { CanId, CatId, CatMood, CatStatus, PetGameState } from "./types";

export const DAILY_WORD_GOAL = 5;
export const DAILY_GOAL_REWARD_CC = 50;
export const BONUS_STEP_REWARD_CC = 25;
export const HUNGRY_AFTER_HOURS = 18;
export const ANGRY_AFTER_HOURS = 24;

export interface CanItemMeta {
  id: CanId;
  name: string;
  subtitle: string;
  priceCc: number;
  happyHours: number;
  affectionGain: number;
  tinColor: string;
  labelColor: string;
}

export const CAN_CATALOG: CanItemMeta[] = [
  {
    id: "tuna",
    name: "經典鮪魚罐頭",
    subtitle: "香氣撲鼻的日常主食，吃完開心翻肚 2 小時",
    priceCc: 30,
    happyHours: 2,
    affectionGain: 10,
    tinColor: "#5A7487",
    labelColor: "#E4EBF0",
  },
  {
    id: "salmon",
    name: "特級鮭魚慕斯罐",
    subtitle: "綿密濃郁口感，吃完幸福翻肚 5 小時",
    priceCc: 50,
    happyHours: 5,
    affectionGain: 20,
    tinColor: "#B96B52",
    labelColor: "#F3E3DC",
  },
  {
    id: "scallop",
    name: "主廚干貝鮮食罐",
    subtitle: "頂級海味大餐！超長翻肚 12 小時＋親密度大幅提升",
    priceCc: 80,
    happyHours: 12,
    affectionGain: 35,
    tinColor: "#BD9548",
    labelColor: "#F4ECD8",
  },
];

export function getLocalDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createInitialPetState(now = Date.now()): PetGameState {
  const fourHoursAgo = now - 4 * 60 * 60 * 1000;
  return {
    id: "main",
    ccCoins: 60, // Welcome gift so users can immediately buy & feed a can!
    cans: {
      tuna: 0,
      salmon: 0,
      scallop: 0,
    },
    cats: {
      verdi: {
        id: "verdi",
        name: "Verdi",
        breedZh: "虎斑三花",
        lastFedAt: fourHoursAgo,
        happyUntil: 0,
        totalCansEaten: 0,
        affection: 15,
      },
      porcini: {
        id: "porcini",
        name: "牛肝菌",
        breedZh: "白底橘貓",
        lastFedAt: fourHoursAgo,
        happyUntil: 0,
        totalCansEaten: 0,
        affection: 15,
      },
    },
    daily: {
      date: getLocalDateKey(new Date(now)),
      learnedWordIds: [],
      rewardClaimed: false,
      bonusChunksClaimed: 0,
    },
  };
}

export async function loadPetState(): Promise<PetGameState> {
  const today = getLocalDateKey();
  const existing = await getStoredPetState();
  if (!existing) {
    const fresh = createInitialPetState();
    await saveStoredPetState(fresh);
    return fresh;
  }

  // Rollover daily tracker cleanly at midnight
  if (existing.daily.date !== today) {
    const rolled: PetGameState = {
      ...existing,
      daily: {
        date: today,
        learnedWordIds: [],
        rewardClaimed: false,
        bonusChunksClaimed: 0,
      },
    };
    await saveStoredPetState(rolled);
    return rolled;
  }

  return existing;
}

export function computeCatMood(
  cat: CatStatus,
  now = Date.now(),
  isEating = false
): CatMood {
  if (isEating) return "eating";
  if (now < cat.happyUntil) return "belly-up";
  const hoursSinceFed = (now - cat.lastFedAt) / (1000 * 60 * 60);
  if (hoursSinceFed >= ANGRY_AFTER_HOURS) return "angry";
  if (hoursSinceFed >= HUNGRY_AFTER_HOURS) return "hungry";
  return "idle";
}

export function computeFullnessPct(cat: CatStatus, now = Date.now()): number {
  const hoursSinceFed = Math.max(0, (now - cat.lastFedAt) / (1000 * 60 * 60));
  const pct = Math.round(100 - (hoursSinceFed / ANGRY_AFTER_HOURS) * 100);
  return Math.max(0, Math.min(100, pct));
}

export function formatHoursSinceFed(cat: CatStatus, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - cat.lastFedAt) / 60000));
  if (mins < 1) return "剛剛才吃飽";
  if (mins < 60) return `${mins} 分鐘前餵過`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前餵過`;
  const days = Math.floor(hrs / 24);
  return `${days} 天 ${hrs % 24} 小時沒吃`;
}

export function hasAnyUrgentCat(state: PetGameState, now = Date.now()): boolean {
  return (["verdi", "porcini"] as CatId[]).some((id) => {
    const mood = computeCatMood(state.cats[id], now);
    return mood === "angry" || mood === "hungry";
  });
}

export interface WordLearnRewardResult {
  state: PetGameState;
  earnedCoins: number;
  dailyCount: number;
  justHitDailyGoal: boolean;
}

/**
 * Records a unique word learned today (from saving a word or answering correctly
 * in VocabQuiz). Grants +50 CC at 5 words, plus +25 CC every extra 5 words!
 */
export async function recordDailyWordLearned(
  wordId: string
): Promise<WordLearnRewardResult> {
  const state = await loadPetState();
  const normalized = wordId.trim().toLowerCase();
  if (!normalized || state.daily.learnedWordIds.includes(normalized)) {
    return {
      state,
      earnedCoins: 0,
      dailyCount: state.daily.learnedWordIds.length,
      justHitDailyGoal: false,
    };
  }

  const nextIds = [...state.daily.learnedWordIds, normalized];
  const count = nextIds.length;
  let earnedCoins = 0;
  let rewardClaimed = state.daily.rewardClaimed;
  let bonusChunksClaimed = state.daily.bonusChunksClaimed;
  let justHitDailyGoal = false;

  if (!rewardClaimed && count >= DAILY_WORD_GOAL) {
    earnedCoins += DAILY_GOAL_REWARD_CC;
    rewardClaimed = true;
    justHitDailyGoal = true;
  } else if (rewardClaimed && count > DAILY_WORD_GOAL) {
    const extraChunks = Math.floor((count - DAILY_WORD_GOAL) / DAILY_WORD_GOAL);
    if (extraChunks > bonusChunksClaimed) {
      earnedCoins += (extraChunks - bonusChunksClaimed) * BONUS_STEP_REWARD_CC;
      bonusChunksClaimed = extraChunks;
    }
  }

  const nextState: PetGameState = {
    ...state,
    ccCoins: state.ccCoins + earnedCoins,
    daily: {
      ...state.daily,
      learnedWordIds: nextIds,
      rewardClaimed,
      bonusChunksClaimed,
    },
  };

  await saveStoredPetState(nextState);
  return {
    state: nextState,
    earnedCoins,
    dailyCount: count,
    justHitDailyGoal,
  };
}

export async function buyCan(canId: CanId): Promise<PetGameState | null> {
  const meta = CAN_CATALOG.find((c) => c.id === canId);
  if (!meta) return null;
  const state = await loadPetState();
  if (state.ccCoins < meta.priceCc) return null;

  const nextState: PetGameState = {
    ...state,
    ccCoins: state.ccCoins - meta.priceCc,
    cans: {
      ...state.cans,
      [canId]: (state.cans[canId] ?? 0) + 1,
    },
  };
  await saveStoredPetState(nextState);
  return nextState;
}

export async function feedCatWithCan(
  catId: CatId,
  canId: CanId
): Promise<PetGameState | null> {
  const meta = CAN_CATALOG.find((c) => c.id === canId);
  if (!meta) return null;
  const state = await loadPetState();
  if ((state.cans[canId] ?? 0) <= 0) return null;

  const now = Date.now();
  const cat = state.cats[catId];
  const nextHappyUntil =
    Math.max(now, cat.happyUntil) + meta.happyHours * 60 * 60 * 1000;

  const nextState: PetGameState = {
    ...state,
    cans: {
      ...state.cans,
      [canId]: state.cans[canId] - 1,
    },
    cats: {
      ...state.cats,
      [catId]: {
        ...cat,
        lastFedAt: now,
        happyUntil: nextHappyUntil,
        totalCansEaten: cat.totalCansEaten + 1,
        affection: cat.affection + meta.affectionGain,
      },
    },
  };
  await saveStoredPetState(nextState);
  return nextState;
}

export async function petCatBelly(catId: CatId): Promise<PetGameState> {
  const state = await loadPetState();
  const cat = state.cats[catId];
  const nextState: PetGameState = {
    ...state,
    cats: {
      ...state.cats,
      [catId]: {
        ...cat,
        affection: cat.affection + 2,
      },
    },
  };
  await saveStoredPetState(nextState);
  return nextState;
}
