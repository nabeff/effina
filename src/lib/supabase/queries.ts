/**
 * Reads. Every row comes back shaped as a domain type, so the
 * database column names never leak into the math or the UI.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BudgetData, Bill, Envelope, Transaction, Goal, Transfer,
  ClosedMonth, Settings, Hue, EnvelopeKind, Direction,
} from "@/types/budget";

type Row = Record<string, unknown>;

const num = (v: unknown, fallback = 0) =>
  v === null || v === undefined ? fallback : Number(v);

function toBill(r: Row): Bill {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    amount: num(r.amount),
    dueDay: num(r.due_day, 1),
    icon: String(r.icon ?? "receipt"),
    hue: (r.hue ?? "teal") as Hue,
    note: String(r.note ?? ""),
    position: num(r.position),
  };
}

function toEnvelope(r: Row): Envelope {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    pct: num(r.pct),
    kind: (r.kind ?? "spend") as EnvelopeKind,
    icon: String(r.icon ?? "circle-dashed"),
    hue: (r.hue ?? "green") as Hue,
    note: String(r.note ?? ""),
    position: num(r.position),
  };
}

function toTransaction(r: Row): Transaction {
  return {
    id: String(r.id),
    date: String(r.occurred_on),
    direction: (r.direction ?? "out") as Direction,
    amount: num(r.amount),
    envelopeId: r.envelope_id ? String(r.envelope_id) : null,
    billId: r.bill_id ? String(r.bill_id) : null,
    note: String(r.note ?? ""),
    isSample: !!r.is_sample,
    isAuto: !!r.is_auto,
  };
}

function toGoal(r: Row): Goal {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    price: num(r.price),
    saved: num(r.saved),
    share: num(r.share),
    icon: String(r.icon ?? "target"),
    hue: (r.hue ?? "teal") as Hue,
    targetMonth: String(r.target_month ?? ""),
    note: String(r.note ?? ""),
    position: num(r.position),
  };
}

function toTransfer(r: Row): Transfer {
  return {
    id: String(r.id),
    month: String(r.month ?? ""),
    date: String(r.occurred_on),
    fromEnvelope: r.from_envelope ? String(r.from_envelope) : null,
    toEnvelope: r.to_envelope ? String(r.to_envelope) : null,
    amount: num(r.amount),
    reason: String(r.reason ?? ""),
  };
}

function toSettings(r: Row | null): Settings {
  return {
    income: num(r?.income),
    currency: String(r?.currency ?? "DH"),
    leftovers: (r?.leftovers ?? "save") as "save" | "roll",
    taxRate: num(r?.tax_rate, 10),
    taxPaid: (r?.tax_paid as Record<string, number>) ?? {},
    debtTotal: num(r?.debt_total),
    debtPaidBefore: num(r?.debt_paid_before),
    doneMonths: (r?.done_months as Record<string, boolean>) ?? {},
    accent: String(r?.accent ?? "green"),
    motion: String(r?.motion ?? "full"),
    glass: String(r?.glass ?? "medium"),
    background: String(r?.background ?? "glow"),
    radius: String(r?.radius ?? "round"),
    density: String(r?.density ?? "comfy"),
    theme: String(r?.theme ?? "dark"),
    glow: String(r?.glow ?? "green"),
    layoutOrder: (r?.layout_order as string[]) ?? [],
    layoutWidths: (r?.layout_widths as Record<string, number>) ?? {},
    layoutHidden: (r?.layout_hidden as string[]) ?? [],
    onboarded: !!r?.onboarded,
    tourDone: !!r?.tour_done,
  };
}

/**
 * The whole budget in one round trip.
 *
 * It looks like a lot, but every screen needs the envelopes and
 * the settings anyway, and a month of transactions is tens of
 * rows rather than thousands. Fetching it together is what lets
 * the math stay pure and synchronous.
 */
export async function fetchBudget(
  supabase: SupabaseClient,
  userId: string,
): Promise<BudgetData> {
  const [settings, bills, envelopes, transactions, goals, transfers, closed] =
    await Promise.all([
      supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("bills").select("*").eq("user_id", userId).is("archived_at", null).order("position"),
      supabase.from("envelopes").select("*").eq("user_id", userId).is("archived_at", null).order("position"),
      supabase.from("transactions").select("*").eq("user_id", userId).order("occurred_on", { ascending: false }),
      supabase.from("goals").select("*").eq("user_id", userId).order("position"),
      supabase.from("transfers").select("*").eq("user_id", userId),
      supabase.from("closed_months").select("*, closed_month_envelopes(*)").eq("user_id", userId).order("month"),
    ]);

  const closedMonths: ClosedMonth[] = (closed.data ?? []).map((r: Row) => {
    const children = (r.closed_month_envelopes as Row[] | null) ?? [];
    const perEnvelope: Record<string, number> = {};
    for (const c of children) {
      const key = c.envelope_id ? String(c.envelope_id) : String(c.envelope_name);
      perEnvelope[key] = num(c.amount);
    }
    return {
      id: String(r.id),
      month: String(r.month),
      income: num(r.income),
      spent: num(r.spent),
      saved: num(r.saved),
      billTotal: num(r.bill_total),
      debtPaid: num(r.debt_paid),
      rolled: num(r.rolled),
      perEnvelope,
    };
  });

  return {
    settings: toSettings(settings.data as Row | null),
    bills: (bills.data ?? []).map(toBill),
    envelopes: (envelopes.data ?? []).map(toEnvelope),
    transactions: (transactions.data ?? []).map(toTransaction),
    goals: (goals.data ?? []).map(toGoal),
    transfers: (transfers.data ?? []).map(toTransfer),
    closedMonths,
  };
}
