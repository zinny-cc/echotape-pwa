"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Disc3, PlusCircle } from "lucide-react";

interface BottomNavProps {
  onOpenImport?: () => void;
  onResetTopic?: () => void;
  savedCount?: number;
}

export function BottomNav({
  onOpenImport,
  onResetTopic,
  savedCount,
}: BottomNavProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isVocab = pathname.startsWith("/vocab");

  return (
    <nav
      aria-label="主導覽列"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-paper-border bg-paper-card/95 backdrop-blur-md pb-safe"
    >
      <div className="grid grid-cols-3 items-center px-3 pt-2 pb-1">
        {isHome && onResetTopic ? (
          <button
            type="button"
            onClick={onResetTopic}
            className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-sage-dark transition-colors"
          >
            <span className="flex h-7 w-11 items-center justify-center rounded-full bg-sage-soft">
              <Disc3 className="h-[18px] w-[18px]" strokeWidth={2.3} />
            </span>
            <span className="text-[11px] font-medium tracking-wide">探索磁帶</span>
          </button>
        ) : (
          <Link
            href="/"
            className={`flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
              isHome ? "text-sage-dark" : "text-ink-muted hover:text-ink"
            }`}
          >
            <span
              className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                isHome ? "bg-sage-soft" : ""
              }`}
            >
              <Disc3 className="h-[18px] w-[18px]" strokeWidth={isHome ? 2.3 : 1.9} />
            </span>
            <span className="text-[11px] font-medium tracking-wide">探索磁帶</span>
          </Link>
        )}

        {onOpenImport ? (
          <button
            type="button"
            onClick={onOpenImport}
            className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-ink-muted transition-colors hover:text-ink"
          >
            <span className="flex h-7 w-11 items-center justify-center rounded-full border border-paper-border bg-paper-soft">
              <PlusCircle className="h-[18px] w-[18px] text-terracotta" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-medium tracking-wide">匯入影音</span>
          </button>
        ) : (
          <Link
            href="/?import=1"
            className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-ink-muted transition-colors hover:text-ink"
          >
            <span className="flex h-7 w-11 items-center justify-center rounded-full border border-paper-border bg-paper-soft">
              <PlusCircle className="h-[18px] w-[18px] text-terracotta" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-medium tracking-wide">匯入影音</span>
          </Link>
        )}

        <Link
          href="/vocab"
          className={`relative flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
            isVocab ? "text-sage-dark" : "text-ink-muted hover:text-ink"
          }`}
        >
          <span
            className={`relative flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
              isVocab ? "bg-sage-soft" : ""
            }`}
          >
            <Bookmark className="h-[18px] w-[18px]" strokeWidth={isVocab ? 2.3 : 1.9} />
            {typeof savedCount === "number" && savedCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 font-mono text-[9px] font-semibold text-paper-card">
                {savedCount > 99 ? "99+" : savedCount}
              </span>
            )}
          </span>
          <span className="text-[11px] font-medium tracking-wide">單字本</span>
        </Link>
      </div>
    </nav>
  );
}
