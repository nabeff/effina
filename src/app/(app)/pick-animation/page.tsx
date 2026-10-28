"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DividingStream } from "@/components/features/onboarding/dividing-stream";
import { DividingRadar } from "@/components/features/onboarding/dividing-radar";
import { DividingRing } from "@/components/features/onboarding/dividing-ring";
import { DividingCoins } from "@/components/features/onboarding/dividing-coins";
import { Dividing } from "@/components/features/onboarding/dividing";
import type { Draft } from "@/lib/budget";

/**
 * A page for choosing the setup animation.
 *
 * Temporary. It exists so the three can be watched side by side
 * with a figure that is actually yours, instead of being judged
 * from a still.
 */

const OPTIONS = [
  { id: "radar", name: "The shape", note: "One arm per area, like a player's attributes" },
  { id: "stream", name: "One, the stream", note: "The month is one bar that comes apart" },
  { id: "ring", name: "Two, the ring", note: "The dashboard ring draws itself" },
  { id: "coins", name: "Three, the coins", note: "Coins fall and stack in glass jars" },
  { id: "boxes", name: "Current, the boxes", note: "What is in the app right now" },
];

export default function PickAnimation() {
  const [income, setIncome] = useState(22000);
  const [which, setWhich] = useState("radar");
  const [run, setRun] = useState(0);

  const draft: Draft = {
    currency: "DH",
    income,
    bills: [],
    picks: [],
    split: [
      { name: "Food", pct: 28, kind: "spend", icon: "shopping-cart", hue: "green" },
      { name: "The future", pct: 24, kind: "save", icon: "piggy-bank", hue: "mint" },
      { name: "People", pct: 18, kind: "spend", icon: "users", hue: "purple" },
      { name: "Getting around", pct: 16, kind: "spend", icon: "car", hue: "teal" },
      { name: "Your own time", pct: 14, kind: "spend", icon: "party-popper", hue: "yellow" },
    ],
    debtName: "", debtTotal: 0, debtPaid: 0, goalName: "", goalPrice: 0,
  };

  const replay = (id: string) => {
    setWhich(id);
    setRun((r) => r + 1);
  };

  return (
    <div className="mx-auto max-w-[760px] px-4 py-8">
      <h1 className="text-[22px] font-bold tracking-[-0.025em]">
        Pick the setup animation
      </h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        Press one to watch it. Nothing here is saved.
      </p>

      <div className="mt-5 flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="pa-income">Money to divide</Label>
          <Input
            id="pa-income"
            inputMode="numeric"
            value={income || ""}
            onChange={(e) => setIncome(Number(e.target.value.replace(/\D/g, "")) || 0)}
            className="w-[160px]"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <Button
            key={o.id}
            variant={which === o.id ? "default" : "secondary"}
            onClick={() => replay(o.id)}
            className="h-auto flex-col items-start gap-0.5 px-3.5 py-2.5 text-left"
          >
            <span className="text-[13px] font-semibold">{o.name}</span>
            <span className="text-[11.5px] opacity-70">{o.note}</span>
          </Button>
        ))}
      </div>

      <div className="mt-6 min-h-[460px] rounded-[var(--radius-lg)] border border-border-soft bg-black px-4 py-6">
        {which === "radar" ? (
          <DividingRadar key={`d${run}`} draft={draft} onDone={() => {}} />
        ) : which === "stream" ? (
          <DividingStream key={`s${run}`} draft={draft} onDone={() => {}} />
        ) : which === "ring" ? (
          <DividingRing key={`r${run}`} draft={draft} onDone={() => {}} />
        ) : which === "coins" ? (
          <DividingCoins key={`c${run}`} draft={draft} onDone={() => {}} />
        ) : (
          <Dividing key={`b${run}`} draft={draft} onDone={() => {}} />
        )}
      </div>

      <Button onClick={() => setRun((r) => r + 1)} className="mt-4">
        Replay this one
      </Button>
    </div>
  );
}
