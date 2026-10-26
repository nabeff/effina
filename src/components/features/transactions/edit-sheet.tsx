"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/ui/date-field";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useBudgetMutation } from "@/lib/hooks/use-budget";
import { updateTransaction } from "@/lib/supabase/mutations";
import { money } from "@/lib/utils/money";
import type { BudgetData, Direction, Transaction } from "@/types/budget";

/**
 * Editing a line, which is the same four fields as adding one.
 * A bill payment keeps its bill, so the envelope picker is
 * hidden rather than offering to detach it by accident.
 */
export function EditSheet({
  tx, data, open, onOpenChange,
}: {
  tx: Transaction | null;
  data: BudgetData;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const currency = data.settings.currency;

  const [direction, setDirection] = useState<Direction>("out");
  const [amount, setAmount] = useState("");
  const [envelopeId, setEnvelopeId] = useState<string>("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");

  /* Refill the fields when the sheet opens on a different line.
     Done during render off a remembered key rather than in an
     effect, so the first paint already shows the right values
     instead of the previous line's for one frame. */
  const key = open && tx ? tx.id : null;
  const [loaded, setLoaded] = useState<string | null>(null);
  if (key !== loaded) {
    setLoaded(key);
    if (tx && key) {
      setDirection(tx.direction);
      setAmount(String(tx.amount));
      setEnvelopeId(tx.envelopeId ?? "");
      setNote(tx.note);
      setDate(tx.date);
    }
  }

  const save = useBudgetMutation(
    async (args: { id: string; patch: Parameters<typeof updateTransaction>[2] }, { supabase }) => {
      await updateTransaction(supabase, args.id, args.patch);
    },
  );

  if (!tx) return null;

  const spendable = data.envelopes.filter((e) => e.kind !== "save");
  const bill = tx.billId ? data.bills.find((b) => b.id === tx.billId) : null;

  function submit() {
    if (!tx) return;
    const n = Number(amount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Enter an amount above zero");
      return;
    }

    save.mutate(
      {
        id: tx.id,
        patch: {
          date,
          direction,
          amount: n,
          note: note.trim(),
          /* a bill payment keeps its own link, everything else
             follows the picker */
          ...(bill
            ? {}
            : { envelopeId: direction === "out" ? envelopeId || null : null }),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(`Changed to ${money(n, currency)}`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that"),
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[var(--radius-xl)] px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-[560px]"
      >
        <SheetHeader className="p-0">
          <SheetTitle>Edit this line</SheetTitle>
          <SheetDescription>
            {bill ? `Paying ${bill.name}.` : "Change anything and save."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-3">
          {!bill ? (
            <div className="inline-flex gap-0.5 self-start rounded-[9px] bg-fill-2 p-0.5">
              {([
                { v: "out" as const, label: "I spent", Icon: ArrowUpRight },
                { v: "in" as const, label: "Money in", Icon: ArrowDownLeft },
              ]).map(({ v, label, Icon }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDirection(v)}
                  aria-pressed={direction === v}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors",
                    direction === v
                      ? "bg-elevated text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="editAmount">Amount</Label>
            <div className="relative">
              <Input
                id="editAmount" inputMode="decimal"
                className="pr-10 text-[19px] font-bold tracking-[-0.02em]"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-subtle-foreground">
                {currency}
              </span>
            </div>
          </div>

          {!bill && direction === "out" ? (
            <div className="space-y-1.5">
              <Label htmlFor="editEnvelope">Envelope</Label>
              <Select value={envelopeId} onValueChange={(v) => setEnvelopeId(v ?? "")}>
                <SelectTrigger id="editEnvelope">
                  <SelectValue placeholder="Pick one">
                    {(v: unknown) =>
                      spendable.find((e) => e.id === v)?.name ?? "Pick one"
                    }
                  </SelectValue>
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
            <Label htmlFor="editNote">Note</Label>
            <Input
              id="editNote" value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={direction === "in" ? "Client invoice" : "Groceries, taxi, gift"}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editDate">Date</Label>
            <DateField id="editDate" value={date} onChange={setDate} />
          </div>

          <Button onClick={submit} disabled={save.isPending} className="mt-1 h-[42px] w-full">
            {save.isPending ? "Saving" : "Save changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
