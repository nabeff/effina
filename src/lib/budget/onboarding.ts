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
  /** the item ids a person ticked, which the split is worked out from */
  picks: string[];
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

/**
 * Every envelope the platform can set up, with the share it
 * takes when it is on.
 *
 * These are categories anybody recognises. The old list carried
 * one person's actual life in it, which is fine for one person
 * and wrong for a product.
 *
 * `core` ones are on by default because almost everyone has
 * them, and their shares sum to 100 on their own. The rest are
 * offered and start off, so adding one rebalances the others.
 */
export interface EnvelopeOption extends DraftEnvelope {
  id: string;
  core?: boolean;
  /** what it covers, for the people who have not met envelopes */
  hint: string;
}

export const ENVELOPE_OPTIONS: EnvelopeOption[] = [
  { id: "essentials", name: "Food and essentials", pct: 30, kind: "spend", icon: "shopping-cart", hue: "indigo", core: true, hint: "Groceries, household, the everyday" },
  { id: "savings", name: "Savings", pct: 25, kind: "save", icon: "piggy-bank", hue: "green", core: true, hint: "What you are putting away" },
  { id: "emergency", name: "Emergency fund", pct: 15, kind: "save", icon: "shield-check", hue: "mint", core: true, hint: "The months you do not see coming" },
  { id: "transport", name: "Transport", pct: 15, kind: "spend", icon: "car", hue: "teal", core: true, hint: "Fuel, fares, the car" },
  { id: "personal", name: "Personal", pct: 15, kind: "spend", icon: "party-popper", hue: "yellow", core: true, hint: "Yours to spend without thinking" },
  { id: "health", name: "Health and insurance", pct: 8, kind: "spend", icon: "heart-pulse", hue: "pink", hint: "Cover, medicine, appointments" },
  { id: "work", name: "Work and tools", pct: 8, kind: "spend", icon: "briefcase", hue: "orange", hint: "Software, gear, anything the job needs" },
  { id: "family", name: "Family", pct: 10, kind: "spend", icon: "users", hue: "purple", hint: "People you look after or give to" },
  { id: "learning", name: "Learning", pct: 6, kind: "spend", icon: "graduation-cap", hue: "teal", hint: "Courses, books, anything you are getting better at" },
  { id: "tax", name: "Tax", pct: 12, kind: "save", icon: "percent", hue: "brown", hint: "Set aside before it is owed" },
  { id: "debt", name: "Paying someone back", pct: 10, kind: "debt", icon: "heart-handshake", hue: "purple", hint: "A loan, a card, money owed to a person" },
];

/** What a new account starts with, before anything is chosen. */
export function recommendedSplit(): DraftEnvelope[] {
  return ENVELOPE_OPTIONS.filter((e) => e.core).map(
    ({ name, pct, kind, icon, hue }) => ({ name, pct, kind, icon, hue }),
  );
}

export function emptyDraft(currency = "DH"): Draft {
  return {
    currency,
    income: 0,
    bills: [],
    picks: [],
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
