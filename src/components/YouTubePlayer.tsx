"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        config: Record<string, unknown>
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState?: () => number;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
}

export interface YouTubePlayerHandle {
  playSegment: (start: number, end: number, onEnded?: () => void) => void;
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  setRate: (rate: number) => void;
}

interface YouTubePlayerProps {
  youtubeId: string;
  initialStart: number;
  playbackRate: number;
  isLooping: boolean;
  autoPause: boolean;
  activeStart: number;
  activeEnd: number;
  onTimeUpdate: (currentSec: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onSegmentEnd?: () => void;
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    {
      youtubeId,
      initialStart,
      playbackRate,
      isLooping,
      autoPause,
      activeStart,
      activeEnd,
      onTimeUpdate,
      onPlayingChange,
      onSegmentEnd,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YTPlayerInstance | null>(null);
    const [ready, setReady] = useState(false);

    // Keep fresh state in refs for the 100ms sync interval
    const loopRef = useRef(isLooping);
    const autoPauseRef = useRef(autoPause);
    const activeRangeRef = useRef({ start: activeStart, end: activeEnd });
    const segmentCallbackRef = useRef<(() => void) | null>(null);
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onPlayingChangeRef = useRef(onPlayingChange);
    const onSegmentEndRef = useRef(onSegmentEnd);

    loopRef.current = isLooping;
    autoPauseRef.current = autoPause;
    activeRangeRef.current = { start: activeStart, end: activeEnd };
    onTimeUpdateRef.current = onTimeUpdate;
    onPlayingChangeRef.current = onPlayingChange;
    onSegmentEndRef.current = onSegmentEnd;

    useEffect(() => {
      let mounted = true;
      let pollId: number | null = null;

      loadYouTubeApi().then(() => {
        if (!mounted || !containerRef.current || !window.YT?.Player) return;

        // Clear any leftover node
        containerRef.current.innerHTML = "";
        const mountEl = document.createElement("div");
        containerRef.current.appendChild(mountEl);

        playerRef.current = new window.YT.Player(mountEl, {
          videoId: youtubeId,
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1, // Critical for iOS Safari PWA inline playback
            rel: 0,
            modestbranding: 1,
            fs: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            start: Math.floor(initialStart),
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          },
          events: {
            onReady: (ev: { target: YTPlayerInstance }) => {
              if (!mounted) return;
              ev.target.setPlaybackRate(playbackRate);
              setReady(true);
            },
            onStateChange: (ev: { data: number }) => {
              if (!mounted || !window.YT) return;
              const playing = ev.data === window.YT.PlayerState.PLAYING;
              onPlayingChangeRef.current(playing);
            },
          },
        });

        pollId = window.setInterval(() => {
          const p = playerRef.current;
          if (!p || typeof p.getCurrentTime !== "function" || !window.YT) return;
          const isCurrentlyPlaying =
            typeof p.getPlayerState === "function"
              ? p.getPlayerState() === window.YT.PlayerState.PLAYING
              : true;
          if (!isCurrentlyPlaying) return;

          const t = p.getCurrentTime();
          if (typeof t !== "number" || Number.isNaN(t)) return;

          onTimeUpdateRef.current(t);

          const { start, end } = activeRangeRef.current;
          if (end > start && t >= end - 0.04) {
            if (segmentCallbackRef.current) {
              const cb = segmentCallbackRef.current;
              segmentCallbackRef.current = null;
              p.pauseVideo();
              cb();
              return;
            }
            if (loopRef.current) {
              p.seekTo(start, true);
              p.playVideo();
            } else if (autoPauseRef.current) {
              p.pauseVideo();
              onSegmentEndRef.current?.();
            }
          }
        }, 80);
      });

      return () => {
        mounted = false;
        if (pollId !== null) window.clearInterval(pollId);
        try {
          playerRef.current?.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [youtubeId]);

    useEffect(() => {
      if (ready && playerRef.current) {
        try {
          playerRef.current.setPlaybackRate(playbackRate);
        } catch {
          // ignore
        }
      }
    }, [playbackRate, ready]);

    useImperativeHandle(ref, () => ({
      playSegment(start: number, end: number, onEnded?: () => void) {
        activeRangeRef.current = { start, end };
        segmentCallbackRef.current = onEnded ?? null;
        const p = playerRef.current;
        if (!p) return;
        p.seekTo(start, true);
        p.playVideo();
      },
      seekTo(seconds: number) {
        segmentCallbackRef.current = null;
        playerRef.current?.seekTo(seconds, true);
      },
      play() {
        segmentCallbackRef.current = null;
        playerRef.current?.playVideo();
      },
      pause() {
        segmentCallbackRef.current = null;
        playerRef.current?.pauseVideo();
      },
      setRate(rate: number) {
        playerRef.current?.setPlaybackRate(rate);
      },
    }));

    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-paper-border bg-ink/90 shadow-[0_3px_0_0_#DDD5C5]">
        <div ref={containerRef} className="h-full w-full" />
        {!ready && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-paper-soft/95 text-ink-muted">
            <span className="font-mono text-xs tracking-widest">LOADING TAPE...</span>
          </div>
        )}
      </div>
    );
  }
);
