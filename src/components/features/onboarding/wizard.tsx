"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BuildScreen, type Job } from "./build-screen";
import { STEPS } from "./steps";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { BUDGET_KEY } from "@/lib/hooks/use-budget";
import {
  updateSettings, upsertBill, upsertEnvelope, upsertGoal,
} from "@/lib/supabase/mutations";
import { emptyDraft, type Draft } from "@/lib/budget";

/**
 * Seven steps that edit a draft, then one screen that writes it.
 * Nothing reaches the database until the last step, so backing
 * out halfway leaves the real budget exactly as it was.
 */
export function Wizard({
  currency = "DH", onClose,
}: {
  currency?: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(currency));
  const client = useQueryClient();

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const Step = STEPS[step];
  const last = step === STEPS.length - 1;

  const jobs: Job[] = useMemo(() => {
    const supabase = createClient();
    const uid = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      return user.id;
    };

    return [
      {
        label: "Saving your income",
        run: async () => {
          await updateSettings(supabase, await uid(), {
            income: draft.income,
            currency: draft.currency || "DH",
          });
        },
      },
      {
        label: "Setting up your bills",
        run: async () => {
          const userId = await uid();
          const real = draft.bills.filter((b) => b.name.trim());
          for (let i = 0; i < real.length; i++) {
            const b = real[i];
            await upsertBill(supabase, userId, {
              name: b.name.trim(), amount: b.amount, dueDay: b.dueDay,
              icon: b.icon, hue: b.hue, position: i,
            });
          }
        },
      },
      {
        label: "Building your envelopes",
        run: async () => {
          const userId = await uid();
          for (let i = 0; i < draft.split.length; i++) {
            const e = draft.split[i];
            /* the debt envelope takes the name of whoever is owed */
            const name =
              e.kind === "debt" && draft.debtName.trim()
                ? `${draft.debtName.trim()} debt`
                : e.name;
            await upsertEnvelope(supabase, userId, {
              name, pct: e.pct, kind: e.kind,
              icon: e.icon, hue: e.hue, position: i,
            });
          }
        },
      },
      {
        label: "Adding what you owe",
        run: async () => {
          if (draft.debtTotal <= 0) return;
          await updateSettings(supabase, await uid(), {
            debtTotal: draft.debtTotal,
            debtPaidBefore: Math.min(draft.debtTotal, draft.debtPaid),
          });
        },
      },
      {
        label: "Working out your goal",
        run: async () => {
          if (!draft.goalName.trim() || draft.goalPrice <= 0) return;
          await upsertGoal(supabase, await uid(), {
            name: draft.goalName.trim(),
            price: draft.goalPrice,
            saved: 0,
            share: 100,
            icon: "target",
            hue: "teal",
            position: 0,
          });
        },
      },
      {
        label: "Opening your dashboard",
        run: async () => {
          await updateSettings(supabase, await uid(), { onboarded: true });
          await client.invalidateQueries({ queryKey: BUDGET_KEY });
        },
      },
    ];
  }, [draft, client]);

  async function skip() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await updateSettings(supabase, user.id, { onboarded: true });
      await client.invalidateQueries({ queryKey: BUDGET_KEY });
    } catch {
      /* skipping should never block the way out */
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-background/80 p-4 backdrop-blur-xl">
      <div className="glass w-full max-w-[520px] rounded-[var(--radius-xl)] p-6 sm:p-7">
        {building ? (
          <BuildScreen
            jobs={jobs}
            onDone={onClose}
            onError={(m) => toast.error(m)}
          />
        ) : (
          <>
            <div className="mb-6 flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    i < step ? "bg-primary/45" : i === step ? "bg-primary" : "bg-fill-2",
                  )}
                />
              ))}
            </div>

            <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-300">
              <Step draft={draft} set={set} />
            </div>

            <div className="mt-7 flex items-center gap-2">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="size-4" />
                  Back
                </Button>
              ) : null}
              <Button
                className="ml-auto min-w-[136px]"
                onClick={() => (last ? setBuilding(true) : setStep(step + 1))}
              >
                {last ? "Open the dashboard" : "Continue"}
              </Button>
            </div>

            <button
              onClick={skip}
              className="mx-auto mt-4 block text-[13px] text-subtle-foreground transition-colors hover:text-muted-foreground"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
