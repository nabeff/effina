"use client";

import { cn } from "@/lib/utils";

/**
 * The Effina mark.
 *
 * A square divided into unequal parts, the way one month of money
 * is divided into envelopes. The parts are the real shares from
 * the default split, so the shape is the product rather than a
 * picture of a letter.
 *
 * It reads as an E on its side, which is the only pun in it.
 */
export function Mark({
  className,
  /** draw it in one colour instead of the envelope hues */
  flat = false,
}: {
  className?: string;
  flat?: boolean;
}) {
  const c = (hue: string) => (flat ? "currentColor" : `var(--hue-${hue})`);

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("block", className)}
      role="img"
      aria-label="Effina"
    >
      {/* the pot, one month of money */}
      <rect x="6" y="6" width="52" height="52" rx="15" fill="none"
        stroke={flat ? "currentColor" : "var(--primary)"} strokeWidth="4" />

      {/* divided into three unequal bands, largest first, the way
          the split actually falls */}
      <rect x="17" y="18" width="30" height="6" rx="3" fill={c("green")} />
      <rect x="17" y="29" width="21" height="6" rx="3" fill={c("teal")} />
      <rect x="17" y="40" width="13" height="6" rx="3" fill={c("purple")} />
    </svg>
  );
}

/** The mark as an avatar, for the rail and the wizard header. */
export function MarkBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-primary text-primary-foreground",
        className,
      )}
    >
      <Mark flat className="size-[58%]" />
    </span>
  );
}
