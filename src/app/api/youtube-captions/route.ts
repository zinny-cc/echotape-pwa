import { NextRequest, NextResponse } from "next/server";

interface RawCue {
  start: number;
  end: number;
  text: string;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\u200B/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanZh(str: string): string {
  return str
    .replace(/\[(?:音樂|掌聲|笑聲|歡呼|嘆氣|沉默|Music|Applause|Laughter)\]/gi, "")
    .replace(/([\u4e00-\u9fff，。！？、：；])\s+([\u4e00-\u9fff，。！？、：；])/g, "$1$2")
    .replace(/([\u4e00-\u9fff，。！？、：；])\s+([\u4e00-\u9fff，。！？、：；])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTimedTextXml(xml: string): RawCue[] {
  const items: RawCue[] = [];
  const pRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = pRegex.exec(xml)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const tMatch = attrs.match(/\bt="(\d+)"/);
    const dMatch = attrs.match(/\bd="(\d+)"/);
    if (!tMatch) continue;
    const startMs = Number(tMatch[1]);
    const durMs = dMatch ? Number(dMatch[1]) : 2500;
    const stripped = decodeEntities(body.replace(/<[^>]+>/g, ""));
    if (!stripped) continue;
    if (
      /^[\[(♫♪\s]+(music|applause|laughter|cheering|sighs|groans|inaudible|silence|音樂|掌聲|笑聲)[\])♫♪\s]*$/i.test(
        stripped
      )
    ) {
      continue;
    }
    items.push({
      start: startMs / 1000,
      end: (startMs + durMs) / 1000,
      text: stripped
        .replace(/\[(?:Music|Applause|Laughter|音樂|掌聲|笑聲)\]/gi, "")
        .trim(),
    });
  }
  return items.filter((i) => i.text.length > 0);
}

function mergeSegments(rawItems: RawCue[], maxSegments = 8) {
  if (rawItems.length === 0) return [];
  const segments: Array<{ start: number; end: number; en: string }> = [];
  let buf: string[] = [];
  let segStart = rawItems[0].start;
  let segEnd = rawItems[0].end;

  const flush = () => {
    if (buf.length === 0) return;
    const combined = buf.join(" ").replace(/\s+/g, " ").trim();
    if (combined.length >= 6) {
      segments.push({
        start: +segStart.toFixed(2),
        end: +Math.max(segStart + 1.2, segEnd).toFixed(2),
        en: combined,
      });
    }
    buf = [];
  };

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const nextStart = rawItems[i + 1]?.start ?? item.end;
    const effectiveEnd = Math.min(
      item.end,
      nextStart > item.start ? nextStart : item.end
    );
    if (buf.length === 0) {
      segStart = item.start;
      segEnd = effectiveEnd;
      buf.push(item.text);
    } else {
      const gap = item.start - segEnd;
      const candidateText = `${buf.join(" ")} ${item.text}`;
      const candidateDur = effectiveEnd - segStart;
      const prevEnds = /[.!?]["']?$/.test(buf[buf.length - 1]);
      if (
        gap > 1.8 ||
        (prevEnds && candidateText.length > 48) ||
        candidateText.length > 125 ||
        candidateDur > 8.5
      ) {
        flush();
        if (segments.length >= maxSegments) break;
        segStart = item.start;
        segEnd = effectiveEnd;
        buf.push(item.text);
      } else {
        buf.push(item.text);
        segEnd = Math.max(segEnd, effectiveEnd);
      }
    }
  }
  if (segments.length < maxSegments) flush();
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].end > segments[i + 1].start) {
      segments[i].end = +Math.max(
        segments[i].start + 1,
        segments[i + 1].start - 0.05
      ).toFixed(2);
    }
  }
  return segments;
}

export async function GET(request: NextRequest) {
  const videoId = (request.nextUrl.searchParams.get("videoId") ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: "無效的 YouTube 影片 ID" }, { status: 400 });
  }

  try {
    const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const html = await watchRes.text();
    const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
    const title = titleMatch ? decodeEntities(titleMatch[1]) : "";
    const keyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);

    if (!keyMatch) {
      return NextResponse.json({ error: "無法取得影片字幕資訊" }, { status: 502 });
    }

    const playerRes = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${keyMatch[1]}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
          videoId,
        }),
      }
    );
    const playerJson = (await playerRes.json()) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{
            baseUrl: string;
            languageCode: string;
            kind?: string;
          }>;
        };
      };
    };

    const tracks =
      playerJson?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const enTracks = tracks.filter((t) => /^en(-|$)/i.test(t.languageCode));
    const enTrack = enTracks.find((t) => t.kind !== "asr") || enTracks[0];
    if (!enTrack) {
      return NextResponse.json(
        { error: "這支影片沒有可用的英文字幕軌，請手動貼上台詞。" },
        { status: 404 }
      );
    }

    const enXml = await (await fetch(enTrack.baseUrl)).text();
    const enSegments = mergeSegments(parseTimedTextXml(enXml), 8);
    if (enSegments.length === 0) {
      return NextResponse.json(
        { error: "無法解析英文字幕內容，請改用手動貼上。" },
        { status: 404 }
      );
    }

    const zhOfficial = tracks.find((t) =>
      /^(zh-TW|zh-Hant|zh-HK)$/i.test(t.languageCode)
    );
    let zhItems: RawCue[] = [];
    try {
      const zhUrl = zhOfficial
        ? zhOfficial.baseUrl
        : `${enTrack.baseUrl}&tlang=zh-Hant`;
      const zhXml = await (await fetch(zhUrl)).text();
      zhItems = parseTimedTextXml(zhXml);
    } catch {
      // Optional Chinese translation
    }

    const segments = enSegments.map((seg, idx) => {
      const overlapping = zhItems.filter((z) => {
        const mid = (z.start + z.end) / 2;
        return mid >= seg.start - 0.45 && mid <= seg.end + 0.45;
      });
      const zh = cleanZh(overlapping.map((z) => z.text).join(" "));
      return {
        id: `yt-${idx + 1}`,
        start: seg.start,
        end: seg.end,
        en: seg.en,
        zh: zh || "（對照上方英文字幕跟讀）",
      };
    });

    return NextResponse.json({ title, segments });
  } catch {
    return NextResponse.json(
      { error: "抓取字幕時發生連線錯誤，請確認網路狀態或手動貼上字幕。" },
      { status: 500 }
    );
  }
}
