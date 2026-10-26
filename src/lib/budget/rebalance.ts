/**
 * Rebalancing.
 *
 * The donor order is fixed and deliberate. Fun money is the most
 * discretionary, savings is a last resort, and tax and debt are
 * never donors at all, because that money is owed to someone.
 */

import type { BudgetData, MonthStats, EnvelopeRow } from "@/types/budget";

/**
 * Lower donates first. Rank 9 never donates.
 *
 * Matching is on whole words, not substrings. "Emergency fund"
 * contains the letters of "fun", and a substring test ranked the
 * emergency fund as the first envelope to raid, which is the exact
 * opposite of the intended order.
 */
function hasWord(name: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(name);
}

export function donorRank(r: EnvelopeRow): number {
  const name = r.name.toLowerCase();

  /* protected first, so nothing below can claim them */
  if (r.kind === "debt" || hasWord(name, "tax")) return 9;
  if (hasWord(name, "emergency")) return 4;

  if (hasWord(name, "fun") && !hasWord(name, "fund")) return 0;
  if (hasWord(name, "girlfriend")) return 1;
  if (r.kind === "spend") return 2;
  if (r.kind === "save" && hasWord(name, "savings")) return 5;
  return 9;  /* anything else is left alone */
}

export interface Move {
  from: EnvelopeRow | null;
  to: EnvelopeRow;
  amount: number;
}

export function planMoves(st: MonthStats): {
  moves: Move[];
  over: EnvelopeRow[];
  pool: number;
} {
  const over = st.envRows.filter((r) => r.status === "over");
  if (!over.length) return { moves: [], over: [], pool: 0 };

  const donors = st.envRows
    .filter((r) => donorRank(r) < 9 && r.left > 0.5)
    .sort((a, b) => donorRank(a) - donorRank(b))
    .map((r) => ({ row: r, available: r.left }));

  const pool = donors.reduce((a, d) => a + d.available, 0);
  const moves: Move[] = [];

  for (const target of over) {
    let need = -target.left;

    for (const donor of donors) {
      if (need <= 0.5) break;
      if (donor.available <= 0.5) continue;
      if (donor.row.id === target.id) continue;

      const take = Math.min(donor.available, need);
      donor.available -= take;
      need -= take;
      moves.push({ from: donor.row, to: target, amount: take });
    }

    /* nothing left to take from, say so rather than pretending */
    if (need > 0.5) {
      moves.push({ from: null, to: target, amount: need });
    }
  }

  return { moves, over, pool };
}

/** Bills are a known amount on a known day, so they log themselves. */
export function billsDue(
  data: BudgetData,
  st: MonthStats,
  month: string,
  now: Date = new Date(),
): { billId: string; amount: number; date: string }[] {
  if (st.closed || st.future) return [];

  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dayNow = month === cur ? now.getDate() : st.daysTotal;

  return st.billRows
    .filter((b) => !b.paid && b.amount > 0 && Math.min(b.dueDay, st.daysTotal) <= dayNow)
    .map((b) => {
      const day = Math.min(Math.max(1, b.dueDay), st.daysTotal);
      const [y, m] = month.split("-").map(Number);
      const d = new Date(y, m - 1, day);
      return {
        billId: b.id,
        amount: b.amount,
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      };
    });
}
