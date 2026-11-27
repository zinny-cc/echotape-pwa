"use client";

export type AccentPreference = "us" | "uk";

const ACCENT_STORAGE_KEY = "echotape_voice_accent";

// Avoid robotic / novelty macOS & browser voices that sound unnatural
const BLOCKED_VOICE_PATTERN =
  /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|eddy|flo|fred|good news|grandma|grandpa|jester|junior|kathy|organ|ralph|reed|rocko|sandy|shelley|superstar|trinoids|whisper|wobble|zarvox)\b/i;

const PREFERRED_US_NAMES = [
  "google us english",
  "ava (premium)",
  "ava (enhanced)",
  "zoe (premium)",
  "zoe (enhanced)",
  "samantha (enhanced)",
  "allison (enhanced)",
  "microsoft aria",
  "microsoft jenny",
  "siri",
  "samantha",
  "alex",
  "nicky",
  "aaron",
];

const PREFERRED_UK_NAMES = [
  "google uk english female",
  "google uk english male",
  "serena (premium)",
  "serena (enhanced)",
  "daniel (enhanced)",
  "martha",
  "arthur",
  "daniel",
  "serena",
  "kate",
  "oliver",
];

const audioBlobCache = new Map<string, string>();
let activeAudioEl: HTMLAudioElement | null = null;

export function getPreferredAccent(): AccentPreference {
  if (typeof window === "undefined") return "us";
  const saved = window.localStorage.getItem(ACCENT_STORAGE_KEY);
  return saved === "uk" ? "uk" : "us";
}

export function setPreferredAccent(accent: AccentPreference): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
}

export function stopSpeaking(): void {
  if (activeAudioEl) {
    activeAudioEl.pause();
    activeAudioEl.currentTime = 0;
    activeAudioEl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function pickBestSystemVoice(accent: AccentPreference): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const targetLangPrefix = accent === "uk" ? "en-gb" : "en-us";
  const preferredNames = accent === "uk" ? PREFERRED_UK_NAMES : PREFERRED_US_NAMES;

  const cleanVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith("en") && !BLOCKED_VOICE_PATTERN.test(v.name)
  );
  if (!cleanVoices.length) return null;

  // 1. Exact preferred natural voice name match
  for (const wanted of preferredNames) {
    const match = cleanVoices.find((v) => v.name.toLowerCase().includes(wanted));
    if (match) return match;
  }

  // 2. Any Enhanced / Premium / Natural / Online voice in target accent
  const enhanced = cleanVoices.find(
    (v) =>
      v.lang.toLowerCase().startsWith(targetLangPrefix) &&
      /(enhanced|premium|natural|neural|online|google)/i.test(v.name)
  );
  if (enhanced) return enhanced;

  // 3. Clean standard voice in target accent
  const sameAccent = cleanVoices.find((v) =>
    v.lang.toLowerCase().startsWith(targetLangPrefix)
  );
  if (sameAccent) return sameAccent;

  return cleanVoices[0] ?? null;
}

function speakWithSystemFallback(
  text: string,
  accent: AccentPreference,
  rate: number
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = accent === "uk" ? "en-GB" : "en-US";
  utter.rate = Math.max(0.65, Math.min(1.15, rate));
  utter.pitch = 1.0;

  const bestVoice = pickBestSystemVoice(accent);
  if (bestVoice) {
    utter.voice = bestVoice;
  }
  window.speechSynthesis.speak(utter);
}

/**
 * Plays natural human/neural English pronunciation via `/api/tts` (cached per word),
 * automatically falling back to the best non-robotic system voice when offline.
 */
export async function speakNaturalEnglish(
  text: string,
  options?: { rate?: number; accent?: AccentPreference }
): Promise<void> {
  const cleaned = text.trim();
  if (!cleaned || typeof window === "undefined") return;

  const accent = options?.accent ?? getPreferredAccent();
  const rate = options?.rate ?? 1.0;
  const cacheKey = `${accent}:${cleaned.toLowerCase()}`;

  stopSpeaking();

  const playUrl = async (objectUrl: string) => {
    const audio = new Audio(objectUrl);
    audio.playbackRate = Math.max(0.6, Math.min(1.25, rate));
    // Preserve natural vocal timbre when slowing down to 0.7x
    if ("preservesPitch" in audio) {
      (audio as HTMLAudioElement & { preservesPitch: boolean }).preservesPitch = true;
    }
    activeAudioEl = audio;
    await audio.play();
  };

  try {
    const cachedUrl = audioBlobCache.get(cacheKey);
    if (cachedUrl) {
      await playUrl(cachedUrl);
      return;
    }

    const res = await fetch(
      `/api/tts?text=${encodeURIComponent(cleaned)}&accent=${accent}`
    );
    if (!res.ok) throw new Error("TTS proxy unavailable");

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("audio")) throw new Error("Non-audio response");

    const blob = await res.blob();
    if (blob.size < 400) throw new Error("Empty audio");

    const objectUrl = URL.createObjectURL(blob);
    audioBlobCache.set(cacheKey, objectUrl);
    await playUrl(objectUrl);
  } catch {
    // Graceful offline fallback using ranked natural system voices
    speakWithSystemFallback(cleaned, accent, rate);
  }
}
