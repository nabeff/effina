"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Confetti } from "./confetti";
import { draftBillTotal, draftFlex, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";
import { MARK_BLOCKS } from "@/components/ui/mark";

const EASE = [0.32, 0.72, 0, 1] as const;

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
  jobs, draft, onDone, onError,
}: {
  jobs: Job[];
  draft: Draft;
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

      /* the mark closes and the screen holds. Opening the
         dashboard straight away would waste the one moment in
         the whole app where the work is actually finished. */
      setSealed(true);
    })();

    return () => { alive = false; };
    /* runs once, the jobs close over the draft they were built with */
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const done = at / jobs.length;
  /* the blocks land across the run, so the last one coincides
     with the last job rather than arriving early */
  const landed = Math.floor(done * BLOCKS.length);

  return (
    <div className="relative flex flex-col items-center py-4 text-center">
      <Confetti run={sealed && !failed} />

      <motion.div
        className="relative mb-8 size-[132px]"
        animate={sealed ? { scale: [1, 1.07, 1] } : { scale: 1 }}
        transition={{ duration: 0.8, ease: EASE, times: [0, 0.35, 1] }}
      >
        <svg viewBox="0 0 64 64" className="size-full">
          {/* where each block is going, held very faintly so the
              mark has somewhere to land without looking like a
              thing that failed to load */}
          {BLOCKS.map((b, i) => (
            <rect
              key={`ghost-${i}`}
              x={b.x} y={b.y} width={b.w} height={b.h} rx={3}
              fill={`var(--hue-${b.hue})`}
              opacity={0.1}
            />
          ))}

          {/* each block arrives from the edge it belongs to, so
              the mark assembles rather than flashing into place */}
          {BLOCKS.map((b, i) =>
            i < landed || sealed ? (
              <motion.rect
                key={`block-${i}`}
                x={b.x} y={b.y} width={b.w} height={b.h} rx={3}
                fill={`var(--hue-${b.hue})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.5,
                  ease: [0.22, 0.9, 0.24, 1],
                  delay: sealed ? i * 0.07 : 0,
                }}
              />
            ) : null,
          )}
        </svg>

      </motion.div>

      <h2 className="text-[22px] leading-tight font-bold tracking-[-0.028em]">
        {failed
          ? "Something went wrong"
          : sealed
            ? "Your month is ready"
            : "Building your budget"}
      </h2>
      <p className="mt-1.5 text-[14px] text-muted-foreground">
        {failed
          ? "Nothing was lost. Close this and try again."
          : sealed
            ? "Everything is in place. Nothing here is permanent."
            : "This takes a moment."}
      </p>

      {sealed && !failed ? (
        <Summary draft={draft} onDone={onDone} />
      ) : (
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
      )}
    </div>
  );
}

/**
 * What the answers added up to.
 *
 * The last screen should hand something back rather than just
 * saying it finished, so it reads out the month it built, in the
 * order somebody would check it.
 */
function Summary({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const unit = draft.currency || "DH";
  const bills = draftBillTotal(draft);
  const flex = draftFlex(draft);

  const rows: [string, string][] = [
    ["Coming in", money(draft.income, unit)],
    ...(bills > 0
      ? ([["Bills", money(bills, unit)]] as [string, string][])
      : []),
    ["To divide", money(flex, unit)],
    [
      draft.split.length === 1 ? "Envelope" : "Envelopes",
      String(draft.split.length),
    ],
    ...(draft.goalName.trim() && draft.goalPrice > 0
      ? ([["Saving for", draft.goalName.trim()]] as [string, string][])
      : []),
  ];

  return (
    <div className="mt-7 w-full max-w-[320px]">
      <motion.div
        className="flex flex-col divide-y divide-border-soft rounded-[var(--radius-md)] bg-fill-2 px-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1], delay: 0.25 }}
      >
        {rows.map(([label, value], i) => (
          <motion.div
            key={label}
            className="flex items-center justify-between py-2.5 text-[13.5px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 + i * 0.07 }}
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold tabular">{value}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 + rows.length * 0.07 }}
      >
        <Button size="lg" onClick={onDone} className="mt-5 w-full">
          Open my dashboard
        </Button>
      </motion.div>
    </div>
  );
}
