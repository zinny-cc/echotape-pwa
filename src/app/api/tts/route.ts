import { NextRequest, NextResponse } from "next/server";

interface DictPhonetic {
  audio?: string;
}

interface DictEntry {
  phonetics?: DictPhonetic[];
}

async function tryHumanDictionaryAudio(
  word: string,
  accent: "us" | "uk",
  signal: AbortSignal
): Promise<ArrayBuffer | null> {
  if (/\s/.test(word) || word.length > 35) return null;
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
        word.toLowerCase()
      )}`,
      { signal, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const entries = (await res.json()) as DictEntry[];
    const audioUrls = (entries[0]?.phonetics ?? [])
      .map((p) => p.audio?.trim() || "")
      .filter((u) => u.startsWith("http") && u.endsWith(".mp3"));

    if (audioUrls.length === 0) return null;

    const suffix = accent === "uk" ? "-uk.mp3" : "-us.mp3";
    const preferred =
      audioUrls.find((u) => u.toLowerCase().includes(suffix)) || audioUrls[0];

    const mp3Res = await fetch(preferred, { signal });
    if (!mp3Res.ok) return null;
    const buf = await mp3Res.arrayBuffer();
    return buf.byteLength > 500 ? buf : null;
  } catch {
    return null;
  }
}

async function tryNeuralTtsAudio(
  text: string,
  accent: "us" | "uk",
  signal: AbortSignal
): Promise<ArrayBuffer | null> {
  try {
    const tl = accent === "uk" ? "en-GB" : "en-US";
    const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url, {
      signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return buf.byteLength > 400 ? buf : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rawText = (request.nextUrl.searchParams.get("text") ?? "").trim();
  const accentParam = (request.nextUrl.searchParams.get("accent") ?? "us").toLowerCase();
  const accent: "us" | "uk" = accentParam === "uk" ? "uk" : "us";

  const text = rawText.replace(/[’‘]/g, "'").slice(0, 140).trim();
  if (!text) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    // 1. Try authentic human studio recording for single words first
    let audioBuffer = await tryHumanDictionaryAudio(text, accent, controller.signal);

    // 2. Fall back to Google's natural neural TTS (handles contractions, phrases, inflections)
    if (!audioBuffer) {
      audioBuffer = await tryNeuralTtsAudio(text, accent, controller.signal);
    }

    clearTimeout(timer);

    if (!audioBuffer) {
      return NextResponse.json({ error: "TTS unavailable" }, { status: 503 });
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    clearTimeout(timer);
    return NextResponse.json({ error: "TTS failed" }, { status: 503 });
  }
}
