"use client";

import { cn } from "@/lib/utils";

/**
 * The Mazaj mark.
 *
 * Four unequal blocks nested into one square. Many things, one
 * settled picture, and the blocks differ in size because the
 * shares they stand for differ too.
 *
 * Nothing rotates. An earlier version turned the blocks around a
 * centre and read as a pinwheel, which is not a thing a brand
 * can risk.
 */
/** The mark's rectangles, so anything that draws it draws the
    same shape. */
export const MARK_BLOCKS = [
  { x: 6, y: 6, w: 33, h: 26 },
  { x: 43, y: 6, w: 15, h: 26 },
  { x: 6, y: 36, w: 15, h: 22 },
  { x: 25, y: 36, w: 33, h: 22 },
];

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("block", className)}
      role="img"
      aria-label="Mazaj"
    >
      {/* the big one first, top left, the way a split falls */}
      {MARK_BLOCKS.map((b, i) => (
        <rect
          key={i}
          x={b.x} y={b.y} width={b.w} height={b.h} rx={3}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/** The mark in a circle, for the rail and the wizard header. */
export function MarkBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
    >
      <Mark className="size-[56%]" />
    </span>
  );
}
