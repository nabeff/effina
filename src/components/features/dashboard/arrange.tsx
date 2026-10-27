"use client";

import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASH_CARDS } from "@/lib/budget";

/**
 * Edit mode controls, drawn over a card rather than inside it,
 * so arranging the page never changes how the page looks.
 *
 * Buttons rather than a real drag. A drag needs a pointer and a
 * steady hand, and the whole point of this app is that it works
 * on a phone in ten seconds.
 */
export function Arrange({
  id, width, first, last, onMove, onWidth,
}: {
  id: string;
  width: number;
  first: boolean;
  last: boolean;
  onMove: (by: number) => void;
  onWidth: () => void;
}) {
  const name = DASH_CARDS.find((c) => c.id === id)?.name ?? "This card";
  const label = width === 12 ? "Full" : width === 8 ? "Wide" : "Half";

  return (
    <div className="absolute inset-0 z-20 rounded-[var(--radius)] ring-2 ring-primary/60 ring-offset-2 ring-offset-background">
      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-elevated/95 p-1 shadow-lg backdrop-blur">
        <button
          onClick={() => onMove(-1)}
          disabled={first}
          aria-label={`Move ${name} up`}
          className={cn(
            "grid size-7 place-items-center rounded-full transition-colors",
            first
              ? "text-subtle-foreground opacity-40"
              : "text-muted-foreground hover:bg-fill-2 hover:text-foreground",
          )}
        >
          <ChevronUp className="size-4" />
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={last}
          aria-label={`Move ${name} down`}
          className={cn(
            "grid size-7 place-items-center rounded-full transition-colors",
            last
              ? "text-subtle-foreground opacity-40"
              : "text-muted-foreground hover:bg-fill-2 hover:text-foreground",
          )}
        >
          <ChevronDown className="size-4" />
        </button>
        <button
          onClick={onWidth}
          aria-label={`${name} is ${label}, change the width`}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
        >
          <Maximize2 className="size-3.5" />
          {label}
        </button>
      </div>
    </div>
  );
}
