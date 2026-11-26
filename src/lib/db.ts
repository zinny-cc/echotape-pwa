"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Lesson, PracticeProgress, SavedWord } from "./types";

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
}

const DB_NAME = "echotape-studio-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EchoTapeDB>> | null = null;

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
      },
    });
  }
  return dbPromise;
}

export async function getAllSavedWords(): Promise<SavedWord[]> {
  const db = await getDb();
  const words = await db.getAllFromIndex("savedWords", "by-savedAt");
  return words.reverse();
}

export async function saveWord(word: SavedWord): Promise<void> {
  const db = await getDb();
  await db.put("savedWords", word);
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
