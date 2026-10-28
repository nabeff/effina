"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dividing } from "@/components/features/onboarding/dividing";
import { BuildScreen, type Job } from "@/components/features/onboarding/build-screen";
import type { Draft } from "@/lib/budget";

/* a page for watching the two setup beats without running setup */

const draft: Draft = {
  currency: "DH", income: 22000,
  bills: [{ name: "Rent", amount: 3500, dueDay: 1, icon: "house", hue: "indigo" }],
  picks: [],
  split: [
    { name: "Food", pct: 28, kind: "spend", icon: "shopping-cart", hue: "green" },
    { name: "The future", pct: 24, kind: "save", icon: "piggy-bank", hue: "mint" },
    { name: "People", pct: 18, kind: "spend", icon: "users", hue: "purple" },
    { name: "Getting around", pct: 16, kind: "spend", icon: "car", hue: "teal" },
    { name: "Your own time", pct: 14, kind: "spend", icon: "party-popper", hue: "yellow" },
  ],
  debtName: "", debtTotal: 0, debtPaid: 0,
  goalName: "A trip home", goalPrice: 9000,
};

const jobs: Job[] = [
  "Saving your income", "Setting up your bills", "Building your envelopes",
  "Adding what you owe", "Working out your goal", "Opening your dashboard",
].map((label) => ({ label, run: () => new Promise<void>((r) => setTimeout(r, 260)) }));

export default function Preview() {
  const [which, setWhich] = useState<"shape" | "finish">("shape");
  const [run, setRun] = useState(0);

  const play = (w: "shape" | "finish") => {
    setWhich(w);
    setRun((r) => r + 1);
  };

  return (
    <div className="mx-auto max-w-[700px] px-4 py-8">
      <h1 className="text-[22px] font-bold tracking-[-0.025em]">The two setup beats</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        Press one to watch it. Nothing here is saved.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant={which === "shape" ? "default" : "secondary"}
          onClick={() => play("shape")}
          className="h-auto flex-col items-start gap-0.5 px-3.5 py-2.5 text-left"
        >
          <span className="text-[13px] font-semibold">After step 3</span>
          <span className="text-[11.5px] opacity-70">The shape of your month</span>
        </Button>
        <Button
          variant={which === "finish" ? "default" : "secondary"}
          onClick={() => play("finish")}
          className="h-auto flex-col items-start gap-0.5 px-3.5 py-2.5 text-left"
        >
          <span className="text-[13px] font-semibold">The finish</span>
          <span className="text-[11.5px] opacity-70">Checks, then your month</span>
        </Button>
      </div>

      <div className="mt-6 min-h-[560px] rounded-[var(--radius-lg)] border border-border-soft bg-black px-4 py-6">
        {which === "shape" ? (
          <Dividing key={`s${run}`} draft={draft} onDone={() => {}} />
        ) : (
          <BuildScreen
            key={`f${run}`}
            jobs={jobs}
            draft={draft}
            onDone={() => {}}
            onError={() => {}}
          />
        )}
      </div>

      <Button onClick={() => setRun((r) => r + 1)} className="mt-4">
        Replay this one
      </Button>
    </div>
  );
}
