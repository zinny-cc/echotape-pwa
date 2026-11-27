"use client";

import { useEffect, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  FolderPlus,
  Plus,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { DEFAULT_COLLECTION_ID } from "@/lib/db";
import { speakNaturalEnglish } from "@/lib/speech";
import type {
  CollectionTone,
  SavedWord,
  VocabCollection,
  WordAnnotation,
} from "@/lib/types";

interface WordSheetProps {
  selectedWord: {
    word: string;
    contextSentence: string;
    curatedNote?: WordAnnotation;
  } | null;
  lessonId: string;
  lessonTitle: string;
  existingSavedWord: SavedWord | null;
  collections: VocabCollection[];
  onClose: () => void;
  onSaveWord: (word: SavedWord) => Promise<void>;
  onRemoveWord: (id: string) => Promise<void>;
  onCreateCollection: (name: string, tone: CollectionTone) => Promise<VocabCollection>;
}

interface LookupData {
  word: string;
  ipa: string;
  pos: string;
  zh: string;
  enDefinition?: string;
  example: string;
}

const NEW_TONES: CollectionTone[] = ["terracotta", "slate", "ochre", "sage"];

// Singleton in-memory cache of the offline Traditional Chinese dictionary (/dict-zh.json)
let offlineDictPromise: Promise<Record<string, string>> | null = null;

function loadOfflineDict(): Promise<Record<string, string>> {
  if (!offlineDictPromise) {
    offlineDictPromise = fetch("/dict-zh.json")
      .then((res) => (res.ok ? (res.json() as Promise<Record<string, string>>) : {}))
      .catch(() => ({}));
  }
  return offlineDictPromise;
}

function lookupOfflineWord(
  dict: Record<string, string>,
  rawWord: string
): string | null {
  const w = rawWord.replace(/[’‘]/g, "'").toLowerCase().trim();
  if (dict[w]) return dict[w];
  // Simple fallback for inflected forms or hyphenated halves
  if (w.endsWith("s") && dict[w.slice(0, -1)]) return dict[w.slice(0, -1)];
  if (w.endsWith("es") && dict[w.slice(0, -2)]) return dict[w.slice(0, -2)];
  if (w.endsWith("ed") && dict[w.slice(0, -2)]) return dict[w.slice(0, -2)];
  if (w.endsWith("ing") && dict[w.slice(0, -3)]) return dict[w.slice(0, -3)];
  return null;
}

export function WordSheet({
  selectedWord,
  lessonId,
  lessonTitle,
  existingSavedWord,
  collections,
  onClose,
  onSaveWord,
  onRemoveWord,
  onCreateCollection,
}: WordSheetProps) {
  const [data, setData] = useState<LookupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickedCollectionId, setPickedCollectionId] = useState<string>(
    DEFAULT_COLLECTION_ID
  );
  const [creatingNew, setCreatingNew] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedWord) {
      setData(null);
      setCreatingNew(false);
      setNewColName("");
      setSavedNotice(null);
      return;
    }

    setPickedCollectionId(
      existingSavedWord?.collectionId || DEFAULT_COLLECTION_ID
    );
    setSavedNotice(null);

    if (selectedWord.curatedNote) {
      setData({
        word: selectedWord.curatedNote.word,
        ipa: selectedWord.curatedNote.ipa ?? "",
        pos: selectedWord.curatedNote.pos,
        zh: selectedWord.curatedNote.zh,
        example: selectedWord.curatedNote.example ?? "",
      });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const resolveWord = async () => {
      // 1. Instant offline Traditional Chinese lookup (< 5ms, works even offline/localhost)
      const dict = await loadOfflineDict();
      const offlineZh = lookupOfflineWord(dict, selectedWord.word);

      if (!cancelled && offlineZh) {
        setData({
          word: selectedWord.word,
          ipa: "",
          pos: "word",
          zh: offlineZh,
          example: "",
        });
        setLoading(false);
      }

      // 2. Background online enrichment for IPA, part-of-speech, example, or unseen custom words
      try {
        const res = await fetch(
          `/api/dictionary?word=${encodeURIComponent(selectedWord.word)}`
        );
        if (!res.ok) throw new Error("lookup failed");
        const json = (await res.json()) as Partial<LookupData> & { online?: boolean };
        if (cancelled) return;

        const bestZh =
          (json.zh && json.zh.trim()) ||
          offlineZh ||
          "暫無釋義，仍可直接收藏並搭配原句複習。";

        setData({
          word: json.word || selectedWord.word,
          ipa: json.ipa || "",
          pos: json.pos || "word",
          zh: bestZh,
          enDefinition: json.enDefinition || "",
          example: json.example || "",
        });
      } catch {
        if (!cancelled && !offlineZh) {
          setData({
            word: selectedWord.word,
            ipa: "",
            pos: "word",
            zh: "目前無法連線外部字典，仍可直接收藏此單字至離線單字本。",
            example: "",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    resolveWord();

    return () => {
      cancelled = true;
    };
  }, [selectedWord, existingSavedWord]);

  if (!selectedWord) return null;

  const isSaved = Boolean(existingSavedWord);
  const currentSavedColId = existingSavedWord?.collectionId || DEFAULT_COLLECTION_ID;
  const collectionChanged = isSaved && pickedCollectionId !== currentSavedColId;

  const speak = (text: string) => {
    void speakNaturalEnglish(text, { rate: 1.0 });
  };

  const buildWordPayload = (collectionId: string): SavedWord => {
    const entry = data ?? {
      word: selectedWord.word,
      ipa: "",
      pos: "word",
      zh: "跟讀收藏單字",
      example: "",
    };
    return {
      id: entry.word.toLowerCase(),
      word: entry.word,
      ipa: entry.ipa || undefined,
      pos: entry.pos,
      zh: entry.zh,
      example: entry.example || undefined,
      contextSentence: selectedWord.contextSentence,
      lessonId,
      lessonTitle,
      collectionId,
      savedAt: existingSavedWord?.savedAt ?? Date.now(),
      mastered: existingSavedWord?.mastered ?? false,
    };
  };

  const handleSaveOrMove = async () => {
    const payload = buildWordPayload(pickedCollectionId);
    await onSaveWord(payload);
    const colName =
      collections.find((c) => c.id === pickedCollectionId)?.name ?? "預設卡片盒";
    setSavedNotice(
      collectionChanged ? `已移至「${colName}」` : `已收錄於「${colName}」`
    );
  };

  const handleCreateAndSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newColName.trim();
    if (!cleaned) return;
    const tone = NEW_TONES[collections.length % NEW_TONES.length];
    const created = await onCreateCollection(cleaned, tone);
    setPickedCollectionId(created.id);
    setNewColName("");
    setCreatingNew(false);
  };

  const selectedColName =
    collections.find((c) => c.id === pickedCollectionId)?.name ?? "預設卡片盒";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-[1.5px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="單字解釋與收藏集合"
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-x border-paper-border bg-paper-card px-5 pt-4 pb-safe shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-paper-border-strong/60" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="font-serif text-2xl font-semibold text-ink">
                {data?.word || selectedWord.word}
              </h3>
              {data?.ipa && (
                <span className="font-mono text-xs text-ink-subtle">{data.ipa}</span>
              )}
              {data?.pos && data.pos !== "word" && (
                <span className="rounded-md bg-ochre-soft px-2 py-0.5 font-mono text-[10px] font-medium text-[#8B6824]">
                  {data.pos}
                </span>
              )}
            </div>
            {selectedWord.curatedNote && (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-sage-dark">
                ★ 本課精選道地用法
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => speak(data?.word || selectedWord.word)}
              className="retro-pill flex h-9 w-9 items-center justify-center rounded-xl bg-slate-soft text-slate-retro"
              aria-label="唸出單字發音"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-soft text-ink-muted hover:text-ink"
              aria-label="關閉"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 min-h-[64px]">
          {loading ? (
            <p className="animate-pulse font-mono text-xs text-ink-subtle">
              查詢繁中釋義與音標中...
            </p>
          ) : (
            <>
              <p className="text-[15px] font-medium leading-relaxed text-ink">
                {data?.zh}
              </p>
              {data?.enDefinition && (
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {data.enDefinition}
                </p>
              )}
              {data?.example && (
                <div className="mt-2 rounded-xl border border-paper-border/80 bg-paper px-3 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                    EXAMPLE
                  </span>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    {data.example}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Collection Picker */}
        <div className="mt-3.5 rounded-2xl border border-paper-border/80 bg-paper p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              放入單字集合
            </span>
            <button
              type="button"
              onClick={() => setCreatingNew((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta-dark hover:underline"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              {creatingNew ? "取消新增" : "新建集合"}
            </button>
          </div>

          {creatingNew && (
            <form onSubmit={handleCreateAndSelect} className="mb-2.5 flex gap-1.5">
              <input
                type="text"
                autoFocus
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="輸入新集合名稱（如：商務、美劇）"
                className="min-w-0 flex-1 rounded-xl border border-paper-border bg-paper-card px-3 py-1.5 text-xs text-ink placeholder:text-ink-subtle focus:border-sage focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newColName.trim()}
                className="retro-pill inline-flex items-center gap-1 rounded-xl bg-terracotta px-3 py-1.5 text-xs font-semibold text-paper-card disabled:opacity-45"
              >
                <Plus className="h-3.5 w-3.5" />
                建立
              </button>
            </form>
          )}

          <div className="no-scrollbar flex flex-wrap gap-1.5">
            {collections.map((col) => {
              const active = pickedCollectionId === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => {
                    setPickedCollectionId(col.id);
                    setSavedNotice(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "border border-ink bg-ink text-paper-card"
                      : "border border-paper-border bg-paper-card text-ink-muted hover:text-ink"
                  }`}
                >
                  {col.name}
                </button>
              );
            })}
          </div>
        </div>

        {savedNotice && (
          <p className="mt-2 text-center font-mono text-[11px] font-medium text-sage-dark">
            ✓ {savedNotice}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-3 mb-2 flex gap-2">
          <button
            type="button"
            onClick={handleSaveOrMove}
            className={`retro-pill flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-colors ${
              isSaved && !collectionChanged
                ? "border-sage/30 bg-sage-soft text-sage-dark"
                : "bg-sage text-paper-card hover:bg-sage-dark"
            }`}
          >
            {isSaved && !collectionChanged ? (
              <>
                <BookmarkCheck className="h-4 w-4" />
                已收錄於「{selectedColName}」
              </>
            ) : collectionChanged ? (
              <>
                <BookmarkCheck className="h-4 w-4" />
                改存至「{selectedColName}」
              </>
            ) : (
              <>
                <Bookmark className="h-4 w-4" />
                收藏至「{selectedColName}」
              </>
            )}
          </button>

          {isSaved && existingSavedWord && (
            <button
              type="button"
              onClick={async () => {
                await onRemoveWord(existingSavedWord.id);
                setSavedNotice(null);
              }}
              className="retro-pill flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta-dark"
              aria-label="從單字本移除"
              title="從單字本移除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
