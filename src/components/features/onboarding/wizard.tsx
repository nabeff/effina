"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BuildScreen, type Job } from "./build-screen";
import { Spotlight } from "./spotlight";
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
  /* which way the next card should come from */
  const [back, setBack] = useState(false);
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
    <div className="fixed inset-0 z-50 isolate flex flex-col overflow-y-auto bg-background">
      <Spotlight />

      {/* the mark top left, so the screen is signed even with the
          spotlight closed around the cursor */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
        <span className="grid size-9 place-items-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
          NE
        </span>
        {!building ? (
          <button
            onClick={skip}
            className="text-[13px] text-subtle-foreground transition-colors hover:text-muted-foreground"
          >
            Skip for now
          </button>
        ) : null}
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-[520px]">
          {building ? (
            <BuildScreen
              jobs={jobs}
              onDone={onClose}
              onError={(m) => toast.error(m)}
            />
          ) : (
            <>
              <div className="mb-8 flex gap-1.5">
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

              {/* one card at a time, sliding the way you are going */}
              <div className="relative">
                <AnimatePresence mode="wait" custom={back} initial={false}>
                  <motion.div
                    key={step}
                    custom={back}
                    initial={{ x: back ? -40 : 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: back ? 40 : -40, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <Step draft={draft} set={set} />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex items-center gap-2">
                {step > 0 ? (
                  <Button
                    variant="ghost"
                    onClick={() => { setBack(true); setStep(step - 1); }}
                  >
                    <ChevronLeft className="size-4" />
                    Back
                  </Button>
                ) : null}
                <Button
                  size="lg"
                  className="ml-auto min-w-[150px]"
                  onClick={() => {
                    if (last) return setBuilding(true);
                    setBack(false);
                    setStep(step + 1);
                  }}
                >
                  {last ? "Open the dashboard" : "Continue"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
