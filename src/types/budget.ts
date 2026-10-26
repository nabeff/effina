/**
 * Domain types.
 *
 * These describe the shapes the money math works on. They are
 * deliberately independent of the database rows, so a change to
 * storage does not ripple through every calculation.
 */

export type EnvelopeKind = "spend" | "save" | "debt";
export type Direction = "in" | "out";
export type Hue =
  | "green" | "teal" | "indigo" | "purple" | "pink"
  | "orange" | "yellow" | "mint" | "brown";

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  icon: string;
  hue: Hue;
  note: string;
  position: number;
}

export interface Envelope {
  id: string;
  name: string;
  pct: number;
  kind: EnvelopeKind;
  icon: string;
  hue: Hue;
  note: string;
  position: number;
}

export interface Transaction {
  id: string;
  date: string;          // YYYY-MM-DD
  direction: Direction;
  amount: number;
  envelopeId: string | null;
  billId: string | null;
  note: string;
  isSample: boolean;
  isAuto: boolean;
}

export interface Goal {
  id: string;
  name: string;
  price: number;
  saved: number;
  share: number;
  icon: string;
  hue: Hue;
  targetMonth: string;   // YYYY-MM, or empty
  note: string;
  position: number;
}

export interface Transfer {
  id: string;
  month: string;
  date: string;
  fromEnvelope: string | null;
  toEnvelope: string | null;
  amount: number;
  reason: string;
}

export interface ClosedMonth {
  id: string;
  month: string;         // YYYY-MM
  income: number;
  spent: number;
  saved: number;
  billTotal: number;
  debtPaid: number;
  rolled: number;
  perEnvelope: Record<string, number>;  // envelope id -> amount
}

export interface Settings {
  income: number;
  currency: string;
  leftovers: "save" | "roll";
  taxRate: number;
  taxPaid: Record<string, number>;      // year -> amount paid
  debtTotal: number;
  debtPaidBefore: number;
  doneMonths: Record<string, boolean>;  // month -> no more income expected
  accent: string;
  motion: string;
  glass: string;
  background: string;
  radius: string;
  density: string;
  theme: string;
  glow: string;
  layoutOrder: string[];
  layoutWidths: Record<string, number>;
  onboarded: boolean;
  tourDone: boolean;
}

/**
 * Everything the math needs, in one place. Passing this rather
 * than reaching for a global is what makes every function pure
 * and testable without a database.
 */
export interface BudgetData {
  settings: Settings;
  bills: Bill[];
  envelopes: Envelope[];
  transactions: Transaction[];
  goals: Goal[];
  transfers: Transfer[];
  closedMonths: ClosedMonth[];
}

/* ---- computed shapes, never stored ---- */

export interface BillRow extends Bill {
  planned: number;
  spent: number;
  paid: boolean;
}

export type EnvelopeStatus = "ok" | "close" | "over";

export interface EnvelopeRow extends Envelope {
  rawShare: number;
  share: number;
  moved: number;
  leanHit: number;
  planned: number;
  spent: number;
  left: number;
  pctUsed: number;
  status: EnvelopeStatus;
  capped: boolean;
}

export interface MonthStats {
  month: string;
  base: number;
  flex: number;
  billTotal: number;
  income: number;
  planned: number;
  carried: number;
  settled: boolean;
  future: boolean;
  closed: boolean;
  lean: boolean;
  leanGap: number;
  spent: number;
  saved: number;
  leftToSpend: number;
  billRows: BillRow[];
  envRows: EnvelopeRow[];
  billsPaid: number;
  spentFlex: number;
  inSavePots: number;
  daysLeft: number;
  daysTotal: number;
  perDay: number;
  over: EnvelopeRow[];
  unassigned: number;
  transactions: Transaction[];
}

export interface SplitPart {
  key: string;
  name: string;
  amount: number;
  hue: Hue | "muted";
}

export type Tone = "good" | "warn" | "bad" | "neutral";

export interface PaceState {
  label: string;
  tone: Tone;
  through: number;
  used: number;
  gap: number;
}
