"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useBudgetMutation } from "@/lib/hooks/use-budget";
import { addTransaction } from "@/lib/supabase/mutations";
import { todayISO } from "@/lib/budget";
import type { BudgetData } from "@/types/budget";

const schema = z.object({
  amount: z.coerce.number().positive("Enter an amount above zero."),
  envelopeId: z.string().optional(),
  note: z.string().optional(),
  date: z.string().min(1),
});

type Values = z.input<typeof schema>;

/** Amount first, so it takes a few seconds on a phone. */
export function TxForm({ data }: { data: BudgetData }) {
  const [direction, setDirection] = useState<"in" | "out">("out");

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "" as unknown as number, note: "", date: todayISO() },
  });

  const mutation = useBudgetMutation(
    async (values: Values & { direction: "in" | "out" }, { userId, supabase }) => {
      await addTransaction(supabase, userId, {
        date: values.date,
        direction: values.direction,
        amount: Number(values.amount),
        envelopeId: values.direction === "out" ? values.envelopeId ?? null : null,
        note: values.note ?? "",
      });
    },
  );

  const spendable = data.envelopes.filter((e) => e.kind !== "save");

  async function onSubmit(values: Values) {
    try {
      await mutation.mutateAsync({ ...values, direction });
      const amount = Number(values.amount).toLocaleString("en-US");
      toast.success(
        direction === "in"
          ? `Added ${amount} ${data.settings.currency}`
          : `${amount} ${data.settings.currency} logged`,
      );
      form.reset({ amount: "" as unknown as number, note: "", date: todayISO() });
    } catch {
      toast.error("Could not save that. Your budget is safe.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="mb-4 inline-flex gap-0.5 rounded-[9px] bg-fill-2 p-0.5">
        {([
          { v: "out", label: "I spent", Icon: ArrowUpRight },
          { v: "in", label: "Money in", Icon: ArrowDownLeft },
        ] as const).map(({ v, label, Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => setDirection(v)}
            aria-pressed={direction === v}
            className={cn(
              "flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors",
              direction === v ? "bg-elevated text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <div className="relative">
            <Input
              id="amount" type="number" min={0} step="any" inputMode="decimal"
              placeholder="0"
              className="pr-10 text-[19px] font-bold tracking-[-0.02em]"
              {...form.register("amount")}
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-subtle-foreground">
              {data.settings.currency}
            </span>
          </div>
        </div>

        {direction === "out" ? (
          <div className="space-y-1.5">
            <Label htmlFor="envelope">Envelope</Label>
            <Select
              value={form.watch("envelopeId") ?? ""}
              onValueChange={(v) => form.setValue("envelopeId", v ?? undefined)}
            >
              <SelectTrigger id="envelope">
                <SelectValue placeholder="Pick one" />
              </SelectTrigger>
              <SelectContent>
                {spendable.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="note">Note</Label>
          <Input
            id="note"
            placeholder={direction === "in" ? "Client invoice" : "Groceries, taxi, gift"}
            {...form.register("note")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...form.register("date")} />
        </div>

        <div className="flex items-end">
          <Button type="submit" disabled={mutation.isPending} className="h-[42px] w-full sm:w-auto">
            <Plus className="size-4" />
            {direction === "in" ? "Add income" : "Add expense"}
          </Button>
        </div>
      </div>

      {form.formState.errors.amount ? (
        <p className="mt-2 text-[13px] text-destructive">
          {form.formState.errors.amount.message}
        </p>
      ) : null}
    </form>
  );
}
