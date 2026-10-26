"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { Choices, SettingRow } from "@/components/features/setup/setting-row";
import { SKIP, useBudgetMutation, useMonth } from "@/lib/hooks/use-budget";
import { updateSettings } from "@/lib/supabase/mutations";
import { createClient } from "@/lib/supabase/client";
import { billTotal, totalPct } from "@/lib/budget";
import { money } from "@/lib/utils/money";
import type { Settings } from "@/types/budget";

const accents = [
  { value: "green", label: "Green", color: "#30d158" },
  { value: "violet", label: "Violet", color: "#8c64ff" },
  { value: "teal", label: "Teal", color: "#32bedc" },
  { value: "pink", label: "Pink", color: "#ff5c8a" },
  { value: "orange", label: "Orange", color: "#ff9f0a" },
  { value: "white", label: "White", color: "#e8e8ea" },
];

const themes = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

const radii = [
  { value: "round", label: "Round" },
  { value: "soft", label: "Soft" },
  { value: "sharp", label: "Sharp" },
];

const leftovers = [
  { value: "save" as const, label: "Move to savings" },
  { value: "roll" as const, label: "Roll into next month" },
];

export default function SetupPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, stats: st } = useMonth(mounted ? undefined : SKIP);
  const [incomeDraft, setIncomeDraft] = useState("");
  const [taxDraft, setTaxDraft] = useState("");
  const [debtDraft, setDebtDraft] = useState("");

  const save = useBudgetMutation(
    async (patch: Partial<Settings>, { userId, supabase }) => {
      await updateSettings(supabase, userId, patch);
    },
  );

  if (!mounted || !data || !st) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const s = data.settings;
  const currency = s.currency;
  const bills = billTotal(data);
  const pct = totalPct(data);
  const flex = Math.max(0, s.income - bills);

  const set = (patch: Partial<Settings>, note?: string) =>
    save.mutate(patch, {
      onSuccess: () => { if (note) toast.success(note); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that"),
    });

  const saveNumber = (
    raw: string,
    clear: () => void,
    build: (n: number) => Partial<Settings>,
    note: string,
  ) => {
    const n = Number(raw.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      toast.error("That is not a number");
      return;
    }
    save.mutate(build(n), {
      onSuccess: () => { clear(); toast.success(note); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that"),
    });
  };

  return (
    <>
      <Section
        title="Income"
        sub="Used to plan a month before any invoice lands."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="income">Expected each month</Label>
            <Input
              id="income" inputMode="decimal" className="mt-1.5"
              placeholder={String(s.income)}
              value={incomeDraft}
              onChange={(e) => setIncomeDraft(e.target.value)}
            />
          </div>
          <Button
            disabled={save.isPending || incomeDraft.trim() === ""}
            onClick={() =>
              saveNumber(incomeDraft, () => setIncomeDraft(""),
                (n) => ({ income: n }), "Income saved")
            }
          >
            Save
          </Button>
        </div>
        <p className="mt-3 border-t border-border-soft pt-3 text-[13px] text-muted-foreground">
          Bills take <b className="font-semibold text-foreground">{money(bills, currency)}</b>,
          which leaves <b className="font-semibold text-foreground">{money(flex, currency)}</b>{" "}
          to split between envelopes.
        </p>
      </Section>

      <Section
        title="The split"
        sub={`Percent of the ${money(flex, currency)} left after bills.`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[14.5px]">
            {data.envelopes.length} envelope{data.envelopes.length === 1 ? "" : "s"}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-[13px] font-semibold tabular"
            style={{
              background: Math.abs(pct - 100) < 0.5
                ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                : "color-mix(in srgb, var(--warning) 15%, transparent)",
              color: Math.abs(pct - 100) < 0.5 ? "var(--primary)" : "var(--warning)",
            }}
          >
            {Math.round(pct * 10) / 10}%
          </span>
        </div>
        <p className="mt-3 border-t border-border-soft pt-3 text-[13px] text-muted-foreground">
          {Math.abs(pct - 100) < 0.5
            ? "The split adds up, so every dirham has a home."
            : pct < 100
              ? `${money((flex * (100 - pct)) / 100, currency)} a month has no envelope.`
              : `The split claims ${money((flex * (pct - 100)) / 100, currency)} more than you have.`}
          {" "}Percentages are edited on the Envelopes screen.
        </p>
      </Section>

      <Section title="Tax and debt" sub="What the reserve aims at, and what you owe.">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
            <Label htmlFor="taxRate">Tax rate, percent</Label>
            <Input
              id="taxRate" inputMode="decimal" className="mt-1.5"
              placeholder={String(s.taxRate)}
              value={taxDraft}
              onChange={(e) => setTaxDraft(e.target.value)}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <Label htmlFor="debtTotal">Total you owe</Label>
            <Input
              id="debtTotal" inputMode="decimal" className="mt-1.5"
              placeholder={String(s.debtTotal)}
              value={debtDraft}
              onChange={(e) => setDebtDraft(e.target.value)}
            />
          </div>
          <Button
            disabled={save.isPending || (taxDraft.trim() === "" && debtDraft.trim() === "")}
            onClick={() => {
              const patch: Partial<Settings> = {};
              if (taxDraft.trim() !== "") patch.taxRate = Number(taxDraft.replace(/[^\d.-]/g, ""));
              if (debtDraft.trim() !== "") patch.debtTotal = Number(debtDraft.replace(/[^\d.-]/g, ""));
              if (Object.values(patch).some((v) => !Number.isFinite(v as number))) {
                toast.error("That is not a number");
                return;
              }
              save.mutate(patch, {
                onSuccess: () => {
                  setTaxDraft(""); setDebtDraft("");
                  toast.success("Saved");
                },
              });
            }}
          >
            Save
          </Button>
        </div>
      </Section>

      <Section
        title="At the end of a month"
        sub="What happens to whatever is left in your spending envelopes."
      >
        <Choices
          value={s.leftovers}
          options={leftovers}
          onChange={(v) => set({ leftovers: v }, v === "save" ? "Leftovers go to savings" : "Leftovers roll over")}
        />
      </Section>

      <Section title="Appearance" sub="Changes apply straight away.">
        <div className="divide-y divide-border-soft">
          <SettingRow label="Accent colour" hint="Used for every positive figure and control.">
            <Choices
              swatch
              value={s.accent || "green"}
              options={accents}
              onChange={(v) => set({ accent: v })}
            />
          </SettingRow>
          <SettingRow label="Theme" hint="System follows your device.">
            <Choices
              value={s.theme || "dark"}
              options={themes}
              onChange={(v) => set({ theme: v })}
            />
          </SettingRow>
          <SettingRow label="Corners">
            <Choices
              value={s.radius || "round"}
              options={radii}
              onChange={(v) => set({ radius: v })}
            />
          </SettingRow>
        </div>
      </Section>

      <Section title="Help">
        <div className="divide-y divide-border-soft">
          <SettingRow label="Run setup again" hint="Walks through income, bills and the split.">
            <Button
              variant="secondary"
              onClick={() => set({ onboarded: false }, "Setup will run next time you open the app")}
            >
              <Wand2 className="size-4" />
              Run again
            </Button>
          </SettingRow>
          <SettingRow label="Replay the tour" hint="Points out what each screen is for.">
            <Button variant="secondary" onClick={() => set({ tourDone: false }, "The tour will play again")}>
              Replay
            </Button>
          </SettingRow>
        </div>
      </Section>

      <Section
        title="Your account"
        sub="Your data is saved to your account, so it is on every device you sign in to."
      >
        <SettingRow label="Sign out" hint="You can sign back in at any time.">
          <Button
            variant="secondary"
            onClick={async () => {
              await createClient().auth.signOut();
              router.push("/sign-in");
            }}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </SettingRow>
      </Section>
    </>
  );
}
