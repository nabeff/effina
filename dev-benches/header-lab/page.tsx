"use client";

import { TopBar } from "@/components/layout/top-bar";

/* The real header with no session, so the island can be opened
   and closed against real content. Speed is set from the
   console with window.__islandSlow, or with the buttons. */

const SPEEDS = [1, 5, 20, 60];

export default function HeaderLab() {
  return (
    <div className="min-h-dvh bg-background">
      <TopBar />

      <main className="mx-auto w-full max-w-[1460px] px-5 pt-6">
        <h1 className="text-[28px] font-bold tracking-[-0.03em]">
          Good afternoon, Nabil
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          October 2026, 4 days left
        </p>

        <section className="mt-6">
          <h2 className="mb-2 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            Speed
          </h2>
          <div className="flex flex-wrap gap-2">
            {SPEEDS.map((n) => (
              <button
                key={n}
                onClick={() => {
                  (window as unknown as { __islandSlow?: number }).__islandSlow = n;
                }}
                className="rounded-full bg-card px-3.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {n === 1 ? "Normal" : `${n} times slower`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Pick a speed, then click the island. At 60 times, one close takes
            about half a minute.
          </p>
        </section>

        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] rounded-[var(--radius)] border border-hairline bg-card"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
