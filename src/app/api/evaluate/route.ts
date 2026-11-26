import { NextRequest, NextResponse } from "next/server";
import type { PronunciationFeedback, WordScore } from "@/lib/types";

function tokenizeWords(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function buildDemoFeedback(targetText: string, durationMs: number): PronunciationFeedback {
  const words = tokenizeWords(targetText);
  // Deterministic lightweight feedback for demo/offline mode without API key
  const expectedMs = Math.max(1200, words.length * 360);
  const ratio = durationMs / expectedMs;
  const pacePenalty = ratio < 0.45 ? 18 : ratio > 2.0 ? 12 : 0;

  const wordScores: WordScore[] = words.map((word, idx) => {
    const cleanLen = word.replace(/[^a-zA-Z]/g, "").length;
    if (ratio < 0.35 && idx >= Math.ceil(words.length / 2)) {
      return { word, status: "missed" };
    }
    if (cleanLen >= 8 && idx % 3 === 1) {
      return { word, status: "fair" };
    }
    return { word, status: "good" };
  });

  const accuracyScore = Math.max(62, Math.min(94, 88 - pacePenalty));
  const fluencyScore = Math.max(60, Math.min(92, 85 - Math.round(pacePenalty * 0.8)));
  const intonationScore = Math.max(64, Math.min(91, 84 - Math.round(pacePenalty * 0.5)));
  const overallScore = Math.round((accuracyScore + fluencyScore + intonationScore) / 3);

  const tipZh =
    ratio < 0.45
      ? "目前為示範評分模式：偵測到錄音偏短，試著完整唸完句子並放慢一點抓重音（設定 GEMINI_API_KEY 即可啟用真實 AI 聽音評分）。"
      : "目前為示範評分模式：語速節奏相當自然！試著加強關鍵實詞的重音並連讀虛詞（設定 GEMINI_API_KEY 即可啟用真實 Gemini 音訊評分）。";

  return {
    overallScore,
    accuracyScore,
    fluencyScore,
    intonationScore,
    wordScores,
    tipZh,
    engine: "demo",
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const targetText = String(formData.get("targetText") ?? "").trim();
    const durationMs = Number(formData.get("durationMs") ?? 2500);
    const clientApiKey = String(formData.get("apiKey") ?? "").trim();

    if (!targetText) {
      return NextResponse.json({ error: "Missing targetText" }, { status: 400 });
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY || "";

    if (!apiKey || !(audioFile instanceof Blob) || audioFile.size === 0) {
      return NextResponse.json(buildDemoFeedback(targetText, durationMs));
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    // Normalize mime type for Gemini inlineData (strip codecs parameter if present)
    const rawMime = audioFile.type || "audio/webm";
    const cleanMime = rawMime.split(";")[0].trim() || "audio/webm";

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const targetWords = tokenizeWords(targetText);
    const prompt = [
      "You are an encouraging, precise English shadowing pronunciation coach (like Saylo).",
      `Target English sentence: "${targetText}"`,
      `Target words array (preserve exact order and count): ${JSON.stringify(targetWords)}`,
      "Listen carefully to the user's audio recording shadowing this sentence.",
      "Evaluate pronunciation accuracy, fluency/rhythm, and natural intonation/linking.",
      "Return ONLY valid JSON matching this exact schema:",
      "{",
      '  "overallScore": number (0-100),',
      '  "accuracyScore": number (0-100),',
      '  "fluencyScore": number (0-100),',
      '  "intonationScore": number (0-100),',
      '  "transcriptHeard": string (what you actually heard),',
      '  "wordScores": [{"word": string, "status": "good" | "fair" | "missed"}],',
      '  "tipZh": string (1-2 concise, warm Traditional Chinese sentences giving actionable linking, stress, or rhythm advice)',
      "}",
      "If the audio is silent or unintelligible, score below 40 and mark words as missed.",
    ].join("\n");

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: cleanMime,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const fallback = buildDemoFeedback(targetText, durationMs);
      fallback.tipZh =
        "Gemini API 回應異常（請檢查 API Key 或網路），已先切換為本地示範評分。";
      return NextResponse.json(fallback);
    }

    const payload = (await geminiRes.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json(buildDemoFeedback(targetText, durationMs));
    }

    const parsed = JSON.parse(rawText) as Partial<PronunciationFeedback>;
    const normalizedWordScores: WordScore[] =
      Array.isArray(parsed.wordScores) && parsed.wordScores.length > 0
        ? parsed.wordScores.map((w) => ({
            word: String(w.word ?? ""),
            status:
              w.status === "good" || w.status === "fair" || w.status === "missed"
                ? w.status
                : "fair",
          }))
        : targetWords.map((word) => ({ word, status: "fair" }));

    const result: PronunciationFeedback = {
      overallScore: Math.max(0, Math.min(100, Math.round(Number(parsed.overallScore ?? 78)))),
      accuracyScore: Math.max(0, Math.min(100, Math.round(Number(parsed.accuracyScore ?? 78)))),
      fluencyScore: Math.max(0, Math.min(100, Math.round(Number(parsed.fluencyScore ?? 78)))),
      intonationScore: Math.max(0, Math.min(100, Math.round(Number(parsed.intonationScore ?? 78)))),
      wordScores: normalizedWordScores,
      tipZh:
        typeof parsed.tipZh === "string" && parsed.tipZh.trim()
          ? parsed.tipZh.trim()
          : "表現不錯！可以再多聽一次原音的句尾語調起伏。",
      transcriptHeard:
        typeof parsed.transcriptHeard === "string" ? parsed.transcriptHeard : undefined,
      engine: "gemini",
    };

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to evaluate pronunciation" },
      { status: 500 }
    );
  }
}
