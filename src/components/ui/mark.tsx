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
    same shape. Each carries its own hue, because the blocks
    stand for shares and the shares are never one colour. */
export const MARK_BLOCKS = [
  { x: 6, y: 6, w: 33, h: 26, hue: "green" },
  { x: 43, y: 6, w: 15, h: 26, hue: "teal" },
  { x: 6, y: 36, w: 15, h: 22, hue: "purple" },
  { x: 25, y: 36, w: 33, h: 22, hue: "orange" },
];

export function Mark({
  className, colour = false,
}: {
  className?: string;
  /** four hues instead of one flat colour */
  colour?: boolean;
}) {
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
          fill={colour ? `var(--hue-${b.hue})` : "currentColor"}
        />
      ))}
    </svg>
  );
}

/**
 * The mark shaped like a lucide icon, so it can stand in for one.
 *
 * Home is the dashboard, and the dashboard is the whole picture
 * of a month, which is what the mark already means. A generic
 * four square grid icon said the same thing less well.
 */
export function MarkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("block", className)}
      aria-hidden
    >
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
export function MarkBadge({
  className, colour = true,
}: {
  className?: string;
  colour?: boolean;
}) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full",
        colour
          ? "bg-card-2 ring-1 ring-border-soft"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      <Mark className="size-[56%]" colour={colour} />
    </span>
  );
}
