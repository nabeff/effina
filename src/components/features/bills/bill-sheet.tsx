"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useBudgetMutation } from "@/lib/hooks/use-budget";
import { archiveBill, upsertBill } from "@/lib/supabase/mutations";
import { ordinal } from "@/lib/utils/money";
import type { Bill } from "@/types/budget";

const num = (s: string) => Number(s.replace(/[^\d.-]/g, ""));

export function BillSheet({
  bill, currency, open, onOpenChange,
}: {
  /** null when adding a new one */
  bill: Bill | null;
  currency: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");

  /* refilled during render off a remembered key, so the first
     paint already shows the right bill */
  const key = open ? (bill?.id ?? "new") : null;
  const [loaded, setLoaded] = useState<string | null>(null);
  if (key !== loaded) {
    setLoaded(key);
    if (key) {
      setName(bill?.name ?? "");
      setAmount(bill ? String(bill.amount) : "");
      setDueDay(bill ? String(bill.dueDay) : "1");
    }
  }

  const save = useBudgetMutation(
    async (patch: Partial<Bill> & { id?: string }, { userId, supabase }) => {
      await upsertBill(supabase, userId, patch);
    },
  );

  const remove = useBudgetMutation(async (id: string, { supabase }) => {
    await archiveBill(supabase, id);
  });

  function submit() {
    const a = num(amount);
    const d = num(dueDay);

    if (!name.trim()) return toast.error("Give it a name");
    if (!Number.isFinite(a) || a <= 0) return toast.error("Enter what it costs");
    if (!Number.isFinite(d) || d < 1 || d > 31) {
      return toast.error("The due day is between 1 and 31");
    }

    save.mutate(
      {
        id: bill?.id,
        name: name.trim(),
        amount: a,
        dueDay: Math.round(d),
        icon: bill?.icon ?? "receipt",
        hue: bill?.hue ?? "teal",
        position: bill?.position ?? 0,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(bill ? `${name.trim()} saved` : `${name.trim()} added`);
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
          <SheetTitle>{bill ? `Edit ${bill.name}` : "New bill"}</SheetTitle>
          <SheetDescription>
            Bills come out before anything is divided.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="billName">What is it</Label>
            <Input
              id="billName" placeholder="Rent, internet, the gym"
              value={name} onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="billAmount">How much</Label>
              <div className="relative">
                <Input
                  id="billAmount" inputMode="decimal" placeholder="0"
                  className="pr-10"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold text-subtle-foreground">
                  {currency}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billDay">Day of the month</Label>
              <Input
                id="billDay" inputMode="numeric" placeholder="1"
                value={dueDay} onChange={(e) => setDueDay(e.target.value)}
              />
              <p className="text-xs text-subtle-foreground">
                Due the {ordinal(Math.min(31, Math.max(1, Math.round(num(dueDay)) || 1)))}
              </p>
            </div>
          </div>

          <Button onClick={submit} disabled={save.isPending} className="mt-1 h-[42px] w-full">
            {save.isPending ? "Saving" : bill ? "Save" : "Add bill"}
          </Button>

          {bill ? (
            <Button
              variant="ghost"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(bill.id, {
                  onSuccess: () => {
                    onOpenChange(false);
                    toast.success(`${bill.name} removed`);
                  },
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : "Could not remove that"),
                })
              }
              className="h-[38px] w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Remove this bill
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
