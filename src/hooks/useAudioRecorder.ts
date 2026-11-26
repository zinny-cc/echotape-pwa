"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  levels: number[];
  elapsedMs: number;
  error: string | null;
  recording: RecordingResult | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
}

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function detectSupportedMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [levels, setLevels] = useState<number[]>(() => Array(14).fill(0.18));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<RecordingResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const recordingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== "undefined";
    setIsSupported(ok);
  }, []);

  const releaseResources = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Critical for iOS Safari PWA: release microphone tracks immediately so
    // subsequent YouTube/audio playback does not duck or route to earpiece.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setLevels(Array(14).fill(0.18));
  }, []);

  useEffect(() => {
    return () => {
      releaseResources();
      if (recordingUrlRef.current) {
        URL.revokeObjectURL(recordingUrlRef.current);
      }
    };
  }, [releaseResources]);

  const clearRecording = useCallback(() => {
    if (recordingUrlRef.current) {
      URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = null;
    }
    setRecording(null);
    setElapsedMs(0);
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("此瀏覽器不支援麥克風錄音，請使用最新 Safari 或 Chrome。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = detectSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      startedAtRef.current = Date.now();
      setElapsedMs(0);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const durationMs = Math.max(200, Date.now() - startedAtRef.current);

        if (recordingUrlRef.current) {
          URL.revokeObjectURL(recordingUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        recordingUrlRef.current = url;

        setRecording({
          blob,
          url,
          mimeType: finalMime,
          durationMs,
        });
        setIsRecording(false);
        releaseResources();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Live audio waveform visualization
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioContextCtor();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars: number[] = [];
          for (let i = 0; i < 14; i++) {
            const sample = dataArray[i % dataArray.length] ?? 0;
            bars.push(Math.max(0.16, Math.min(1, sample / 190)));
          }
          setLevels(bars);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Fallback if Web Audio API cannot attach
      }

      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 100);
    } catch (err) {
      releaseResources();
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "尚未授權麥克風權限，請在瀏覽器設定中允許存取麥克風。"
          : "無法啟動麥克風，請確認裝置連接狀態後再試一次。";
      setError(message);
      setIsRecording(false);
    }
  }, [releaseResources]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      releaseResources();
      setIsRecording(false);
    }
  }, [releaseResources]);

  return {
    isRecording,
    isSupported,
    levels,
    elapsedMs,
    error,
    recording,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
