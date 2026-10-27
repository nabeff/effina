/**
 * The home page layout.
 *
 * Order, width and which widgets are on at all, saved to the
 * account rather than the browser, so the dashboard looks the
 * same on the phone as on the desktop.
 */

export interface DashCard {
  id: string;
  name: string;
  /** what it tells you, shown in the add panel */
  hint: string;
  /** columns out of 12 at the default */
  width: number;
  /** off until the user adds it */
  optional?: boolean;
}

export const DASH_CARDS: DashCard[] = [
  { id: "hero",     name: "Free to spend",   hint: "The headline figure and today's pace", width: 12 },
  { id: "ring",     name: "Budget ring",     hint: "Every envelope as one ring, with the amounts", width: 8 },
  { id: "balance",  name: "Total balance",   hint: "What is left across everything", width: 4 },
  { id: "split",    name: "Where it sits",   hint: "Your income divided into where it went", width: 12 },
  { id: "totals",   name: "In, spent, kept", hint: "The three figures, against last month", width: 12 },
  { id: "win",      name: "Next win",        hint: "The nearest finish line", width: 6 },
  { id: "recent",   name: "Recently",        hint: "The last few spends, each with a repeat", width: 6 },
  { id: "bills",    name: "Upcoming bills",  hint: "What is due in the next two weeks", width: 6 },
  { id: "envelopes", name: "Envelopes",      hint: "Every envelope and what is left in it", width: 6 },
  { id: "goals",    name: "Goals",           hint: "How each goal is coming along", width: 6 },
  { id: "allowance", name: "Daily allowance", hint: "What today is worth, and what is gone", width: 6 },
  { id: "rate",     name: "Savings rate",    hint: "The share of your income you keep", width: 6 },
  { id: "strip",    name: "The last 30 days", hint: "A block per day, shaded by spending", width: 12 },
  { id: "pace",     name: "Spending pace",   hint: "This month against an even pace", width: 12 },
  { id: "category", name: "Spending by envelope", hint: "Where the money actually went", width: 6 },
  { id: "flow",     name: "Cash flow",       hint: "In against out, month by month", width: 6 },
  { id: "insights", name: "Insights",        hint: "This week against last, and this month against the one before", width: 6 },
  { id: "rebalance", name: "Rebalance",      hint: "What to move when an envelope goes over", width: 6, optional: true },
  { id: "trio",     name: "Bills, debt and tax", hint: "The three commitments in one card", width: 12, optional: true },
];

export interface Layout {
  order: string[];
  widths: Record<string, number>;
  /** ids deliberately switched off */
  hidden: string[];
}

export function defaultLayout(): Layout {
  return {
    order: DASH_CARDS.map((c) => c.id),
    /* snapped, so a card declared at a width that is not an
       allowed step cannot make the default disagree with itself */
    widths: Object.fromEntries(DASH_CARDS.map((c) => [c.id, clampWidth(c.width)])),
    hidden: DASH_CARDS.filter((c) => c.optional).map((c) => c.id),
  };
}

/**
 * A card added in a later version appears at its default position
 * rather than vanishing because an old saved layout never
 * mentioned it. A card since removed is dropped.
 */
export function readLayout(
  savedOrder: string[] | undefined,
  savedWidths: Record<string, number> | undefined,
  savedHidden?: string[],
): Layout {
  const known = DASH_CARDS.map((c) => c.id);
  const order = (savedOrder ?? []).filter((id) => known.includes(id));
  const fresh = !savedOrder?.length;

  for (const [i, id] of known.entries()) {
    if (!order.includes(id)) {
      /* slot it where it sits by default, not on the end */
      order.splice(Math.min(i, order.length), 0, id);
    }
  }

  const widths: Record<string, number> = {};
  for (const c of DASH_CARDS) {
    const w = savedWidths?.[c.id];
    widths[c.id] = clampWidth(typeof w === "number" ? w : c.width);
  }

  /* on a first run the optional cards start off. Afterwards the
     saved list is the truth, including an empty one. */
  const hidden = savedHidden
    ? savedHidden.filter((id) => known.includes(id))
    : fresh
      ? DASH_CARDS.filter((c) => c.optional).map((c) => c.id)
      : [];

  return { order, widths, hidden };
}

/** Thirds, halves, two thirds, full. Narrower stops being readable. */
export const WIDTHS = [4, 6, 8, 12] as const;
export type Width = (typeof WIDTHS)[number];

export function clampWidth(w: number): Width {
  if (!Number.isFinite(w)) return 12;
  /* snap to the nearest allowed step rather than refusing a value */
  return WIDTHS.reduce<Width>(
    (best, step) => (Math.abs(step - w) < Math.abs(best - w) ? step : best),
    12,
  );
}

export function nextWidth(w: number): Width {
  const i = WIDTHS.indexOf(clampWidth(w));
  return WIDTHS[(i + 1) % WIDTHS.length];
}

export function moveCard(order: string[], id: string, by: number): string[] {
  const from = order.indexOf(id);
  if (from < 0) return order;
  const to = Math.max(0, Math.min(order.length - 1, from + by));
  if (to === from) return order;

  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** Drag drops a card onto another one, so the move is absolute. */
export function reorder(order: string[], from: string, to: string): string[] {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0 || a === b) return order;

  const next = [...order];
  next.splice(a, 1);
  next.splice(b, 0, from);
  return next;
}

export function isDefault(l: Layout): boolean {
  const d = defaultLayout();
  if (l.order.join() !== d.order.join()) return false;
  if ([...l.hidden].sort().join() !== [...d.hidden].sort().join()) return false;
  return DASH_CARDS.every((c) => l.widths[c.id] === d.widths[c.id]);
}
