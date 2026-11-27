export type CefrLevel = "B1" | "B2" | "C1" | "C2";
export type LessonCategory =
  | "Series"
  | "Music"
  | "Anime"
  | "Movies"
  | "Science"
  | "Trivia"
  | "Business"
  | "World"
  | "Sports"
  | "Space"
  | "Custom";
export type SubtitleMode = "bilingual" | "en" | "hidden";

export interface TopicMeta {
  id: Exclude<LessonCategory, "Custom">;
  num: string;
  labelZh: string;
  labelEn: string;
  tagline: string;
  levelRange: string;
  tone: "terracotta" | "slate" | "ochre" | "sage";
}

export interface WordAnnotation {
  word: string;
  ipa?: string;
  pos: string;
  zh: string;
  example?: string;
}

export interface TranscriptSegment {
  id: string;
  start: number;
  end: number;
  en: string;
  zh: string;
  notes?: WordAnnotation[];
}

export interface Lesson {
  id: string;
  title: string;
  subtitleZh: string;
  channel: string;
  youtubeId: string;
  level: CefrLevel;
  category: LessonCategory;
  durationSec: number;
  segmentCount?: number;
  accent: "US" | "UK" | "Global";
  tapeNumber: string;
  tags?: string[];
  segments: TranscriptSegment[];
  isCustom?: boolean;
}

export type CollectionTone = "sage" | "terracotta" | "ochre" | "slate";

export interface VocabCollection {
  id: string;
  name: string;
  tone: CollectionTone;
  createdAt: number;
}

export interface SavedWord {
  id: string;
  word: string;
  ipa?: string;
  pos: string;
  zh: string;
  example?: string;
  contextSentence?: string;
  lessonId?: string;
  lessonTitle?: string;
  collectionId?: string; // defaults to "default"
  savedAt: number;
  mastered: boolean;
}

export interface WordScore {
  word: string;
  status: "good" | "fair" | "missed";
}

export interface PronunciationFeedback {
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  intonationScore: number;
  wordScores: WordScore[];
  tipZh: string;
  engine: "gemini" | "demo";
  transcriptHeard?: string;
}

export interface PracticeProgress {
  id: string;
  lessonId: string;
  segmentId: string;
  bestScore: number;
  attempts: number;
  lastPracticedAt: number;
}

export type CatId = "verdi" | "porcini";
export type CanId = "tuna" | "salmon" | "scallop";
export type CatMood = "eating" | "belly-up" | "idle" | "hungry" | "angry";

export interface CatStatus {
  id: CatId;
  name: string;
  breedZh: string;
  lastFedAt: number;
  happyUntil: number;
  totalCansEaten: number;
  affection: number;
}

export interface DailyWordRewardState {
  date: string; // YYYY-MM-DD local date
  learnedWordIds: string[];
  rewardClaimed: boolean;
  bonusChunksClaimed: number;
}

export interface PetGameState {
  id: "main";
  ccCoins: number;
  cans: Record<CanId, number>;
  cats: Record<CatId, CatStatus>;
  daily: DailyWordRewardState;
}
