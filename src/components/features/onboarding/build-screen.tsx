"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MARK_BLOCKS } from "@/components/ui/mark";

export interface Job {
  label: string;
  run: () => Promise<void>;
}

/* the blocks of the mark, in the order they land. These are the
   mark's own rectangles, so the shape that assembles here is the
   logo rather than something close to it. */
const BLOCKS = MARK_BLOCKS;

/**
 * The finish.
 *
 * Each line ticks only when that part of the budget is actually
 * written, so the progress is the real work rather than a timer
 * pretending to be one. The mark assembles alongside it, one
 * block at a time, so the thing being built is visible.
 */
export function BuildScreen({
  jobs, onDone, onError,
}: {
  jobs: Job[];
  onDone: () => void;
  onError: (message: string) => void;
}) {
  const [at, setAt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      for (let i = 0; i < jobs.length; i++) {
        try {
          await jobs[i].run();
        } catch (e) {
          if (!alive) return;
          setFailed(true);
          onError(e instanceof Error ? e.message : "Setup could not finish");
          return;
        }
        if (!alive) return;
        setAt(i + 1);
        /* a beat between ticks, so the list reads rather than flashes */
        await new Promise((r) => setTimeout(r, 220));
        if (!alive) return;
      }

      /* the mark closes, then the dashboard opens. Finishing on a
         spinner would waste the one moment the work is done. */
      setSealed(true);
      await new Promise((r) => setTimeout(r, 1100));
      if (alive) onDone();
    })();

    return () => { alive = false; };
    /* runs once, the jobs close over the draft they were built with */
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const done = at / jobs.length;
  /* the blocks land across the run, so the last one coincides
     with the last job rather than arriving early */
  const landed = Math.floor(done * BLOCKS.length);

  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="relative mb-8 size-[132px]">
        <svg viewBox="0 0 64 64" className="size-full">
          {/* where each block is going, so the shape is readable
              before it is finished */}
          {BLOCKS.map((b, i) => (
            <rect
              key={`ghost-${i}`}
              x={b.x} y={b.y} width={b.w} height={b.h} rx={3}
              fill="none"
              stroke="currentColor"
              strokeWidth={0.8}
              strokeDasharray="2 2"
              className="text-subtle-foreground"
            />
          ))}

          {BLOCKS.map((b, i) =>
            i < landed || sealed ? (
              <motion.rect
                key={`block-${i}`}
                x={b.x} y={b.y} width={b.w} height={b.h} rx={3}
                fill="currentColor"
                className="text-primary"
                initial={{ opacity: 0, scale: 0.72 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "spring", stiffness: 420, damping: 26,
                  delay: sealed ? i * 0.06 : 0,
                }}
                style={{ transformOrigin: `${b.x + b.w / 2}px ${b.y + b.h / 2}px` }}
              />
            ) : null,
          )}
        </svg>

        {/* one pulse when the shape is whole */}
        <AnimatePresence>
          {sealed ? (
            <motion.div
              initial={{ opacity: 0.5, scale: 0.9 }}
              animate={{ opacity: 0, scale: 1.45 }}
              transition={{ duration: 0.9, ease: [0.25, 0.8, 0.3, 1] }}
              className="pointer-events-none absolute inset-0 rounded-[26%] bg-primary/25 blur-xl"
            />
          ) : null}
        </AnimatePresence>
      </div>

      <h2 className="text-[22px] leading-tight font-bold tracking-[-0.028em]">
        {failed
          ? "Something went wrong"
          : sealed
            ? "Your month is set"
            : "Building your budget"}
      </h2>
      <p className="mt-1.5 text-[14px] text-muted-foreground">
        {failed
          ? "Nothing was lost. Close this and try again."
          : sealed
            ? "Opening your dashboard"
            : "This takes a moment."}
      </p>

      <div className="mt-7 flex w-full max-w-[320px] flex-col gap-2.5 text-left">
        {jobs.map((j, i) => {
          const ticked = i < at;
          const current = i === at && !failed && !sealed;
          return (
            <motion.div
              key={j.label}
              animate={{ opacity: ticked || current ? 1 : 0.35 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2.5 text-[13.5px]"
            >
              <span
                className={cn(
                  "grid size-[18px] flex-none place-items-center rounded-full transition-colors",
                  ticked ? "bg-primary text-primary-foreground" : "bg-fill-2",
                )}
              >
                {ticked ? (
                  <Check className="size-2.5" strokeWidth={3.5} />
                ) : current ? (
                  <motion.span
                    className="size-1.5 rounded-full bg-muted-foreground"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                  />
                ) : null}
              </span>
              <span className={cn(ticked && "text-muted-foreground")}>
                {j.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
