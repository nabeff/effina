/**
 * Goals.
 *
 * The share slider divides one pot, so a goal finishing releases
 * its share to the rest. Every date here comes from simulating
 * that month by month, never from a flat division, because a flat
 * division is wrong the moment one goal completes.
 */

import type { BudgetData, Goal, Hue } from "@/types/budget";
import { billTotal, totalPct } from "./stats";

export function goalDone(g: Goal): boolean {
  return (g.saved || 0) >= (g.price || 0) - 0.5;
}

/** The Savings envelope's share of a normal month. */
export function savingsPerMonth(data: BudgetData): number {
  const savings = data.envelopes.find(
    (e) => e.kind === "save" && e.name.toLowerCase().includes("saving"),
  );
  if (!savings) return 0;
  const flex = Math.max(0, (data.settings.income || 0) - billTotal(data));
  const tp = totalPct(data) || 1;
  return (flex * savings.pct) / tp;
}

export function goalShareTotal(data: BudgetData): number {
  return data.goals
    .filter((g) => !goalDone(g))
    .reduce((a, g) => a + (g.share || 0), 0);
}

export interface GoalState {
  price: number;
  saved: number;
  left: number;
  pct: number;
  perMonth: number;
  months: number | null;
  when: string | null;
  done: boolean;
}

export function goalState(data: BudgetData, g: Goal, now: Date = new Date()): GoalState {
  const price = g.price || 0;
  const saved = Math.min(price, g.saved || 0);
  const left = Math.max(0, price - saved);
  const pct = price > 0 ? (saved / price) * 100 : 0;

  const pool = savingsPerMonth(data);
  const total = goalShareTotal(data) || 1;
  const perMonth = goalDone(g) ? 0 : (pool * (g.share || 0)) / total;
  const months = perMonth > 0 ? Math.ceil(left / perMonth) : null;

  let when: string | null = null;
  if (months !== null && left > 0) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    when = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  return { price, saved, left, pct, perMonth, months, when, done: goalDone(g) };
}

/** Months to finish one goal if it had the whole pool to itself. */
export function goalSolo(data: BudgetData, g: Goal): number | null {
  const state = goalState(data, g);
  if (state.done) return 0;
  const pool = savingsPerMonth(data);
  return pool > 0 ? Math.ceil(state.left / pool) : null;
}

export interface TimelineSeries {
  id: string;
  name: string;
  hue: Hue;
  data: number[];
}

export interface Finished {
  id: string;
  name: string;
  hue: Hue;
  month: number;
  when: string;
}

/**
 * Month by month projection of every goal at once, accounting for
 * a finished goal handing its share back to the others.
 */
export function goalTimeline(
  data: BudgetData,
  months = 36,
  now: Date = new Date(),
): { months: number; series: TimelineSeries[]; finished: Finished[] } {
  const live = data.goals.filter((g) => !goalDone(g));
  if (!live.length) return { months, series: [], finished: [] };

  const pool = savingsPerMonth(data);
  const work = live.map((g) => ({
    id: g.id,
    name: g.name,
    hue: g.hue,
    price: g.price || 0,
    saved: Math.min(g.price || 0, g.saved || 0),
    share: g.share || 0,
    done: false,
  }));

  const series: TimelineSeries[] = work.map((w) => ({
    id: w.id, name: w.name, hue: w.hue, data: [w.saved],
  }));
  const finished: Finished[] = [];

  for (let m = 1; m <= months; m++) {
    const open = work.filter((w) => !w.done);
    const shareTotal = open.reduce((a, w) => a + w.share, 0);

    for (const w of open) {
      const cut = shareTotal > 0 ? (pool * w.share) / shareTotal : 0;
      w.saved = Math.min(w.price, w.saved + cut);
      if (w.saved >= w.price - 0.5) {
        w.done = true;
        const d = new Date(now);
        d.setMonth(d.getMonth() + m);
        finished.push({
          id: w.id, name: w.name, hue: w.hue, month: m,
          when: d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
        });
      }
    }

    for (const sr of series) {
      const w = work.find((x) => x.id === sr.id)!;
      sr.data.push(Math.round(w.saved));
    }
  }

  return { months, series, finished };
}

/** Dates that account for rollover, keyed by goal id. */
export function goalForecast(data: BudgetData, now: Date = new Date()) {
  const tl = goalTimeline(data, 120, now);
  const out: Record<string, { months: number | null; when: string | null }> = {};

  for (const g of data.goals) {
    const hit = tl.finished.find((f) => f.id === g.id);
    out[g.id] = hit
      ? { months: hit.month, when: hit.when }
      : { months: null, when: null };
  }
  return out;
}

/** How the monthly savings pool is divided right now. */
export function goalSplit(data: BudgetData) {
  const live = data.goals.filter((g) => !goalDone(g));
  const total = live.reduce((a, g) => a + (g.share || 0), 0);
  const pool = savingsPerMonth(data);
  if (!live.length || total <= 0) return [];

  return live
    .map((g) => ({
      id: g.id, name: g.name, hue: g.hue, share: g.share || 0,
      pct: ((g.share || 0) / total) * 100,
      amount: (pool * (g.share || 0)) / total,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** One sentence on whether the plan is moving at all. */
export function goalVerdict(data: BudgetData, now: Date = new Date()) {
  const live = data.goals.filter((g) => !goalDone(g));
  const pool = savingsPerMonth(data);

  if (!live.length) return { tone: "neutral" as const, text: "Nothing set yet." };
  if (pool <= 0) {
    return {
      tone: "bad" as const,
      text: "Your Savings envelope is empty, so nothing is moving toward these.",
    };
  }

  const noShare = live.filter((g) => (g.share || 0) <= 0);
  if (noShare.length === live.length) {
    return {
      tone: "bad" as const,
      text: "No goal has a share of your savings, so none of them have a date.",
    };
  }
  if (noShare.length) {
    return {
      tone: "warn" as const,
      text: `${noShare.length} goal${noShare.length === 1 ? " has" : "s have"} no share, so ${noShare.length === 1 ? "it has" : "they have"} no date.`,
    };
  }

  const tl = goalTimeline(data, 120, now);
  const last = tl.finished.length === live.length
    ? tl.finished[tl.finished.length - 1] : null;

  if (!last) {
    return {
      tone: "warn" as const,
      text: "At this rate the last one takes more than ten years.",
    };
  }

  return {
    tone: "good" as const,
    text: `Everything is paid for by ${last.when}, the last being ${last.name}.`,
  };
}
