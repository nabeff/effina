"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TxForm } from "@/components/features/transactions/tx-form";
import { TxRow } from "@/components/features/transactions/tx-row";
import { EditSheet } from "@/components/features/transactions/edit-sheet";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useBudgetMutation, useMonth } from "@/lib/hooks/use-budget";
import { deleteTransaction } from "@/lib/supabase/mutations";
import { monthName } from "@/lib/budget";
import { money } from "@/lib/utils/money";
import type { Transaction } from "@/types/budget";

export default function LogPage() {
  const mounted = useMounted();

  const { data, stats: st, isLoading } = useMonth(mounted ? undefined : SKIP);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Transaction | null>(null);

  const remove = useBudgetMutation(async (id: string, { supabase }) => {
    await deleteTransaction(supabase, id);
  });

  const rows = useMemo(() => {
    if (!st || !data) return [];
    const q = search.trim().toLowerCase();

    return st.transactions
      .filter((t) => {
        if (filter === "in" && t.direction !== "in") return false;
        if (filter.startsWith("env:") && t.envelopeId !== filter.slice(4)) return false;
        if (filter.startsWith("bill:") && t.billId !== filter.slice(5)) return false;
        if (!q) return true;

        const envelope = data.envelopes.find((e) => e.id === t.envelopeId)?.name ?? "";
        const bill = data.bills.find((b) => b.id === t.billId)?.name ?? "";
        return `${t.note} ${envelope} ${bill}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [st, data, search, filter]);

  if (!mounted || isLoading || !data || !st) {
    return <Skeleton className="h-[320px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;

  return (
    <>
      <Section
        title="Add a line"
        sub="Amount first, so it takes a few seconds on your phone."
      >
        <TxForm data={data} />
      </Section>

      <Section
        title={monthName(st.month, true)}
        sub={`In ${money(st.income, currency)}, out ${money(st.spent, currency)}, difference ${money(st.income - st.spent, currency)}`}
        pad={false}
        tools={
          <>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle-foreground" />
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-[140px] rounded-[9px] pl-8 text-sm"
              />
            </div>
            <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
              <SelectTrigger className="h-8 w-[148px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in">Income only</SelectItem>
                {data.envelopes.map((e) => (
                  <SelectItem key={e.id} value={`env:${e.id}`}>{e.name}</SelectItem>
                ))}
                {data.bills.map((b) => (
                  <SelectItem key={b.id} value={`bill:${b.id}`}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      >
        {rows.length ? (
          <div className="flex flex-col divide-y divide-border-soft">
            {rows.map((t) => (
              <TxRow
                key={t.id}
                tx={t}
                data={data}
                onEdit={() => setEditing(t)}
                onDelete={async () => {
                  try {
                    await remove.mutateAsync(t.id);
                    toast.success(`Deleted ${money(t.amount, currency)}`);
                  } catch {
                    toast.error("Could not delete that.");
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-[15px] font-semibold">Nothing here yet</p>
            <p className="mx-auto mt-1 max-w-[40ch] text-[13.5px] text-muted-foreground">
              {search || filter !== "all"
                ? "No lines match that search."
                : `Add your first line for ${monthName(st.month, true)}.`}
            </p>
          </div>
        )}
      </Section>

      <EditSheet
        tx={editing}
        data={data}
        open={editing !== null}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
      />
    </>
  );
}
