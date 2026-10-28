"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines, Briefcase, Car, CheckCheck, Dumbbell, Gift, HeartHandshake,
  House, Landmark, Lightbulb, Minus, PartyPopper, Percent, PiggyBank,
  Plus, Receipt, Router, ShieldCheck, ShoppingCart, Smartphone, Sparkles,
  Target, Check, HeartPulse, Users, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CurrencyPicker } from "@/components/ui/currency-picker";
import { cn } from "@/lib/utils";
import {
  BILL_PRESETS, draftBillTotal, draftFlex,
  AREAS, billItems, splitFromItems, suggestedIn,
  type Area, type Draft, type DraftBill,
} from "@/lib/budget";
import { money, money0 } from "@/lib/utils/money";

const icons: Record<string, LucideIcon> = {
  house: House, landmark: Landmark, router: Router, smartphone: Smartphone,
  dumbbell: Dumbbell, "audio-lines": AudioLines, receipt: Receipt,
  "shopping-cart": ShoppingCart, "piggy-bank": PiggyBank, briefcase: Briefcase,
  car: Car, gift: Gift, "shield-check": ShieldCheck,
  "heart-handshake": HeartHandshake, "party-popper": PartyPopper, percent: Percent,
  "heart-pulse": HeartPulse, users: Users,
};

export interface StepProps {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
}

/* the first step leaves this blank on purpose, so everything
   after it needs something to show until one is picked */
const unit = (d: Draft) => d.currency || "DH";

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

/* ---- 1, what you earn ---- */
export function StepIncome({ draft, set }: StepProps) {
  return (
    <>
      <div className="mb-9">
        <h2 className="text-[clamp(26px,4.4vw,38px)] leading-[1.08] font-bold tracking-[-0.036em] whitespace-nowrap">
          What do you usually earn
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          One number for a normal month, six questions, about a minute.
        </p>
      </div>

      {/* the amount and what it is in, one line, because they are
          one answer */}
      <div className="flex items-stretch gap-2.5">
        <Input
          inputMode="decimal" autoFocus placeholder="0"
          className="h-[46px] flex-1 text-[22px] font-bold tracking-[-0.03em]"
          value={draft.income || ""}
          onChange={(e) => set({ income: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })}
          aria-label="Monthly income"
        />

        <CurrencyPicker
          value={draft.currency}
          onChange={(code) => set({ currency: code })}
          className="h-[46px] w-auto min-w-[112px] flex-none"
        />
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
                value={b.name} placeholder="Name" className="h-[42px] text-[14.5px]"
                onChange={(e) => edit(i, { name: e.target.value })}
                aria-label={`Bill ${i + 1} name`}
              />
              <div className="relative w-[124px] flex-none">
                <Input
                  inputMode="decimal" placeholder="0"
                  className="h-[42px] pr-9 text-right text-[14.5px]"
                  value={b.amount || ""}
                  onChange={(e) =>
                    edit(i, { amount: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })
                  }
                  aria-label={`${b.name || "Bill"} amount`}
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold text-subtle-foreground">
                  {unit(draft)}
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
        {money(total, unit(draft))} a month in bills
        {draft.income > 0 ? `, leaving ${money(left, unit(draft))} to divide` : ""}.
      </Tip>
    </>
  );
}

/* ---- 4, the split ---- */

/**
 * Two questions, not a wall of sliders.
 *
 * First which parts of a life apply, then what is actually in
 * them. Nobody knows what share of their income transport should
 * take, but everybody knows whether they have a car, so the
 * shares are worked out from the answers and only shown to the
 * person who asks to see them.
 */
export function StepSplit({ draft, set }: StepProps) {
  const flex = draftFlex(draft);
  const unitName = unit(draft);
  const picks = draft.picks;

  /* an area counts as chosen once anything inside it is ticked */
  const chosen = AREAS.filter((a) => a.items.some((i) => picks.includes(i.id)));
  const [open, setOpen] = useState<string[]>(() => chosen.map((a) => a.id));
  const [showShares, setShowShares] = useState(false);

  const isOpen = (id: string) => open.includes(id);

  /* opening an area ticks the things most people in it have, so
     the common answer takes one tap and the rest is correction */
  function toggleArea(area: Area) {
    if (isOpen(area.id)) {
      setOpen((o) => o.filter((x) => x !== area.id));
      return commit(picks.filter((p) => !area.items.some((i) => i.id === p)));
    }
    setOpen((o) => [...o, area.id]);
    const suggested = suggestedIn(area);
    commit([...picks, ...suggested.filter((id) => !picks.includes(id))]);
  }

  function toggleItem(id: string) {
    commit(picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id]);
  }

  /* the picks are the answer, the split is only ever derived
     from them, so the two can never drift apart */
  function commit(next: string[]) {
    set({ picks: next, split: splitFromItems(next) });
  }

  const bills = billItems(picks);

  return (
    <>
      <Head
        title="What is in your life"
        sub={
          flex > 0
            ? `Pick what applies. ${money(flex, unitName)} a month gets divided across it.`
            : "Pick what applies, and the shares work themselves out."
        }
      />

      <div className="flex flex-col gap-2">
        {AREAS.map((area) => {
          const Icon = icons[area.icon] ?? Sparkles;
          const on = isOpen(area.id);
          const mine = area.items.filter((i) => picks.includes(i.id));
          const share = draft.split.find((e) => e.name === area.name)?.pct ?? 0;

          return (
            <div
              key={area.id}
              className={cn(
                "overflow-hidden rounded-[var(--radius-md)] border transition-colors",
                on ? "border-border bg-fill-2" : "border-border-soft",
              )}
            >
              <button
                onClick={() => toggleArea(area)}
                aria-expanded={on}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              >
                <span
                  className="grid size-8 flex-none place-items-center rounded-full"
                  style={{
                    background: on
                      ? `color-mix(in srgb, var(--hue-${area.hue}) 22%, transparent)`
                      : "var(--fill-2)",
                    color: on ? `var(--hue-${area.hue})` : "var(--muted-foreground)",
                  }}
                >
                  <Icon className="size-[17px]" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold">{area.name}</span>
                  <span className="block text-[12.5px] leading-snug text-muted-foreground text-pretty">
                    {mine.length
                      ? mine.map((i) => i.name).join(", ")
                      : area.hint}
                  </span>
                </span>

                {on && showShares && share > 0 ? (
                  <span className="text-[13px] font-semibold tabular text-muted-foreground">
                    {share}%
                  </span>
                ) : null}

                <span
                  className={cn(
                    "grid size-[22px] flex-none place-items-center rounded-full border transition-colors",
                    on
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-transparent",
                  )}
                >
                  <Check className="size-[13px]" strokeWidth={3} />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {on ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <div className="flex flex-wrap gap-1.5 border-t border-border-soft px-3.5 pt-3 pb-3.5">
                      {area.items.map((item) => {
                        const ticked = picks.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleItem(item.id)}
                            aria-pressed={ticked}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                              ticked
                                ? "border-transparent text-foreground"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                            style={
                              ticked
                                ? { background: `color-mix(in srgb, var(--hue-${area.hue}) 20%, transparent)` }
                                : undefined
                            }
                          >
                            {item.name}
                            {item.bill ? (
                              <span className="ml-1.5 text-[11px] text-subtle-foreground">bill</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {draft.split.length ? (
        <button
          onClick={() => setShowShares((s) => !s)}
          className="mt-4 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {showShares ? "Hide the shares" : "Show me the shares"}
        </button>
      ) : null}

      {bills.length ? (
        <Tip icon={Receipt}>
          {bills.length === 1 ? "One of these" : `${bills.length} of these`} are fixed
          amounts rather than shares. You can put the figures in later, or on the bills
          screen.
        </Tip>
      ) : (
        <Tip icon={Sparkles}>
          Nothing is final. Everything here can change once you see your month.
        </Tip>
      )}
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
        sub="Optional. A loan, a card, money owed to someone. Skip this if there is nobody."
      />
      <div className="space-y-1.5">
        <Label htmlFor="obDebtName">Who</Label>
        <Input
          id="obDebtName" placeholder="A bank, a friend, a card" className="h-[42px] text-[14.5px]"
          value={draft.debtName}
          onChange={(e) => set({ debtName: e.target.value })}
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="obDebtTotal">Total you owe</Label>
          <Input
            id="obDebtTotal" inputMode="decimal" placeholder="0" className="h-[42px] text-[14.5px]"
            value={draft.debtTotal || ""}
            onChange={(e) => set({ debtTotal: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="obDebtPaid">Already paid</Label>
          <Input
            id="obDebtPaid" inputMode="decimal" placeholder="0" className="h-[42px] text-[14.5px]"
            value={draft.debtPaid || ""}
            onChange={(e) => set({ debtPaid: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })}
          />
        </div>
      </div>
      <Tip icon={HeartHandshake}>
        {left > 0
          ? `${money(left, unit(draft))} still to go. There is no deadline, you set the pace.`
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
          id="obGoalName" placeholder="A laptop, a trip, a ring" className="h-[42px] text-[14.5px]"
          value={draft.goalName}
          onChange={(e) => set({ goalName: e.target.value })}
        />
      </div>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="obGoalPrice">What it costs</Label>
        <div className="relative">
          <Input
            id="obGoalPrice" inputMode="decimal" placeholder="0"
            className="h-[42px] pr-10 text-[14.5px]"
            value={draft.goalPrice || ""}
            onChange={(e) => set({ goalPrice: Math.max(0, Number(e.target.value.replace(/[^\d.]/g, "")) || 0) })}
          />
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold text-subtle-foreground">
            {unit(draft)}
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
          You have <b className="font-semibold text-foreground">{money(flex, unit(draft))}</b> to split each month.
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
              {money(Number(value), unit(draft))}
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
  StepIncome, StepBills, StepSplit, StepDebt, StepGoal, StepDone,
];
