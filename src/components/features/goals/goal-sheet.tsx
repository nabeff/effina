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
import { Choices } from "@/components/features/setup/setting-row";
import { useBudgetMutation } from "@/lib/hooks/use-budget";
import { deleteGoal, patchGoal, upsertGoal } from "@/lib/supabase/mutations";
import { money } from "@/lib/utils/money";
import type { Goal, Hue } from "@/types/budget";

const hues: { value: Hue; label: string; color: string }[] = [
  { value: "green", label: "Green", color: "var(--hue-green)" },
  { value: "teal", label: "Teal", color: "var(--hue-teal)" },
  { value: "indigo", label: "Indigo", color: "var(--hue-indigo)" },
  { value: "purple", label: "Purple", color: "var(--hue-purple)" },
  { value: "pink", label: "Pink", color: "var(--hue-pink)" },
  { value: "orange", label: "Orange", color: "var(--hue-orange)" },
  { value: "yellow", label: "Yellow", color: "var(--hue-yellow)" },
  { value: "mint", label: "Mint", color: "var(--hue-mint)" },
  { value: "brown", label: "Brown", color: "var(--hue-brown)" },
];

const num = (s: string) => Number(s.replace(/[^\d.-]/g, ""));

/**
 * One sheet for all three jobs, because they are the same form.
 * Adding money is editing the saved figure, and a separate screen
 * for it would only be the same fields with one hidden.
 */
export function GoalSheet({
  goal, mode, currency, open, onOpenChange,
}: {
  /** null when adding a new one */
  goal: Goal | null;
  mode: "edit" | "add-money";
  currency: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saved, setSaved] = useState("");
  const [topUp, setTopUp] = useState("");
  const [hue, setHue] = useState<Hue>("teal");

  /* Refill when the sheet opens on a different goal. Done during
     render off a remembered key rather than in an effect, so the
     first paint already shows the right values instead of the
     previous goal's for one frame. */
  const key = open ? `${mode}:${goal?.id ?? "new"}` : null;
  const [loaded, setLoaded] = useState<string | null>(null);
  if (key !== loaded) {
    setLoaded(key);
    if (key) {
      setName(goal?.name ?? "");
      setPrice(goal ? String(goal.price) : "");
      setSaved(goal ? String(goal.saved) : "");
      setTopUp("");
      setHue(goal?.hue ?? "teal");
    }
  }

  const save = useBudgetMutation(
    async (
      args: { id?: string; patch: Partial<Goal> },
      { userId, supabase },
    ) => {
      if (args.id) await patchGoal(supabase, args.id, args.patch);
      else await upsertGoal(supabase, userId, args.patch);
    },
  );

  const remove = useBudgetMutation(async (id: string, { supabase }) => {
    await deleteGoal(supabase, id);
  });

  const addingMoney = mode === "add-money" && goal !== null;

  function submit() {
    if (addingMoney) {
      const amount = num(topUp);
      if (!Number.isFinite(amount) || amount <= 0) {
        toast.error("Enter an amount above zero");
        return;
      }
      const next = Math.min(goal.price, goal.saved + amount);
      save.mutate(
        { id: goal.id, patch: { saved: next } },
        {
          onSuccess: () => {
            onOpenChange(false);
            toast.success(
              next >= goal.price - 0.5
                ? `${goal.name} is fully saved`
                : `${money(amount, currency)} added to ${goal.name}`,
            );
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that"),
        },
      );
      return;
    }

    const p = num(price);
    const s = saved.trim() === "" ? 0 : num(saved);
    if (!name.trim()) {
      toast.error("Give it a name");
      return;
    }
    if (!Number.isFinite(p) || p <= 0) {
      toast.error("Enter what it costs");
      return;
    }
    if (!Number.isFinite(s) || s < 0) {
      toast.error("That is not an amount");
      return;
    }

    save.mutate(
      {
        id: goal?.id,
        patch: {
          name: name.trim(),
          price: p,
          saved: Math.min(p, s),
          hue,
          ...(goal ? {} : { share: 0, icon: "target", position: 0 }),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(goal ? `${name.trim()} saved` : `${name.trim()} added`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that"),
      },
    );
  }

  const title = addingMoney
    ? `Add to ${goal.name}`
    : goal
      ? `Edit ${goal.name}`
      : "New goal";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[var(--radius-xl)] px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:mx-auto sm:max-w-[560px]"
      >
        <SheetHeader className="p-0">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {addingMoney
              ? `${money(goal.saved, currency)} of ${money(goal.price, currency)} so far.`
              : "What you want, and what it costs."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-3">
          {addingMoney ? (
            <div className="space-y-1.5">
              <Label htmlFor="topUp">Amount to add</Label>
              <div className="relative">
                <Input
                  id="topUp" inputMode="decimal" autoFocus placeholder="0"
                  className="pr-10 text-[19px] font-bold tracking-[-0.02em]"
                  value={topUp}
                  onChange={(e) => setTopUp(e.target.value)}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-subtle-foreground">
                  {currency}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="goalName">What is it</Label>
                <Input
                  id="goalName" placeholder="Car, camera, a trip"
                  value={name} onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="goalPrice">What it costs</Label>
                  <Input
                    id="goalPrice" inputMode="decimal" placeholder="0"
                    value={price} onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goalSaved">Already put aside</Label>
                  <Input
                    id="goalSaved" inputMode="decimal" placeholder="0"
                    value={saved} onChange={(e) => setSaved(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Colour</Label>
                <Choices swatch value={hue} options={hues} onChange={setHue} />
              </div>
            </>
          )}

          <Button onClick={submit} disabled={save.isPending} className="mt-1 h-[42px] w-full">
            {save.isPending ? "Saving" : addingMoney ? "Add it" : goal ? "Save" : "Add goal"}
          </Button>

          {goal && !addingMoney ? (
            <Button
              variant="ghost"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(goal.id, {
                  onSuccess: () => {
                    onOpenChange(false);
                    toast.success(`${goal.name} deleted`);
                  },
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : "Could not delete that"),
                })
              }
              className="h-[38px] w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete this goal
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
