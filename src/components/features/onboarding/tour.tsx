"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Stop {
  route: string;
  target: string;
  title: string;
  text: string;
}

const STOPS: Stop[] = [
  { route: "/", target: "hero", title: "Free to spend",
    text: "What is still yours this month after bills, savings and tax." },
  { route: "/", target: "split", title: "Where it all sits",
    text: "Every dirham that came in, shown as the parts it went to." },
  { route: "/envelopes", target: "envelopes", title: "An envelope",
    text: "Money with a job. Green is fine, orange is nearly out, red is over." },
  { route: "/log", target: "add", title: "Adding a line",
    text: "Log what you earned or spent in about five seconds." },
  { route: "/log", target: "log", title: "Money log",
    text: "Every payment in and out, newest first. Edit or delete any line." },
  { route: "/goals", target: "goals", title: "Goals",
    text: "Slide how much of your savings each goal takes, the date updates itself." },
  { route: "/rebalance", target: "rebalance", title: "Rebalance",
    text: "Overspent somewhere? This says which envelope to take from, never tax." },
  { route: "/setup", target: "setup", title: "Setup",
    text: "Income, bills, shares, and the button to run this tour again." },
];

interface Box { top: number; left: number; width: number; height: number }

/**
 * A spotlight over the real screen rather than screenshots, so
 * the tour shows the app with your own figures in it.
 */
export function Tour({ onClose }: { onClose: () => void }) {
  const [at, setAt] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const stop = STOPS[at];
  const last = at === STOPS.length - 1;

  /* follow the stop to its screen */
  useEffect(() => {
    if (pathname !== stop.route) router.push(stop.route);
  }, [at, stop.route, pathname, router]);

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${stop.target}"]`);
    if (!el) { setBox(null); return; }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { setBox(null); return; }
    const pad = 8;
    setBox({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [stop.target]);

  /* the target may not exist until the new route has painted, so
     look again for a moment rather than giving up on the first try */
  useEffect(() => {
    let tries = 0;
    /* measured from a frame rather than straight away, since the
       element belongs to a route that may still be painting */
    const first = requestAnimationFrame(measure);
    const t = setInterval(() => {
      measure();
      if (++tries > 20) clearInterval(t);
    }, 100);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      else if (e.key === "ArrowRight") setAt((n) => Math.min(STOPS.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setAt((n) => Math.max(0, n - 1));
    };
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  }, [onClose]);

  /* the card sits below the highlight, or above it near the bottom */
  const below = box ? box.top + box.height + 14 : 0;
  const roomBelow = typeof window !== "undefined" ? window.innerHeight - below : 0;
  const above = box !== null && roomBelow < 210;

  return (
    <div className="fixed inset-0 z-50">
      {/* the dimmed ground, cut through by the highlight */}
      <div
        className="absolute inset-0 bg-black/68 transition-[clip-path] duration-300 ease-[var(--ease)]"
        onClick={onClose}
        style={
          box
            ? {
                clipPath: `polygon(
                  0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${box.left}px ${box.top}px,
                  ${box.left}px ${box.top + box.height}px,
                  ${box.left + box.width}px ${box.top + box.height}px,
                  ${box.left + box.width}px ${box.top}px,
                  ${box.left}px ${box.top}px
                )`,
              }
            : undefined
        }
      />

      {box ? (
        <div
          className="pointer-events-none absolute rounded-[var(--radius-md)] ring-2 ring-primary transition-all duration-300 ease-[var(--ease)]"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      ) : null}

      <div
        className={cn(
          /* a solid card, not glass. Over a dimmed page the
             frosted panel let the content behind it show through
             and the text stopped being readable. */
          "absolute w-[min(360px,calc(100vw-2rem))] rounded-[var(--radius)] border border-border-soft bg-elevated p-5 shadow-[0_18px_48px_-12px_rgb(0_0_0/0.65)] transition-all duration-300 ease-[var(--ease)]",
          !box && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={
          box
            ? {
                top: above ? Math.max(12, box.top - 14) : below,
                left: Math.min(
                  Math.max(12, box.left),
                  (typeof window !== "undefined" ? window.innerWidth : 1200) - 372,
                ),
                transform: above ? "translateY(-100%)" : undefined,
              }
            : undefined
        }
      >
        <div className="mb-2 text-[11.5px] font-semibold tracking-[0.04em] text-primary uppercase">
          {at + 1} of {STOPS.length}
        </div>
        <h3 className="text-[17px] font-bold tracking-[-0.02em]">{stop.title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground text-pretty">
          {stop.text}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-[13px] text-subtle-foreground transition-colors hover:text-muted-foreground"
          >
            Skip
          </button>
          <div className="ml-auto flex gap-2">
            {at > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setAt(at - 1)}>
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={() => (last ? onClose() : setAt(at + 1))}>
              {last ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
