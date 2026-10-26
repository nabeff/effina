/**
 * The setup draft.
 *
 * Nothing here touches the database. The wizard edits a plain
 * object and only writes at the end, so backing out halfway
 * leaves the real budget exactly as it was.
 */

import type { Hue } from "@/types/budget";

export interface DraftBill {
  name: string;
  amount: number;
  dueDay: number;
  icon: string;
  hue: Hue;
}

export interface DraftEnvelope {
  name: string;
  pct: number;
  kind: "spend" | "save" | "debt";
  icon: string;
  hue: Hue;
}

export interface Draft {
  currency: string;
  income: number;
  bills: DraftBill[];
  split: DraftEnvelope[];
  debtName: string;
  debtTotal: number;
  debtPaid: number;
  goalName: string;
  goalPrice: number;
}

export const BILL_PRESETS: DraftBill[] = [
  { name: "Rent", amount: 0, dueDay: 1, icon: "house", hue: "indigo" },
  { name: "Loan", amount: 0, dueDay: 2, icon: "landmark", hue: "pink" },
  { name: "Internet", amount: 0, dueDay: 5, icon: "router", hue: "teal" },
  { name: "Phone", amount: 0, dueDay: 8, icon: "smartphone", hue: "orange" },
  { name: "Gym", amount: 0, dueDay: 10, icon: "dumbbell", hue: "green" },
  { name: "Subscriptions", amount: 0, dueDay: 12, icon: "audio-lines", hue: "mint" },
];

/** The same nine envelopes the app ships with, at their set shares. */
export function recommendedSplit(): DraftEnvelope[] {
  return [
    { name: "Food & daily life", pct: 16, kind: "spend", icon: "shopping-cart", hue: "indigo" },
    { name: "Savings", pct: 20, kind: "save", icon: "piggy-bank", hue: "green" },
    { name: "Business & tools", pct: 7, kind: "spend", icon: "briefcase", hue: "orange" },
    { name: "Transport", pct: 6, kind: "spend", icon: "car", hue: "teal" },
    { name: "Girlfriend", pct: 10, kind: "spend", icon: "gift", hue: "pink" },
    { name: "Emergency fund", pct: 12, kind: "save", icon: "shield-check", hue: "mint" },
    { name: "Dad debt", pct: 11, kind: "debt", icon: "heart-handshake", hue: "purple" },
    { name: "Fun money", pct: 8, kind: "spend", icon: "party-popper", hue: "yellow" },
    { name: "Tax reserve", pct: 10, kind: "save", icon: "percent", hue: "brown" },
  ];
}

export function emptyDraft(currency = "DH"): Draft {
  return {
    currency,
    income: 0,
    bills: [],
    split: recommendedSplit(),
    debtName: "",
    debtTotal: 0,
    debtPaid: 0,
    goalName: "",
    goalPrice: 0,
  };
}

export function draftBillTotal(d: Draft): number {
  return d.bills.reduce((a, b) => a + (Number(b.amount) || 0), 0);
}

export function draftFlex(d: Draft): number {
  return Math.max(0, d.income - draftBillTotal(d));
}

export function draftSplitTotal(d: Draft): number {
  return Math.round(d.split.reduce((a, e) => a + (Number(e.pct) || 0), 0) * 10) / 10;
}

/**
 * Nudges the shares to land on exactly 100, giving the whole
 * remainder to the largest one so no envelope changes by more
 * than it has to.
 */
export function makeHundred(split: DraftEnvelope[]): DraftEnvelope[] {
  const total = split.reduce((a, e) => a + (Number(e.pct) || 0), 0);
  if (!split.length || Math.abs(total - 100) < 0.05) return split;

  if (total === 0) {
    const even = Math.floor((100 / split.length) * 10) / 10;
    const out = split.map((e) => ({ ...e, pct: even }));
    out[0].pct = Math.round((100 - even * (split.length - 1)) * 10) / 10;
    return out;
  }

  const scaled = split.map((e) => ({
    ...e,
    pct: Math.round(((Number(e.pct) || 0) / total) * 1000) / 10,
  }));
  const after = scaled.reduce((a, e) => a + e.pct, 0);
  const drift = Math.round((100 - after) * 10) / 10;

  let biggest = 0;
  scaled.forEach((e, i) => { if (e.pct > scaled[biggest].pct) biggest = i; });
  scaled[biggest].pct = Math.round((scaled[biggest].pct + drift) * 10) / 10;

  return scaled;
}
