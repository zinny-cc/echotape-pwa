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

const POS_ZH: Record<string, string> = {
  noun: "n.",
  verb: "v.",
  adjective: "adj.",
  adverb: "adv.",
  pronoun: "pron.",
  preposition: "prep.",
  conjunction: "conj.",
  interjection: "interj.",
  exclamation: "interj.",
  article: "art.",
  auxiliary: "aux.",
};

function candidateLemmas(word: string): string[] {
  const list = [word];
  if (word.endsWith("ies") && word.length > 4) list.push(word.slice(0, -3) + "y");
  if (word.endsWith("es") && word.length > 3) {
    list.push(word.slice(0, -2));
    list.push(word.slice(0, -1));
  }
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) {
    list.push(word.slice(0, -1));
  }
  if (word.endsWith("ied") && word.length > 4) list.push(word.slice(0, -3) + "y");
  if (word.endsWith("ed") && word.length > 4) {
    list.push(word.slice(0, -2));
    list.push(word.slice(0, -1));
  }
  if (word.endsWith("ing") && word.length > 5) {
    list.push(word.slice(0, -3));
    list.push(word.slice(0, -3) + "e");
  }
  if (word.endsWith("ly") && word.length > 4) {
    list.push(word.slice(0, -2));
  }
  return Array.from(new Set(list));
}

async function fetchEnglishDetails(word: string, signal: AbortSignal) {
  for (const candidate of candidateLemmas(word).slice(0, 3)) {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(candidate)}`,
        { signal, next: { revalidate: 86400 } }
      );
      if (!res.ok) continue;
      const entries = (await res.json()) as DictionaryApiEntry[];
      const first = entries[0];
      const ipa =
        first?.phonetic ||
        first?.phonetics?.find((p) => p.text)?.text ||
        "";
      const firstMeaning = first?.meanings?.[0];
      const firstDef = firstMeaning?.definitions?.[0];
      const rawPos = (firstMeaning?.partOfSpeech || "").toLowerCase();
      return {
        ipa,
        pos: POS_ZH[rawPos] || rawPos || "",
        enDefinition: firstDef?.definition || "",
        example: firstDef?.example || "",
      };
    } catch {
      return null;
    }
  }
  return null;
}

async function fetchZhTranslation(word: string, signal: AbortSignal) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&dt=bd&q=${encodeURIComponent(
      word
    )}`;
    const res = await fetch(url, { signal, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown[];

    const primary = Array.isArray(json[0])
      ? (json[0] as Array<[string]>)
          .map((seg) => seg?.[0] ?? "")
          .join("")
          .trim()
      : "";

    let detectedPos = "";
    const extraMeanings: string[] = [];

    if (Array.isArray(json[1])) {
      for (const group of json[1] as Array<[string, string[]]>) {
        const posKey = String(group?.[0] ?? "").toLowerCase();
        if (!detectedPos && posKey) {
          detectedPos = POS_ZH[posKey] || posKey;
        }
        const terms = Array.isArray(group?.[1])
          ? group[1].filter(Boolean).slice(0, 4)
          : [];
        if (terms.length > 0) {
          const shortPos = POS_ZH[posKey] || posKey;
          extraMeanings.push(shortPos ? `${shortPos} ${terms.join("、")}` : terms.join("、"));
        }
      }
    }

    let zh = primary;
    if (extraMeanings.length > 0) {
      const details = extraMeanings.slice(0, 2).join("；");
      zh = primary && !details.includes(primary) ? `${primary}（${details}）` : details;
    }

    return {
      zh: zh.trim(),
      pos: detectedPos,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const rawWord = request.nextUrl.searchParams.get("word") ?? "";
  const word = rawWord
    .replace(/[’‘]/g, "'")
    .replace(/[^a-zA-Z'-]/g, "")
    .replace(/^'+|'+$/g, "")
    .toLowerCase();

  if (!word) {
    return NextResponse.json({ error: "Missing word parameter" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const [zhResult, enResult] = await Promise.all([
      fetchZhTranslation(word, controller.signal),
      fetchEnglishDetails(word, controller.signal),
    ]);
    clearTimeout(timer);

    const pos = enResult?.pos || zhResult?.pos || "word";
    const zh =
      zhResult?.zh ||
      (enResult?.enDefinition ? `英解：${enResult.enDefinition}` : "");

    return NextResponse.json({
      word,
      ipa: enResult?.ipa || "",
      pos,
      zh,
      enDefinition: enResult?.enDefinition || "",
      example: enResult?.example || "",
      online: Boolean(zhResult || enResult),
    });
  } catch {
    clearTimeout(timer);
    return NextResponse.json({
      word,
      ipa: "",
      pos: "word",
      zh: "",
      enDefinition: "",
      example: "",
      online: false,
    });
  }
}
