"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowDownLeft, ArrowRight, Check, FileText, Gauge,
  Percent, Repeat, RefreshCw, Target, Sparkles, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { idleRotation, type Signal } from "@/lib/budget";
import { Agent } from "./agent";

/**
 * Mazaj Island.
 *
 * One pill at the top of every screen that says the single most
 * important thing about your money right now, and opens into the
 * assistant when you ask it to.
 *
 * It is one element that changes shape, never several that swap
 * places. Framer's layout animation does the morph, so the pill
 * stretches into a panel the way a real object would rather than
 * one box fading out while another fades in.
 */

const ICONS: Record<string, LucideIcon> = {
  "alert-circle": AlertCircle,
  "file-text": FileText,
  gauge: Gauge,
  "arrow-down-left": ArrowDownLeft,
  repeat: Repeat,
  percent: Percent,
  target: Target,
  "refresh-cw": RefreshCw,
  check: Check,
};

const TONE: Record<string, string> = {
  bad: "var(--destructive)",
  warn: "var(--warning)",
  good: "var(--primary)",
  neutral: "var(--muted-foreground)",
};

/** the Apple spring, the same curve the rest of the app uses */
const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 } as const;

/** how long one idle line holds before the next */
const ROTATE = 5200;

export type IslandMode = "idle" | "alert" | "open";

export function Island({
  signals: all,
  currency,
  syncing,
}: {
  signals: Signal[];
  currency: string;
  syncing?: boolean;
}) {
  const [mode, setMode] = useState<IslandMode>("idle");
  const [at, setAt] = useState(0);
  const router = useRouter();

  const rotation = useMemo(() => idleRotation(all), [all]);
  const current = rotation[at % Math.max(1, rotation.length)] ?? rotation[0];

  /* the pill rotates gently between the top two, and stops the
     moment it is opened, because a line that changes while you
     are reading it is the opposite of calm */
  useEffect(() => {
    if (mode !== "idle" || rotation.length < 2) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setAt((n) => n + 1), ROTATE);
    return () => clearInterval(t);
  }, [mode, rotation.length]);

  /* an alert takes the island for a moment, then gives it back */
  const flash = useCallback(() => {
    setMode("alert");
    setTimeout(() => setMode((m) => (m === "alert" ? "idle" : m)), 3400);
  }, []);

  /* the first time something bad appears, say so */
  const announced = useRef<string | null>(null);
  useEffect(() => {
    const top = all[0];
    if (!top) return;
    if (top.tone !== "bad" && top.tone !== "warn") return;
    if (announced.current === top.id) return;
    announced.current = top.id;
    flash();
  }, [all, flash]);

  /* the keyboard way in */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMode((m) => (m === "open" ? "idle" : "open"));
      }
      if (e.key === "Escape") setMode("idle");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const Icon = ICONS[current?.icon ?? "check"] ?? Check;
  const colour = TONE[current?.tone ?? "good"];
  const open = mode === "open";

  return (
    <>
      {/* a scrim, so opening the island quiets the page behind it */}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setMode("idle")}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        layout
        transition={SPRING}
        /* it hangs from the top, so growing taller only ever
           pushes down into the page and never off the screen */
        style={{ transformOrigin: "top center" }}
        className={cn(
          "relative z-50 origin-top self-start overflow-hidden rounded-[22px] border border-white/[0.07]",
          "bg-[rgb(22_22_24/0.82)] backdrop-blur-xl",
          "shadow-[0_10px_34px_-12px_rgb(0_0_0/0.75)]",
          open ? "w-[min(440px,calc(100vw-32px))]" : "w-auto",
        )}
        animate={{ borderRadius: open ? 26 : 22 }}
      >
        {open ? (
          <Agent
            signals={all}
            currency={currency}
            onClose={() => setMode("idle")}
            onGo={(href) => {
              setMode("idle");
              router.push(href);
            }}
          />
        ) : (
          <motion.button
            layout
            onClick={() => setMode("open")}
            whileTap={{ scale: 0.96 }}
            transition={SPRING}
            aria-label="Open the assistant"
            className="flex h-[38px] items-center gap-2.5 px-3.5 text-left"
          >
            {/* the dot, which breathes when nothing is wrong and
                holds steady when something is */}
            <motion.span
              layout
              className="relative grid size-[18px] flex-none place-items-center"
            >
              {syncing ? (
                <motion.span
                  className="absolute inset-0 rounded-full border-[1.5px] border-transparent"
                  style={{ borderTopColor: colour }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                />
              ) : current?.progress !== undefined ? (
                <Ring value={current.progress} colour={colour} />
              ) : (
                <motion.span
                  className="absolute inset-[3px] rounded-full"
                  style={{ background: colour }}
                  animate={
                    current?.tone === "good"
                      ? { opacity: [0.55, 1, 0.55], scale: [0.92, 1, 0.92] }
                      : { opacity: 1, scale: 1 }
                  }
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <Icon
                className="relative size-[11px]"
                style={{ color: current?.progress !== undefined || syncing ? colour : "transparent" }}
                strokeWidth={2.6}
              />
            </motion.span>

            {/* the line, which cross fades while the pill resizes */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={current?.id ?? "none"}
                layout
                initial={{ opacity: 0, y: 7, filter: "blur(3px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -7, filter: "blur(3px)" }}
                transition={{ duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
                className="block text-[12.5px] font-medium whitespace-nowrap"
              >
                {current?.line ?? "All good today"}
              </motion.span>
            </AnimatePresence>

            {mode === "alert" && current?.href ? (
              <motion.span
                layout
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                className="flex items-center gap-1 text-[12px] text-muted-foreground"
              >
                <ArrowRight className="size-3" />
              </motion.span>
            ) : (
              <motion.span layout className="flex-none text-muted-foreground/60">
                <Sparkles className="size-[13px]" />
              </motion.span>
            )}
          </motion.button>
        )}
      </motion.div>
    </>
  );
}

/** A mini progress ring, for a signal that has a figure behind it. */
function Ring({ value, colour }: { value: number; colour: string }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 18 18" className="absolute inset-0 size-full -rotate-90">
      <circle cx="9" cy="9" r={r} fill="none" stroke="var(--fill-2)" strokeWidth="2" />
      <motion.circle
        cx="9" cy="9" r={r}
        fill="none"
        stroke={colour}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${c}` }}
        animate={{ strokeDasharray: `${Math.min(1, value) * c} ${c}` }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
      />
    </svg>
  );
}
