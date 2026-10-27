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
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("block", className)}
      role="img"
      aria-label="Mazaj"
    >
      {/* the big one, top left, the way a split falls */}
      <rect x="6" y="6" width="33" height="26" rx="3" fill="currentColor" />
      <rect x="43" y="6" width="15" height="26" rx="3" fill="currentColor" />
      <rect x="6" y="36" width="15" height="22" rx="3" fill="currentColor" />
      <rect x="25" y="36" width="33" height="22" rx="3" fill="currentColor" />
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
