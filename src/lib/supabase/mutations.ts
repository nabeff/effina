/**
 * Writes. Each one takes domain values and returns the saved row,
 * so a caller never has to know a column name.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bill, Envelope, Goal, Settings } from "@/types/budget";

/* ---- transactions ---- */

export interface NewTransaction {
  date: string;
  direction: "in" | "out";
  amount: number;
  envelopeId?: string | null;
  billId?: string | null;
  note?: string;
  isAuto?: boolean;
}

export async function addTransaction(
  supabase: SupabaseClient,
  userId: string,
  tx: NewTransaction,
) {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      occurred_on: tx.date,
      direction: tx.direction,
      amount: Math.abs(tx.amount),
      envelope_id: tx.envelopeId ?? null,
      bill_id: tx.billId ?? null,
      note: tx.note ?? "",
      is_auto: tx.isAuto ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<NewTransaction>,
) {
  const row: Record<string, unknown> = {};
  if (patch.date !== undefined) row.occurred_on = patch.date;
  if (patch.direction !== undefined) row.direction = patch.direction;
  if (patch.amount !== undefined) row.amount = Math.abs(patch.amount);
  if (patch.envelopeId !== undefined) row.envelope_id = patch.envelopeId;
  if (patch.billId !== undefined) row.bill_id = patch.billId;
  if (patch.note !== undefined) row.note = patch.note;
  /* editing a seeded row makes it real */
  row.is_sample = false;

  const { error } = await supabase.from("transactions").update(row).eq("id", id);
  if (error) throw error;
}

export async function deleteTransaction(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

/** Ticking a bill off logs it. Unticking removes what paid it. */
export async function setBillPaid(
  supabase: SupabaseClient,
  userId: string,
  bill: Bill,
  month: string,
  paid: boolean,
  date: string,
) {
  if (!paid) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("user_id", userId)
      .eq("bill_id", bill.id)
      .gte("occurred_on", `${month}-01`)
      .lte("occurred_on", `${month}-31`);
    if (error) throw error;
    return;
  }

  await addTransaction(supabase, userId, {
    date, direction: "out", amount: bill.amount,
    billId: bill.id, note: bill.name,
  });
}

/* ---- settings ---- */

export async function updateSettings(
  supabase: SupabaseClient,
  userId: string,
  patch: Partial<Settings>,
) {
  const row: Record<string, unknown> = {};
  const map: Record<string, string> = {
    income: "income", currency: "currency", leftovers: "leftovers",
    taxRate: "tax_rate", taxPaid: "tax_paid",
    debtTotal: "debt_total", debtPaidBefore: "debt_paid_before",
    doneMonths: "done_months", accent: "accent", motion: "motion",
    glass: "glass", background: "background", radius: "radius",
    density: "density", theme: "theme", glow: "glow",
    layoutOrder: "layout_order", layoutWidths: "layout_widths",
    layoutHidden: "layout_hidden",
    onboarded: "onboarded", tourDone: "tour_done",
  };

  for (const [key, column] of Object.entries(map)) {
    const v = (patch as Record<string, unknown>)[key];
    if (v !== undefined) row[column] = v;
  }

  const { error } = await supabase
    .from("settings")
    .upsert({ user_id: userId, ...row }, { onConflict: "user_id" });
  if (error) throw error;
}

/* ---- bills, envelopes, goals ---- */

export async function upsertBill(
  supabase: SupabaseClient,
  userId: string,
  bill: Partial<Bill> & { id?: string },
) {
  const row = {
    user_id: userId,
    ...(bill.id ? { id: bill.id } : {}),
    name: bill.name ?? "",
    amount: bill.amount ?? 0,
    due_day: bill.dueDay ?? 1,
    icon: bill.icon ?? "receipt",
    hue: bill.hue ?? "teal",
    note: bill.note ?? "",
    position: bill.position ?? 0,
  };
  const { data, error } = await supabase.from("bills").upsert(row).select().single();
  if (error) throw error;
  return data;
}

export async function upsertEnvelope(
  supabase: SupabaseClient,
  userId: string,
  env: Partial<Envelope> & { id?: string },
) {
  const row = {
    user_id: userId,
    ...(env.id ? { id: env.id } : {}),
    name: env.name ?? "",
    pct: env.pct ?? 0,
    kind: env.kind ?? "spend",
    icon: env.icon ?? "circle-dashed",
    hue: env.hue ?? "green",
    note: env.note ?? "",
    position: env.position ?? 0,
  };
  const { data, error } = await supabase.from("envelopes").upsert(row).select().single();
  if (error) throw error;
  return data;
}

/**
 * Removes the envelopes setup did not just write.
 *
 * Running setup again is a person saying this is my budget now,
 * so an envelope they did not pick this time should not survive
 * from the last attempt. Names are what setup addresses an
 * envelope by, so names are what decides.
 */
export async function pruneEnvelopes(
  supabase: SupabaseClient,
  userId: string,
  keep: string[],
) {
  const query = supabase.from("envelopes").delete().eq("user_id", userId);
  /* an empty keep list means remove them all, and postgrest
     needs a value rather than an empty "in" clause */
  const { error } = keep.length
    ? await query.not("name", "in", `(${keep.map((n) => `"${n}"`).join(",")})`)
    : await query;
  if (error) throw error;
}

export async function upsertGoal(
  supabase: SupabaseClient,
  userId: string,
  goal: Partial<Goal> & { id?: string },
) {
  const row = {
    user_id: userId,
    ...(goal.id ? { id: goal.id } : {}),
    name: goal.name ?? "",
    price: goal.price ?? 0,
    saved: goal.saved ?? 0,
    share: goal.share ?? 0,
    icon: goal.icon ?? "target",
    hue: goal.hue ?? "teal",
    target_month: goal.targetMonth ?? "",
    note: goal.note ?? "",
    position: goal.position ?? 0,
  };
  const { data, error } = await supabase.from("goals").upsert(row).select().single();
  if (error) throw error;
  return data;
}

/** Soft delete, so a bill that was paid keeps its history. */
export async function archiveBill(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("bills").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function archiveEnvelope(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("envelopes").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw error;
}

/* ---- rebalance ---- */

export async function applyTransfers(
  supabase: SupabaseClient,
  userId: string,
  month: string,
  date: string,
  moves: { from: string; to: string; amount: number }[],
) {
  if (!moves.length) return;
  const { error } = await supabase.from("transfers").insert(
    moves.map((m) => ({
      user_id: userId, month, occurred_on: date,
      from_envelope: m.from, to_envelope: m.to,
      amount: m.amount, reason: "",
    })),
  );
  if (error) throw error;
}

export async function undoTransfer(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("transfers").delete().eq("id", id);
  if (error) throw error;
}

/* ---- closing a month ---- */

export async function closeMonth(
  supabase: SupabaseClient,
  userId: string,
  month: string,
  totals: {
    income: number; spent: number; saved: number;
    billTotal: number; debtPaid: number; rolled: number;
  },
  perEnvelope: { envelopeId: string; name: string; amount: number }[],
) {
  const { data, error } = await supabase
    .from("closed_months")
    .upsert(
      {
        user_id: userId, month,
        income: totals.income, spent: totals.spent, saved: totals.saved,
        bill_total: totals.billTotal, debt_paid: totals.debtPaid,
        rolled: totals.rolled,
      },
      { onConflict: "user_id,month" },
    )
    .select()
    .single();
  if (error) throw error;

  if (perEnvelope.length) {
    const { error: childError } = await supabase
      .from("closed_month_envelopes")
      .upsert(
        perEnvelope.map((p) => ({
          closed_month_id: data.id,
          envelope_id: p.envelopeId,
          envelope_name: p.name,
          amount: p.amount,
        })),
        { onConflict: "closed_month_id,envelope_name" },
      );
    if (childError) throw childError;
  }

  return data;
}

export async function reopenMonth(
  supabase: SupabaseClient,
  userId: string,
  month: string,
) {
  const { error } = await supabase
    .from("closed_months").delete().eq("user_id", userId).eq("month", month);
  if (error) throw error;
}

/**
 * Field level edits. The upserts above fill every column from
 * defaults, which is right when creating a row and destructive
 * when changing one field, so a slider drag uses these instead.
 */
export async function patchGoal(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<Goal, "name" | "price" | "saved" | "share" | "icon" | "hue" | "note" | "position">> &
    { targetMonth?: string },
) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.price !== undefined) row.price = patch.price;
  if (patch.saved !== undefined) row.saved = patch.saved;
  if (patch.share !== undefined) row.share = patch.share;
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.hue !== undefined) row.hue = patch.hue;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.targetMonth !== undefined) row.target_month = patch.targetMonth;

  const { error } = await supabase.from("goals").update(row).eq("id", id);
  if (error) throw error;
}

export async function patchEnvelope(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<Envelope, "name" | "pct" | "kind" | "icon" | "hue" | "note" | "position">>,
) {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.pct !== undefined) row.pct = patch.pct;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.icon !== undefined) row.icon = patch.icon;
  if (patch.hue !== undefined) row.hue = patch.hue;
  if (patch.note !== undefined) row.note = patch.note;
  if (patch.position !== undefined) row.position = patch.position;

  const { error } = await supabase.from("envelopes").update(row).eq("id", id);
  if (error) throw error;
}
