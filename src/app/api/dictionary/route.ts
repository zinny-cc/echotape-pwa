import { NextRequest, NextResponse } from "next/server";

interface DictionaryApiMeaning {
  partOfSpeech?: string;
  definitions?: Array<{
    definition?: string;
    example?: string;
  }>;
}

interface DictionaryApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: DictionaryApiMeaning[];
}

export async function GET(request: NextRequest) {
  const rawWord = request.nextUrl.searchParams.get("word") ?? "";
  const word = rawWord.replace(/[^a-zA-Z'-]/g, "").toLowerCase();

  if (!word) {
    return NextResponse.json({ error: "Missing word parameter" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { signal: controller.signal, next: { revalidate: 86400 } }
    );
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({
        word,
        ipa: "",
        pos: "word",
        zh: "暫無內建中文釋義，可收藏後結合例句複習。",
        enDefinition: "",
        example: "",
      });
    }

    const entries = (await res.json()) as DictionaryApiEntry[];
    const first = entries[0];
    const ipa =
      first?.phonetic ||
      first?.phonetics?.find((p) => p.text)?.text ||
      "";
    const firstMeaning = first?.meanings?.[0];
    const firstDef = firstMeaning?.definitions?.[0];

    return NextResponse.json({
      word: first?.word || word,
      ipa,
      pos: firstMeaning?.partOfSpeech || "word",
      zh: firstDef?.definition
        ? `英解：${firstDef.definition}`
        : "可收藏至單字本，搭配原句語境記憶。",
      enDefinition: firstDef?.definition || "",
      example: firstDef?.example || "",
    });
  } catch {
    return NextResponse.json({
      word,
      ipa: "",
      pos: "word",
      zh: "目前無法連線外部字典，但你仍可直接收藏此單字至離線單字本。",
      enDefinition: "",
      example: "",
    });
  }
}
