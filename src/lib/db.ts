"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CollectionTone,
  Lesson,
  PetGameState,
  PracticeProgress,
  SavedWord,
  VocabCollection,
} from "./types";

export const DEFAULT_COLLECTION_ID = "default";

export const DEFAULT_COLLECTION: VocabCollection = {
  id: DEFAULT_COLLECTION_ID,
  name: "預設卡片盒",
  tone: "sage",
  createdAt: 0,
};

interface EchoTapeDB extends DBSchema {
  savedWords: {
    key: string;
    value: SavedWord;
    indexes: { "by-savedAt": number };
  };
  progress: {
    key: string;
    value: PracticeProgress;
    indexes: { "by-lessonId": string; "by-lastPracticedAt": number };
  };
  customLessons: {
    key: string;
    value: Lesson;
  };
  collections: {
    key: string;
    value: VocabCollection;
    indexes: { "by-createdAt": number };
  };
}

const DB_NAME = "echotape-studio-db";
const DB_VERSION = 2;
const PET_STORAGE_KEY = "echotape_pet_state_v1";

let dbPromise: Promise<IDBPDatabase<EchoTapeDB>> | null = null;
let memoryPetState: PetGameState | null = null;

function getDb(): Promise<IDBPDatabase<EchoTapeDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in the browser."));
  }
  if (!dbPromise) {
    dbPromise = openDB<EchoTapeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("savedWords")) {
          const wordStore = db.createObjectStore("savedWords", { keyPath: "id" });
          wordStore.createIndex("by-savedAt", "savedAt");
        }
        if (!db.objectStoreNames.contains("progress")) {
          const progressStore = db.createObjectStore("progress", { keyPath: "id" });
          progressStore.createIndex("by-lessonId", "lessonId");
          progressStore.createIndex("by-lastPracticedAt", "lastPracticedAt");
        }
        if (!db.objectStoreNames.contains("customLessons")) {
          db.createObjectStore("customLessons", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("collections")) {
          const colStore = db.createObjectStore("collections", { keyPath: "id" });
          colStore.createIndex("by-createdAt", "createdAt");
        }
      },
      blocking(_currentVersion, _blockedVersion, event) {
        (event.target as IDBDatabase | null)?.close();
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

export async function getAllCollections(): Promise<VocabCollection[]> {
  const db = await getDb();
  const customCols = await db.getAllFromIndex("collections", "by-createdAt");
  const filtered = customCols.filter((c) => c.id !== DEFAULT_COLLECTION_ID);
  return [DEFAULT_COLLECTION, ...filtered];
}

export async function createCollection(
  name: string,
  tone: CollectionTone = "terracotta"
): Promise<VocabCollection> {
  const db = await getDb();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Collection name cannot be empty");
  }
  const col: VocabCollection = {
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    tone,
    createdAt: Date.now(),
  };
  await db.put("collections", col);
  return col;
}

export async function deleteCollection(collectionId: string): Promise<void> {
  if (collectionId === DEFAULT_COLLECTION_ID) return;
  const db = await getDb();
  // Move any words in this collection back to default so nothing is lost
  const allWords = await db.getAll("savedWords");
  const tx = db.transaction(["savedWords", "collections"], "readwrite");
  for (const w of allWords) {
    if ((w.collectionId ?? DEFAULT_COLLECTION_ID) === collectionId) {
      await tx.objectStore("savedWords").put({
        ...w,
        collectionId: DEFAULT_COLLECTION_ID,
      });
    }
  }
  await tx.objectStore("collections").delete(collectionId);
  await tx.done;
}

export async function getAllSavedWords(): Promise<SavedWord[]> {
  const db = await getDb();
  const words = await db.getAllFromIndex("savedWords", "by-savedAt");
  return words
    .map((w) => ({
      ...w,
      collectionId: w.collectionId || DEFAULT_COLLECTION_ID,
    }))
    .reverse();
}

export async function saveWord(word: SavedWord): Promise<void> {
  const db = await getDb();
  await db.put("savedWords", {
    ...word,
    collectionId: word.collectionId || DEFAULT_COLLECTION_ID,
  });
}

export async function moveWordToCollection(
  wordId: string,
  collectionId: string
): Promise<SavedWord | null> {
  const db = await getDb();
  const existing = await db.get("savedWords", wordId.toLowerCase());
  if (!existing) return null;
  const updated: SavedWord = {
    ...existing,
    collectionId: collectionId || DEFAULT_COLLECTION_ID,
  };
  await db.put("savedWords", updated);
  return updated;
}

export async function deleteSavedWord(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("savedWords", id.toLowerCase());
}

export async function toggleWordMastered(id: string): Promise<SavedWord | null> {
  const db = await getDb();
  const existing = await db.get("savedWords", id.toLowerCase());
  if (!existing) return null;
  const updated: SavedWord = { ...existing, mastered: !existing.mastered };
  await db.put("savedWords", updated);
  return updated;
}

export async function recordPracticeAttempt(
  lessonId: string,
  segmentId: string,
  score: number
): Promise<PracticeProgress> {
  const db = await getDb();
  const key = `${lessonId}:${segmentId}`;
  const existing = await db.get("progress", key);
  const next: PracticeProgress = {
    id: key,
    lessonId,
    segmentId,
    bestScore: existing ? Math.max(existing.bestScore, score) : score,
    attempts: (existing?.attempts ?? 0) + 1,
    lastPracticedAt: Date.now(),
  };
  await db.put("progress", next);
  return next;
}

export async function getLessonProgress(lessonId: string): Promise<PracticeProgress[]> {
  const db = await getDb();
  return db.getAllFromIndex("progress", "by-lessonId", lessonId);
}

export async function getAllProgress(): Promise<PracticeProgress[]> {
  const db = await getDb();
  return db.getAll("progress");
}

export async function getCustomLessons(): Promise<Lesson[]> {
  const db = await getDb();
  return db.getAll("customLessons");
}

export async function getCustomLessonById(id: string): Promise<Lesson | undefined> {
  const db = await getDb();
  return db.get("customLessons", id);
}

export async function saveCustomLesson(lesson: Lesson): Promise<void> {
  const db = await getDb();
  await db.put("customLessons", lesson);
}

export async function deleteCustomLesson(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("customLessons", id);
}

export async function getStoredPetState(): Promise<PetGameState | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(PET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PetGameState;
      if (parsed && parsed.cats?.verdi && parsed.cats?.porcini && parsed.daily) {
        memoryPetState = parsed;
        return parsed;
      }
    }
  } catch {
    // Fall back to in-memory state if storage is restricted
  }
  return memoryPetState ?? undefined;
}

export async function saveStoredPetState(state: PetGameState): Promise<void> {
  memoryPetState = state;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Keep in-memory state even if storage quota is restricted
  }
}
