"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Job {
  label: string;
  run: () => Promise<void>;
}

/**
 * The finish. Each line ticks only when that part of the budget
 * is actually written, so the progress is the real work rather
 * than a timer pretending to be one.
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
        await new Promise((r) => setTimeout(r, 180));
        if (!alive) return;
      }
      onDone();
    })();

    return () => { alive = false; };
    /* runs once, the jobs close over the draft they were built with */
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.round((at / jobs.length) * 100);

  return (
    <div className="py-2">
      <h2 className="text-[22px] leading-tight font-bold tracking-[-0.028em]">
        {failed ? "Something went wrong" : "Building your budget"}
      </h2>
      <p className="mt-1.5 text-[14px] text-muted-foreground">
        {failed ? "Nothing was lost. Close this and try again." : "This takes a moment."}
      </p>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-fill-2">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        {jobs.map((j, i) => {
          const done = i < at;
          const current = i === at && !failed;
          return (
            <div
              key={j.label}
              className={cn(
                "flex items-center gap-2.5 text-[14px] transition-opacity duration-300",
                done || current ? "opacity-100" : "opacity-40",
              )}
            >
              <span
                className={cn(
                  "grid size-5 flex-none place-items-center rounded-full transition-colors",
                  done ? "bg-primary text-primary-foreground" : "bg-fill-2 text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="size-3" />
                ) : current ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : null}
              </span>
              <span className={cn(done && "text-muted-foreground")}>{j.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
