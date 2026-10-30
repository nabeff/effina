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
import { archiveEnvelope, patchEnvelope, upsertEnvelope } from "@/lib/supabase/mutations";
import { money0 } from "@/lib/utils/money";
import type { Envelope, EnvelopeKind } from "@/types/budget";

const num = (s: string) => Number(s.replace(/[^\d.-]/g, ""));

const KINDS: { value: EnvelopeKind; label: string; hint: string }[] = [
  { value: "spend", label: "Spend", hint: "Money you are going to use this month" },
  { value: "save", label: "Save", hint: "Money you are putting away" },
  { value: "debt", label: "Pay back", hint: "Money owed to someone" },
];

/**
 * Editing an envelope by amount, not by percent.
 *
 * Shares are what the engine stores, because a share scales with
 * whatever actually arrived. But nobody thinks in shares, so the
 * field asks for dirhams and the percent is worked out from the
 * money left after bills.
 */
export function EnvelopeSheet({
  envelope, flex, currency, open, onOpenChange,
}: {
  /** null when adding a new one */
  envelope: Envelope | null;
  /** what is left after bills, which the share is a share of */
  flex: number;
  currency: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<EnvelopeKind>("spend");

  const key = open ? (envelope?.id ?? "new") : null;
  const [loaded, setLoaded] = useState<string | null>(null);
  if (key !== loaded) {
    setLoaded(key);
    if (key) {
      setName(envelope?.name ?? "");
      setAmount(
        envelope && flex > 0 ? String(Math.round((envelope.pct / 100) * flex)) : "",
      );
      setKind(envelope?.kind ?? "spend");
    }
  }

  const save = useBudgetMutation(
    async (
      patch: Partial<Envelope> & { id?: string },
      { userId, supabase },
    ) => {
      if (patch.id) await patchEnvelope(supabase, patch.id, patch);
      else await upsertEnvelope(supabase, userId, patch);
    },
  );

  const remove = useBudgetMutation(async (id: string, { supabase }) => {
    await archiveEnvelope(supabase, id);
  });

  const a = num(amount);
  const pct = flex > 0 && Number.isFinite(a) ? Math.round((a / flex) * 1000) / 10 : 0;

  function submit() {
    if (!name.trim()) return toast.error("Give it a name");
    if (!Number.isFinite(a) || a <= 0) return toast.error("Enter how much goes in");
    if (flex <= 0) return toast.error("Set your income and bills first");

    save.mutate(
      {
        id: envelope?.id,
        name: name.trim(),
        pct,
        kind,
        icon: envelope?.icon ?? "circle-dashed",
        hue: envelope?.hue ?? "green",
        position: envelope?.position ?? 0,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(envelope ? `${name.trim()} saved` : `${name.trim()} added`);
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
          <SheetTitle>{envelope ? `Edit ${envelope.name}` : "New envelope"}</SheetTitle>
          <SheetDescription>
            Envelopes divide the {money0(flex)} {currency} left after bills.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="envName">What is it for</Label>
            <Input
              id="envName" placeholder="Food, savings, going out"
              value={name} onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="envAmount">How much a month</Label>
            <div className="relative">
              <Input
                id="envAmount" inputMode="decimal" placeholder="0"
                className="pr-10"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold text-subtle-foreground">
                {currency}
              </span>
            </div>
            <p className="text-xs text-subtle-foreground tabular">
              {pct > 0
                ? `${pct}% of what is left after bills, so it grows and shrinks with your income`
                : "A share of what is left after bills"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>What kind</Label>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  aria-pressed={kind === k.value}
                  className={`h-[38px] rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors ${
                    kind === k.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-fill-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-subtle-foreground">
              {KINDS.find((k) => k.value === kind)?.hint}
            </p>
          </div>

          <Button onClick={submit} disabled={save.isPending} className="mt-1 h-[42px] w-full">
            {save.isPending ? "Saving" : envelope ? "Save" : "Add envelope"}
          </Button>

          {envelope ? (
            <Button
              variant="ghost"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(envelope.id, {
                  onSuccess: () => {
                    onOpenChange(false);
                    toast.success(`${envelope.name} removed`);
                  },
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : "Could not remove that"),
                })
              }
              className="h-[38px] w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Remove this envelope
            </Button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
