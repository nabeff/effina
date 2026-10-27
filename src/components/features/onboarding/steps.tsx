"use client";

import {
  AudioLines, Briefcase, Car, CheckCheck, Dumbbell, Gift, HeartHandshake,
  House, Landmark, Lightbulb, Minus, PartyPopper, Percent, PiggyBank,
  Plus, Receipt, Router, ShieldCheck, ShoppingCart, Smartphone, Sparkles,
  Target, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  BILL_PRESETS, draftBillTotal, draftFlex, draftSplitTotal, makeHundred,
  type Draft, type DraftBill,
} from "@/lib/budget";
import { money, money0 } from "@/lib/utils/money";

const icons: Record<string, LucideIcon> = {
  house: House, landmark: Landmark, router: Router, smartphone: Smartphone,
  dumbbell: Dumbbell, "audio-lines": AudioLines, receipt: Receipt,
  "shopping-cart": ShoppingCart, "piggy-bank": PiggyBank, briefcase: Briefcase,
  car: Car, gift: Gift, "shield-check": ShieldCheck,
  "heart-handshake": HeartHandshake, "party-popper": PartyPopper, percent: Percent,
};

export interface StepProps {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
}

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[26px] leading-tight font-bold tracking-[-0.03em] text-balance">
        {title}
      </h2>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground text-pretty">
        {sub}
      </p>
    </div>
  );
}

function Tip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="mt-6 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-fill-2 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
      <Icon className="mt-px size-4 flex-none" />
      <span>{children}</span>
    </p>
  );
}

/* Real currencies, with their symbols. Morocco first because
   that is where this is used, then whatever people actually ask
   for. The list scrolls rather than wrapping into a wall. */
const CURRENCIES = [
  { code: "DH", name: "Moroccan dirham", symbol: "DH" },
  { code: "EUR", name: "Euro", symbol: "EUR" },
  { code: "USD", name: "US dollar", symbol: "USD" },
  { code: "GBP", name: "Pound sterling", symbol: "GBP" },
  { code: "CHF", name: "Swiss franc", symbol: "CHF" },
  { code: "CAD", name: "Canadian dollar", symbol: "CAD" },
  { code: "AUD", name: "Australian dollar", symbol: "AUD" },
  { code: "AED", name: "UAE dirham", symbol: "AED" },
  { code: "SAR", name: "Saudi riyal", symbol: "SAR" },
  { code: "QAR", name: "Qatari riyal", symbol: "QAR" },
  { code: "KWD", name: "Kuwaiti dinar", symbol: "KWD" },
  { code: "EGP", name: "Egyptian pound", symbol: "EGP" },
  { code: "TND", name: "Tunisian dinar", symbol: "TND" },
  { code: "DZD", name: "Algerian dinar", symbol: "DZD" },
  { code: "TRY", name: "Turkish lira", symbol: "TRY" },
  { code: "SEK", name: "Swedish krona", symbol: "SEK" },
  { code: "NOK", name: "Norwegian krone", symbol: "NOK" },
  { code: "JPY", name: "Japanese yen", symbol: "JPY" },
  { code: "CNY", name: "Chinese yuan", symbol: "CNY" },
  { code: "INR", name: "Indian rupee", symbol: "INR" },
  { code: "NGN", name: "Nigerian naira", symbol: "NGN" },
  { code: "ZAR", name: "South African rand", symbol: "ZAR" },
  { code: "BRL", name: "Brazilian real", symbol: "BRL" },
  { code: "MXN", name: "Mexican peso", symbol: "MXN" },
];

/* ---- 1, welcome ---- */
export function StepWelcome({ draft, set }: StepProps) {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.032em] text-balance">
          Let us set up your month
        </h2>
        <p className="mt-2.5 max-w-[38ch] text-[14.5px] leading-relaxed text-muted-foreground text-pretty">
          Seven quick questions. By the end every dirham you earn
          will have somewhere to be.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="obCurrency">What do you call your money</Label>

        {/* one field. The code is what gets saved, the list is
            there so nobody has to remember one. */}
        <Select
          value={draft.currency}
          onValueChange={(v) => { if (v) set({ currency: String(v) }); }}
        >
          <SelectTrigger id="obCurrency" className="h-12 w-full text-[15px]">
            <SelectValue placeholder="Pick your currency">
              {(v: unknown) => {
                const hit = CURRENCIES.find((c) => c.code === v);
                return hit ? (
                  <span className="flex items-baseline gap-2.5">
                    <span className="font-semibold">{hit.code}</span>
                    <span className="text-[13px] text-muted-foreground">{hit.name}</span>
                  </span>
                ) : (
                  "Pick your currency"
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {CURRENCIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-baseline gap-2.5">
                  <span className="w-[42px] font-semibold">{c.code}</span>
                  <span className="text-[13px] text-muted-foreground">{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

/* ---- 2, income ---- */
export function StepIncome({ draft, set }: StepProps) {
  return (
    <>
      <Head
        title="What do you usually earn"
        sub="One number for a normal month. It can change month to month, you log the real amounts later."
      />
      <div className="relative">
        <Input
          inputMode="decimal" autoFocus placeholder="0"
          className="h-[68px] pr-16 text-[34px] font-bold tracking-[-0.03em]"
          value={draft.income || ""}
          onChange={(e) => set({ income: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })}
          aria-label="Monthly income"
        />
        <span className="absolute top-1/2 right-5 -translate-y-1/2 text-[15px] font-semibold text-subtle-foreground">
          {draft.currency}
        </span>
      </div>
      <Tip icon={Lightbulb}>
        Plan on the low end. A good month then overfills your savings instead of a bad month breaking the plan.
      </Tip>
    </>
  );
}

/* ---- 3, bills ---- */
export function StepBills({ draft, set }: StepProps) {
  const total = draftBillTotal(draft);
  const left = draftFlex(draft);
  const used = draft.bills.map((b) => b.name.toLowerCase());

  const edit = (i: number, patch: Partial<DraftBill>) =>
    set({ bills: draft.bills.map((b, n) => (n === i ? { ...b, ...patch } : b)) });

  return (
    <>
      <Head
        title="What leaves every month"
        sub="Rent, loans, subscriptions. These are paid before anything is divided."
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {BILL_PRESETS.map((p) => {
          const Icon = icons[p.icon] ?? Receipt;
          const on = used.includes(p.name.toLowerCase());
          return (
            <button
              key={p.name}
              onClick={() =>
                set({
                  bills: on
                    ? draft.bills.filter((b) => b.name.toLowerCase() !== p.name.toLowerCase())
                    : [...draft.bills, { ...p }],
                })
              }
              aria-pressed={on}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                on
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-fill-2 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {p.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {draft.bills.length === 0 ? (
          <p className="rounded-[var(--radius-md)] bg-fill-2 px-3.5 py-5 text-center text-[13.5px] text-muted-foreground">
            Tap a name above, or add your own.
          </p>
        ) : (
          draft.bills.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={b.name} placeholder="Name"
                onChange={(e) => edit(i, { name: e.target.value })}
                aria-label={`Bill ${i + 1} name`}
              />
              <div className="relative w-[124px] flex-none">
                <Input
                  inputMode="decimal" placeholder="0"
                  className="pr-9 text-right"
                  value={b.amount || ""}
                  onChange={(e) =>
                    edit(i, { amount: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })
                  }
                  aria-label={`${b.name || "Bill"} amount`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold text-subtle-foreground">
                  {draft.currency}
                </span>
              </div>
              <button
                onClick={() => set({ bills: draft.bills.filter((_, n) => n !== i) })}
                aria-label={`Remove ${b.name || "this bill"}`}
                className="grid size-9 flex-none place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-fill-2 hover:text-destructive"
              >
                <Minus className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <Button
        variant="secondary"
        className="mt-2.5 w-full"
        onClick={() =>
          set({
            bills: [
              ...draft.bills,
              { name: "", amount: 0, dueDay: 1, icon: "receipt", hue: "teal" },
            ],
          })
        }
      >
        <Plus className="size-4" />
        Add a bill
      </Button>

      <Tip icon={Receipt}>
        {money(total, draft.currency)} a month in bills
        {draft.income > 0 ? `, leaving ${money(left, draft.currency)} to divide` : ""}.
      </Tip>
    </>
  );
}

/* ---- 4, the split ---- */
export function StepSplit({ draft, set }: StepProps) {
  const flex = draftFlex(draft);
  const total = draftSplitTotal(draft);
  const ok = Math.abs(total - 100) < 0.05;

  return (
    <>
      <Head
        title="How to split what is left"
        sub={
          flex > 0
            ? `${money(flex, draft.currency)} a month gets divided by these shares.`
            : "These shares divide whatever is left after bills."
        }
      />

      <div
        className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-3"
        style={{
          background: ok
            ? "color-mix(in srgb, var(--primary) 12%, transparent)"
            : "color-mix(in srgb, var(--warning) 12%, transparent)",
        }}
      >
        <span className="text-[13px] font-semibold text-muted-foreground">Total</span>
        <b
          className="text-[19px] font-bold tabular"
          style={{ color: ok ? "var(--primary)" : "var(--warning)" }}
        >
          {total}%
        </b>
        <span className="ml-auto text-[12.5px] text-muted-foreground">
          {ok
            ? "Ready"
            : total < 100
              ? `${Math.round((100 - total) * 10) / 10}% still free`
              : `${Math.round((total - 100) * 10) / 10}% over`}
        </span>
        {!ok ? (
          <Button size="sm" variant="secondary" onClick={() => set({ split: makeHundred(draft.split) })}>
            Make 100%
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3.5">
        {draft.split.map((e, i) => (
          <div key={e.name}>
            <div className="mb-1.5 flex items-baseline gap-2 text-[13.5px]">
              <span
                className="size-[9px] flex-none rounded-[3px]"
                style={{ background: `var(--hue-${e.hue})` }}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
              <span className="font-semibold tabular">{e.pct}%</span>
              {flex > 0 ? (
                <span className="w-16 text-right text-xs text-subtle-foreground tabular">
                  {money0((flex * e.pct) / 100)}
                </span>
              ) : null}
            </div>
            <Slider
              value={[e.pct]} min={0} max={60} step={1}
              onValueChange={(v) =>
                set({
                  split: draft.split.map((x, n) =>
                    n === i ? { ...x, pct: Array.isArray(v) ? v[0] : v } : x,
                  ),
                })
              }
              aria-label={`${e.name} share`}
              className="[&_[data-slot=slider-range]]:bg-(--h) [&_[data-slot=slider-thumb]]:size-[15px] [&_[data-slot=slider-thumb]]:border-(--h) [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-fill-2"
              style={{ ["--h" as string]: `var(--hue-${e.hue})` }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

/* ---- 5, debt ---- */
export function StepDebt({ draft, set }: StepProps) {
  const left = Math.max(0, draft.debtTotal - draft.debtPaid);
  return (
    <>
      <Head
        title="Anyone you are paying back"
        sub="Optional. Family, a friend, a loan outside the bank. Skip this if there is nobody."
      />
      <div className="space-y-1.5">
        <Label htmlFor="obDebtName">Who</Label>
        <Input
          id="obDebtName" placeholder="Dad"
          value={draft.debtName}
          onChange={(e) => set({ debtName: e.target.value })}
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="obDebtTotal">Total you owe</Label>
          <Input
            id="obDebtTotal" inputMode="decimal" placeholder="0"
            value={draft.debtTotal || ""}
            onChange={(e) => set({ debtTotal: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="obDebtPaid">Already paid</Label>
          <Input
            id="obDebtPaid" inputMode="decimal" placeholder="0"
            value={draft.debtPaid || ""}
            onChange={(e) => set({ debtPaid: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })}
          />
        </div>
      </div>
      <Tip icon={HeartHandshake}>
        {left > 0
          ? `${money(left, draft.currency)} still to go. There is no deadline, you set the pace.`
          : "No deadline and no pressure. You set the pace every month."}
      </Tip>
    </>
  );
}

/* ---- 6, goal ---- */
export function StepGoal({ draft, set }: StepProps) {
  return (
    <>
      <Head
        title="One thing you are saving for"
        sub="Optional. Name it and give the price, the app works out the date from your real savings."
      />
      <div className="space-y-1.5">
        <Label htmlFor="obGoalName">What is it</Label>
        <Input
          id="obGoalName" placeholder="A laptop, a trip, a ring"
          value={draft.goalName}
          onChange={(e) => set({ goalName: e.target.value })}
        />
      </div>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="obGoalPrice">What it costs</Label>
        <div className="relative">
          <Input
            id="obGoalPrice" inputMode="decimal" placeholder="0"
            className="pr-10"
            value={draft.goalPrice || ""}
            onChange={(e) => set({ goalPrice: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })}
          />
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold text-subtle-foreground">
            {draft.currency}
          </span>
        </div>
      </div>
      <Tip icon={Target}>
        You can add more goals later and slide how much of your savings each one takes.
      </Tip>
    </>
  );
}

/* ---- 7, done ---- */
export function StepDone({ draft }: StepProps) {
  const bills = draftBillTotal(draft);
  const flex = draftFlex(draft);

  return (
    <>
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
          <CheckCheck className="size-7" />
        </span>
        <h2 className="text-[26px] leading-tight font-bold tracking-[-0.03em]">
          You are set up
        </h2>
        <p className="mt-1.5 text-[14.5px] text-muted-foreground">
          You have <b className="font-semibold text-foreground">{money(flex, draft.currency)}</b> to split each month.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-border-soft rounded-[var(--radius-md)] bg-fill-2 px-4">
        {[
          ["You earn", draft.income, false],
          ["Bills take", bills, false],
          ["Left to split", flex, true],
        ].map(([label, value, hi]) => (
          <div key={String(label)} className="flex items-center justify-between py-3 text-[14px]">
            <span className={cn(hi ? "font-semibold" : "text-muted-foreground")}>{String(label)}</span>
            <b className={cn("font-semibold tabular", hi && "text-primary")}>
              {money(Number(value), draft.currency)}
            </b>
          </div>
        ))}
      </div>

      <Tip icon={Sparkles}>
        Next, a short tour of the screens. You can skip it any time.
      </Tip>
    </>
  );
}

export const STEPS = [
  StepWelcome, StepIncome, StepBills, StepSplit, StepDebt, StepGoal, StepDone,
];
