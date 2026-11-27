"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bookmark, Sparkles } from "lucide-react";
import { getCuratedLessonById } from "@/data/lessons";
import {
  createCollection,
  deleteSavedWord,
  getAllCollections,
  getAllSavedWords,
  getCustomLessonById,
  getLessonProgress,
  recordPracticeAttempt,
  saveWord,
} from "@/lib/db";
import type {
  CollectionTone,
  Lesson,
  PronunciationFeedback,
  SavedWord,
  SubtitleMode,
  VocabCollection,
  WordAnnotation,
} from "@/lib/types";
import {
  YouTubePlayer,
  type YouTubePlayerHandle,
} from "@/components/YouTubePlayer";
import { SubtitleList } from "@/components/SubtitleList";
import { ShadowingControls } from "@/components/ShadowingControls";
import { WordSheet } from "@/components/WordSheet";
import { FeedbackCard } from "@/components/FeedbackCard";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

const RATES = [0.75, 1.0, 1.25];
const SUBTITLE_MODES: SubtitleMode[] = ["bilingual", "en", "hidden"];

export default function LessonStudioPage() {
  const params = useParams<{ id: string }>();
  const lessonId = params?.id ?? "";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [autoPause, setAutoPause] = useState(true);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>("bilingual");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [shadowPrompt, setShadowPrompt] = useState<string | null>(null);

  const [savedWordsMap, setSavedWordsMap] = useState<Map<string, SavedWord>>(
    new Map()
  );
  const [collections, setCollections] = useState<VocabCollection[]>([]);
  const [practicedMap, setPracticedMap] = useState<Map<string, number>>(new Map());
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    contextSentence: string;
    curatedNote?: WordAnnotation;
  } | null>(null);

  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastEvaluatedUrlRef = useRef<string | null>(null);

  const {
    isRecording,
    levels,
    elapsedMs,
    error: recorderError,
    recording,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  useEffect(() => {
    let active = true;
    const loadLessonAndTranscript = async () => {
      try {
        const curated = getCuratedLessonById(lessonId);
        let resolved: Lesson | null = curated ?? null;
        if (!resolved) {
          resolved = (await getCustomLessonById(lessonId)) ?? null;
        }
        if (resolved && resolved.segments.length === 0) {
          let loadedSegments: Lesson["segments"] = [];
          try {
            const res = await fetch(`/transcripts/${resolved.id}.json`);
            if (res.ok) {
              loadedSegments = (await res.json()) as Lesson["segments"];
            }
          } catch {
            // Fall through to live caption fetch
          }

          // Live on-demand YouTube bilingual caption fetch (works on Vercel CDN & online)
          if (loadedSegments.length === 0) {
            try {
              const liveRes = await fetch(
                `/api/youtube-captions?videoId=${encodeURIComponent(
                  resolved.youtubeId
                )}&full=1`
              );
              if (liveRes.ok) {
                const liveJson = (await liveRes.json()) as {
                  segments?: Lesson["segments"];
                };
                if (Array.isArray(liveJson.segments) && liveJson.segments.length > 0) {
                  loadedSegments = liveJson.segments;
                }
              }
            } catch {
              // Offline or temporarily rate-limited
            }
          }

          if (loadedSegments.length > 0) {
            resolved = {
              ...resolved,
              segments: loadedSegments,
              segmentCount: loadedSegments.length,
            };
          } else {
            // Keep video playable even if live caption fetch is temporarily unavailable offline
            resolved = {
              ...resolved,
              segments: [
                {
                  id: "seg-1",
                  start: 0,
                  end: Math.min(60, resolved.durationSec || 60),
                  en: "Live synced captions will load automatically when connected online (e.g. on Vercel).",
                  zh: "本支影片採雲端即時同步字幕（推上 Vercel 線上版或恢復連網後會自動載入完整雙語逐字稿，目前仍可直接播放影片練習跟讀）。",
                },
              ],
            };
          }
        }
        if (active) setLesson(resolved);
      } catch {
        if (active) setLesson(null);
      } finally {
        if (active) setLoadingLesson(false);
      }
    };

    loadLessonAndTranscript();

    Promise.all([
      getAllSavedWords(),
      getAllCollections(),
      getLessonProgress(lessonId),
    ])
      .then(([words, cols, progress]) => {
        if (!active) return;
        const wordMap = new Map<string, SavedWord>();
        words.forEach((w) => wordMap.set(w.id.toLowerCase(), w));
        setSavedWordsMap(wordMap);
        setCollections(cols);
        const map = new Map<string, number>();
        progress.forEach((p) => map.set(p.segmentId, p.bestScore));
        setPracticedMap(map);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [lessonId]);

  const activeSegment = useMemo(
    () => lesson?.segments[activeIndex] ?? null,
    [lesson, activeIndex]
  );

  const evaluateCurrentRecording = useCallback(async () => {
    if (!recording || !activeSegment || !lesson) return;
    setEvaluating(true);
    try {
      const formData = new FormData();
      const ext = recording.mimeType.includes("mp4") ? "m4a" : "webm";
      formData.append("audio", recording.blob, `shadow.${ext}`);
      formData.append("targetText", activeSegment.en);
      formData.append("durationMs", String(recording.durationMs));
      const clientKey = window.localStorage.getItem("echotape_gemini_key") ?? "";
      if (clientKey) {
        formData.append("apiKey", clientKey);
      }

      const res = await fetch("/api/evaluate", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const result = (await res.json()) as PronunciationFeedback;
      setFeedback(result);

      const saved = await recordPracticeAttempt(
        lesson.id,
        activeSegment.id,
        result.overallScore
      );
      setPracticedMap((prev) => {
        const next = new Map(prev);
        next.set(activeSegment.id, saved.bestScore);
        return next;
      });
    } catch {
      // Keep UI responsive on network error
    } finally {
      setEvaluating(false);
    }
  }, [recording, activeSegment, lesson]);

  // Auto-evaluate right after a fresh recording finishes
  useEffect(() => {
    if (recording && recording.url !== lastEvaluatedUrlRef.current) {
      lastEvaluatedUrlRef.current = recording.url;
      evaluateCurrentRecording();
    }
  }, [recording, evaluateCurrentRecording]);

  const handleSelectSegment = (index: number) => {
    if (!lesson) return;
    const seg = lesson.segments[index];
    if (!seg) return;
    setActiveIndex(index);
    setFeedback(null);
    setShadowPrompt(null);
    clearRecording();
    lastEvaluatedUrlRef.current = null;
    playerRef.current?.playSegment(seg.start, seg.end);
  };

  const handleTimeUpdate = useCallback(
    (currentSec: number) => {
      if (!lesson || isLooping || autoPause) return;
      const idx = lesson.segments.findIndex(
        (seg) => currentSec >= seg.start && currentSec < seg.end
      );
      if (idx !== -1 && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    },
    [lesson, isLooping, autoPause, activeIndex]
  );

  const handleReplaySegment = () => {
    if (!activeSegment) return;
    setShadowPrompt(null);
    playerRef.current?.playSegment(activeSegment.start, activeSegment.end);
  };

  const handleToggleRecord = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    playerRef.current?.pause();
    userAudioRef.current?.pause();
    setShadowPrompt(null);
    setFeedback(null);
    await startRecording();
  };

  const handleCompareAudio = () => {
    if (!recording || !activeSegment) return;
    setIsComparing(true);
    setShadowPrompt("1/2 播放母語原音中...");
    playerRef.current?.playSegment(activeSegment.start, activeSegment.end, () => {
      setShadowPrompt("2/2 接著播放你的跟讀錄音...");
      const audio = new Audio(recording.url);
      userAudioRef.current = audio;
      audio.onended = () => {
        setIsComparing(false);
        setShadowPrompt(null);
      };
      audio.onerror = () => {
        setIsComparing(false);
        setShadowPrompt(null);
      };
      audio.play().catch(() => {
        setIsComparing(false);
        setShadowPrompt(null);
      });
    });
  };

  const handleSaveWord = async (word: SavedWord) => {
    const key = word.id.toLowerCase();
    await saveWord(word);
    setSavedWordsMap((prev) => {
      const next = new Map(prev);
      next.set(key, word);
      return next;
    });
  };

  const handleRemoveWord = async (id: string) => {
    const key = id.toLowerCase();
    await deleteSavedWord(key);
    setSavedWordsMap((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  };

  const handleCreateCollection = async (name: string, tone: CollectionTone) => {
    const created = await createCollection(name, tone);
    setCollections((prev) => [...prev, created]);
    return created;
  };

  if (loadingLesson) {
    return (
      <div className="flex min-h-dvh items-center justify-center font-mono text-xs text-ink-muted">
        正在載入跟讀磁帶...
      </div>
    );
  }

  if (!lesson || !activeSegment) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="font-serif text-lg font-semibold text-ink">找不到這卷跟讀磁帶</p>
        <Link
          href="/"
          className="retro-pill mt-4 rounded-full bg-sage px-4 py-2 text-xs font-semibold text-paper-card"
        >
          返回探索磁帶櫃
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-48">
      {/* Compact Sticky Top Studio Bar */}
      <header className="sticky top-0 z-30 border-b border-paper-border/80 bg-paper/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-paper-border bg-paper-card text-ink hover:bg-paper-soft"
            aria-label="返回首頁"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-mono text-[10px] uppercase tracking-wider text-sage-dark">
              {lesson.tapeNumber} · {lesson.level}
            </p>
            <h1 className="truncate font-serif text-sm font-semibold text-ink">
              {lesson.title}
            </h1>
          </div>

          <Link
            href="/vocab"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-paper-border bg-paper-card text-ink-muted hover:text-ink"
            aria-label="前往離線單字本"
          >
            <Bookmark className="h-4 w-4" />
            {savedWordsMap.size > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 font-mono text-[9px] font-bold text-paper-card">
                {savedWordsMap.size}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="space-y-4 px-4 pt-3">
        {/* Inline YouTube Player (iOS playsinline safe) */}
        <YouTubePlayer
          ref={playerRef}
          youtubeId={lesson.youtubeId}
          initialStart={lesson.segments[0]?.start ?? 0}
          playbackRate={playbackRate}
          isLooping={isLooping}
          autoPause={autoPause}
          activeStart={activeSegment.start}
          activeEnd={activeSegment.end}
          onTimeUpdate={handleTimeUpdate}
          onPlayingChange={setIsPlaying}
          onSegmentEnd={() => setShadowPrompt("輪到你了！按下下方紅色麥克風開始跟讀")}
        />

        {/* Contextual Prompt / Error Banner */}
        {(shadowPrompt || recorderError) && (
          <div
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-medium ${
              recorderError
                ? "border-terracotta/30 bg-terracotta-soft text-terracotta-dark"
                : "border-sage/30 bg-sage-soft text-sage-dark"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{recorderError || shadowPrompt}</span>
          </div>
        )}

        {/* AI Pronunciation Feedback Card */}
        <FeedbackCard feedback={feedback} evaluating={evaluating} />

        {/* Synchronized Bilingual Subtitles */}
        <section aria-label="同步雙語字幕">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
              SENTENCE {activeIndex + 1} OF {lesson.segments.length}
            </span>
            <span className="text-[11px] text-ink-muted">
              點選句子切換 · 點選單字查釋義
            </span>
          </div>

          <SubtitleList
            segments={lesson.segments}
            activeIndex={activeIndex}
            subtitleMode={subtitleMode}
            practicedMap={practicedMap}
            onSelectSegment={handleSelectSegment}
            onTapWord={(word, contextSentence, curatedNote) => {
              playerRef.current?.pause();
              setSelectedWord({ word, contextSentence, curatedNote });
            }}
          />
        </section>
      </div>

      {/* Bottom Thumb-Zone Retro Tape Deck */}
      <ShadowingControls
        playbackRate={playbackRate}
        isLooping={isLooping}
        autoPause={autoPause}
        subtitleMode={subtitleMode}
        isPlaying={isPlaying}
        isRecording={isRecording}
        isComparing={isComparing}
        evaluating={evaluating}
        levels={levels}
        elapsedMs={elapsedMs}
        recording={recording}
        canPrev={activeIndex > 0}
        canNext={activeIndex < lesson.segments.length - 1}
        onCycleRate={() => {
          const next = RATES[(RATES.indexOf(playbackRate) + 1) % RATES.length];
          setPlaybackRate(next);
          playerRef.current?.setRate(next);
        }}
        onToggleLoop={() => setIsLooping((v) => !v)}
        onToggleAutoPause={() => setAutoPause((v) => !v)}
        onCycleSubtitleMode={() => {
          const next =
            SUBTITLE_MODES[(SUBTITLE_MODES.indexOf(subtitleMode) + 1) % SUBTITLE_MODES.length];
          setSubtitleMode(next);
        }}
        onPrev={() => handleSelectSegment(Math.max(0, activeIndex - 1))}
        onNext={() =>
          handleSelectSegment(Math.min(lesson.segments.length - 1, activeIndex + 1))
        }
        onReplaySegment={handleReplaySegment}
        onToggleRecord={handleToggleRecord}
        onCompareAudio={handleCompareAudio}
        onEvaluateRecording={evaluateCurrentRecording}
      />

      {/* Tap-to-Translate Bottom Sheet with Collection Picker */}
      <WordSheet
        selectedWord={selectedWord}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        existingSavedWord={
          selectedWord
            ? savedWordsMap.get(
                (selectedWord.curatedNote?.word || selectedWord.word).toLowerCase()
              ) ?? null
            : null
        }
        collections={collections}
        onClose={() => setSelectedWord(null)}
        onSaveWord={handleSaveWord}
        onRemoveWord={handleRemoveWord}
        onCreateCollection={handleCreateCollection}
      />
    </div>
  );
}
