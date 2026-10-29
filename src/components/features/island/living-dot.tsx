"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Moon, Sun } from "lucide-react";
import type { MomentKind } from "@/lib/budget";
import type { Tone } from "@/types/budget";

/**
 * The dot, which is alive.
 *
 * It breathes all the time, and now and then does one small
 * thing: a ripple out like sonar, a squish like a blink, a sun
 * at breakfast or a moon at night. It never follows the cursor,
 * because this is a status light rather than a toy.
 *
 * Every flourish is off under prefers-reduced-motion. The dot
 * still shows its colour, which is the part that carries
 * meaning.
 */

const COLOUR: Record<Tone, string> = {
  good: "var(--primary)",
  warn: "var(--hue-orange)",
  bad: "var(--destructive)",
  neutral: "var(--muted-foreground)",
};

/** the same slow factor the island uses, so nothing races */
function slowFactor() {
  if (typeof window === "undefined") return 1;
  const n = (window as unknown as { __islandSlow?: number }).__islandSlow;
  return typeof n === "number" && n > 0 ? n : 1;
}

export function LivingDot({
  tone = "good",
  moment,
  idle = true,
}: {
  tone?: Tone;
  /** the flourish playing right now, if any */
  moment?: MomentKind | null;
  /** false while the island is moving, so nothing breathes
      against a shape that is already in motion */
  idle?: boolean;
}) {
  const reduce = useReducedMotion();
  /* ambient is off unless the island is closed and settled */
  const still = reduce || !idle;
  const colour = COLOUR[tone] ?? COLOUR.good;
  const slow = slowFactor();

  const icon =
    !idle
      ? null
      : moment === "greeting"
        ? "greeting"
        : moment === "received" || moment === "goal"
          ? "check"
          : null;

  return (
    <motion.span className="relative grid size-[9px] flex-none place-items-center">
      {/* the halo, always */}
      <motion.span
        className="absolute inset-[-2px] rounded-full blur-[2px]"
        style={{ background: colour }}
        animate={still ? { opacity: 0.1 } : { opacity: [0.06, 0.13, 0.06] }}
        transition={{
          duration: 3 * slow,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* one ring going out, like sonar */}
      <AnimatePresence>
        {moment === "ripple" && idle && !reduce ? (
          <motion.span
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: colour }}
            /* It rises from nothing, brightens as it leaves the
               dot, then fades. Starting at half opacity is what
               made it appear rather than begin. */
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 2.2, 4.5], opacity: [0, 0.42, 0] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2.4 * slow,
              ease: "easeOut",
              times: [0, 0.35, 1],
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* the dot, which squishes when it blinks */}
      <motion.span
        className="size-full rounded-full"
        style={{ background: colour }}
        animate={
          still
            ? { scale: 1 }
            : moment === "blink"
              ? { scaleY: [1, 0.3, 1], scaleX: [1, 1.15, 1] }
              : { scale: [1, 1.15, 1] }
        }
        transition={
          moment === "blink"
            ? { duration: 0.34 * slow, ease: "easeInOut" }
            : { duration: 3 * slow, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* what it becomes, briefly */}
      <AnimatePresence>
        {icon ? (
          <motion.span
            className="absolute inset-[-3px] grid place-items-center rounded-full"
            style={{ background: colour, color: "var(--primary-foreground)" }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
          >
            {icon === "check" ? (
              <Check className="size-[9px]" strokeWidth={3.5} />
            ) : (
              <Greeting />
            )}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.span>
  );
}

/**
 * A sun before noon, a moon after six.
 *
 * The hour is read after mount, because the build has no idea
 * what time it is where this is being looked at, and reading
 * the clock during a prerender bakes the wrong one in.
 */
function Greeting() {
  const [h, setH] = useState<number | null>(null);
  useEffect(() => {
    setH(new Date().getHours());
  }, []);
  if (h === null) return null;
  const Icon = h >= 5 && h < 12 ? Sun : Moon;
  return <Icon className="size-[9px]" strokeWidth={2.6} />;
}
