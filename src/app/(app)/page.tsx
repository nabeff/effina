"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import {
  AlertCircle, ArrowRight, Check, CheckCircle2, LayoutGrid,
  Plus, RotateCcw, TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useBudgetMutation, useMonth } from "@/lib/hooks/use-budget";
import { addTransaction, updateSettings } from "@/lib/supabase/mutations";
import { tap } from "@/components/layout/native";

import { Greeting } from "@/components/features/dashboard/greeting";
import { HeroCard } from "@/components/features/dashboard/hero-card";
import { SplitBar } from "@/components/features/dashboard/split-bar";
import { BudgetRing } from "@/components/features/dashboard/budget-ring";
import { DayStrip } from "@/components/features/dashboard/day-strip";
import { NextWin } from "@/components/features/dashboard/next-win";
import { RecentSpends } from "@/components/features/dashboard/recent-spends";
import { WidgetShell } from "@/components/features/dashboard/widget-shell";
import { AddWidget } from "@/components/features/dashboard/add-widget";
import { FillPrompt } from "@/components/features/onboarding/fill-prompt";
import { Wizard } from "@/components/features/onboarding/wizard";
import {
  AllowanceWidget, BalanceWidget, BillsWidget, Card, CategoryWidget,
  EnvelopesWidget, GoalsWidget, InsightsWidget, RateWidget,
  RebalanceWidget, TrioWidget,
} from "@/components/features/dashboard/widgets/small";
import { PaceChart } from "@/components/features/charts/pace-chart";
import { FlowChart } from "@/components/features/charts/flow-chart";

import {
  cashFlow, clampWidth, DASH_CARDS, dayStrip, debtState, defaultLayout,
  goalState, isDefault, lastMonth, nextWin, notices, readLayout,
  recentSpends, reorder, taxState, todayISO, type Width,
} from "@/lib/budget";
import { money } from "@/lib/utils/money";
import type { Tone, Transaction } from "@/types/budget";

const noticeIcon = {
  bad: AlertCircle, warn: TriangleAlert,
  good: CheckCircle2, neutral: TriangleAlert,
} as const;

const noticeColor: Record<Tone, string> = {
  bad: "var(--destructive)", warn: "var(--warning)",
  good: "var(--primary)", neutral: "var(--muted-foreground)",
};

const routes: Record<string, string> = {
  close: "/history", rebalance: "/rebalance", tax: "/tax",
  setup: "/setup", envelopes: "/envelopes", nospend: "/log", backup: "/setup",
};

export default function DashboardPage() {
  /* today differs between the build and the browser, so the month
     is only resolved once mounted */
  const mounted = useMounted();
  const { data, stats: st, isLoading } = useMonth(mounted ? undefined : SKIP);

  const [repeating, setRepeating] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  /* the layout being edited, held locally so dragging is instant
     and only written when edit mode closes */
  const [draft, setDraft] = useState<ReturnType<typeof readLayout> | null>(null);

  /* a touch needs to move before it counts as a drag, or scrolling
     the page picks up a widget instead */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const again = useBudgetMutation(
    async (tx: Transaction, { userId, supabase }) => {
      await addTransaction(supabase, userId, {
        date: todayISO(),
        direction: "out",
        amount: tx.amount,
        envelopeId: tx.envelopeId,
        note: tx.note,
      });
    },
  );

  const saveLayout = useBudgetMutation(
    async (
      l: { order: string[]; widths: Record<string, number>; hidden: string[] },
      { userId, supabase },
    ) => {
      await updateSettings(supabase, userId, {
        layoutOrder: l.order,
        layoutWidths: l.widths,
        layoutHidden: l.hidden,
      });
    },
  );

  const warnings = useMemo(
    () =>
      data && st
        ? notices(data, st, { currency: data.settings.currency })
            .filter((n) => n.tone !== "good")
            .slice(0, 2)
        : [],
    [data, st],
  );

  if (!mounted || isLoading || !data || !st) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[56px] w-[280px] rounded-[var(--radius-md)]" />
        <Skeleton className="h-[200px] rounded-[var(--radius)]" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-[180px] rounded-[var(--radius)]" />
          <Skeleton className="h-[180px] rounded-[var(--radius)]" />
        </div>
      </div>
    );
  }

  const currency = data.settings.currency;
  const strip = dayStrip(data, 30);
  const win = nextWin(data, st.month);
  const recent = recentSpends(data, 3);
  const flow = cashFlow(data, 6);
  const prev = lastMonth(data, st.month);
  const debt = debtState(data, st.month);
  const tax = taxState(data, st.month);

  /* the bar needs the whole price, which only the goal knows.
     Matched by name because that is what nextWin carries, so a
     missing match falls back to no bar rather than throwing. */
  const winGoal = win?.kind === "goal"
    ? data.goals.find((g) => g.name === win.name)
    : undefined;
  const winTotal = win
    ? win.kind === "goal"
      ? (winGoal ? goalState(data, winGoal).price : 0)
      : data.settings.debtTotal
    : 0;

  /* an account with no income, no bills and no envelopes has
     never been set up, whatever the onboarded flag says */
  const empty =
    st.income <= 0 && !data.bills.length && !data.envelopes.length;

  const saved = readLayout(
    data.settings.layoutOrder,
    data.settings.layoutWidths,
    /* an order with no saved layout at all is a first run, where
       the optional widgets should start off */
    data.settings.layoutOrder?.length ? data.settings.layoutHidden : undefined,
  );
  const layout = draft ?? saved;

  function edit(next: typeof layout) {
    setDraft(next);
  }

  function persist(next: typeof layout, note?: string) {
    setDraft(next);
    saveLayout.mutate(next, {
      onSuccess: () => { if (note) toast.success(note); },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Could not save the layout"),
    });
  }

  function finishEditing() {
    setEditing(false);
    if (!draft) return;
    saveLayout.mutate(draft, {
      onSuccess: () => { setDraft(null); toast.success("Layout saved"); },
      onError: (e) => {
        setDraft(null);
        toast.error(e instanceof Error ? e.message : "Could not save the layout");
      },
    });
  }

  function repeat(tx: Transaction) {
    setRepeating(tx.id);
    again.mutate(tx, {
      onSuccess: () => {
        setRepeating(null);
        void tap();
        toast.success(`${money(tx.amount, currency)} logged again`);
      },
      onError: (e) => {
        setRepeating(null);
        toast.error(e instanceof Error ? e.message : "Could not log that");
      },
    });
  }

  /* each widget, by id, so the saved order decides what goes where */
  const widgets: Record<string, React.ReactNode> = {
    hero: <div data-tour="hero"><HeroCard data={data} st={st} /></div>,

    ring: (
      <div className="h-full rounded-[var(--radius)] bg-card px-[17px] pt-[15px] pb-[17px]">
        <div className="mb-4">
          <div className="text-xs font-semibold tracking-[0.01em] text-muted-foreground">
            Budget ring
          </div>
          <div className="mt-0.5 text-[11.5px] text-subtle-foreground">
            Your {money(st.flex, currency)} after bills, by envelope
          </div>
        </div>
        <BudgetRing st={st} currency={currency} />
      </div>
    ),

    balance: <BalanceWidget st={st} currency={currency} />,

    split: (
      <Section
        title={`Your ${money(st.base, currency)}`}
        sub={st.future ? "How this month would be divided" : "Where this month's money sits right now"}
        className="mb-0"
      >
        <div data-tour="split"><SplitBar st={st} currency={currency} /></div>
      </Section>
    ),

    totals: (
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Money in" value={st.income} currency={currency}
          delta={prev ? <Delta now={st.income} was={prev.income} /> : undefined}
        />
        <Stat
          label="Spent" value={st.spent} currency={currency}
          delta={prev ? <Delta now={st.spent} was={prev.spent} invert /> : undefined}
        />
        <Stat
          label={st.future ? "Would keep" : "Kept"} value={st.saved}
          currency={currency} tone="good"
          delta={prev ? <Delta now={st.saved} was={prev.saved} /> : undefined}
        />
      </section>
    ),

    win: win ? <NextWin win={win} total={winTotal} currency={currency} /> : null,

    recent: recent.length ? (
      <Card title="Recently" sub="Each with a one tap repeat">
        <RecentSpends rows={recent} data={data} onAgain={repeat} />
        {repeating ? <p className="mt-2 text-xs text-subtle-foreground">Logging...</p> : null}
      </Card>
    ) : null,

    bills: <BillsWidget data={data} st={st} currency={currency} />,
    envelopes: <EnvelopesWidget st={st} currency={currency} />,
    goals: <GoalsWidget data={data} currency={currency} />,
    allowance: <AllowanceWidget st={st} currency={currency} />,
    rate: <RateWidget data={data} st={st} currency={currency} />,

    strip: !st.future ? (
      <Section
        title="The last 30 days"
        sub="Each square is one day. Darker means you spent more, and bills are left out."
        className="mb-0"
      >
        <DayStrip days={strip} currency={currency} />
      </Section>
    ) : null,

    pace: !st.future && st.flex > 0 ? (
      <Section
        title="Spending against the month"
        sub="The dashed line is an even pace. Above it is ahead of the month, below it is behind."
        className="mb-0"
      >
        <PaceChart data={data} st={st} currency={currency} />
      </Section>
    ) : null,

    category: <CategoryWidget data={data} st={st} currency={currency} />,

    flow: flow.length >= 2 ? (
      <Card title="Cash flow" sub="What you kept each month">
        <FlowChart points={flow} currency={currency} />
      </Card>
    ) : null,

    insights: <InsightsWidget data={data} st={st} />,
    rebalance: <RebalanceWidget st={st} currency={currency} />,

    trio: (
      <TrioWidget
        st={st} currency={currency}
        debtLeft={debt.left} taxShort={tax.short}
      />
    ),
  };

  /* in edit mode every widget shows, so one that is empty this
     month can still be moved rather than disappearing */
  const visible = layout.order.filter(
    (id) => !layout.hidden.includes(id) && (editing || widgets[id] !== null),
  );

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    edit({
      ...layout,
      order: reorder(layout.order, String(active.id), String(over.id)),
    });
    void tap();
  }

  return (
    <>
      <Greeting st={st} currency={currency} />

      {empty && !editing ? <FillPrompt onRun={() => setSetupOpen(true)} /> : null}

      {warnings.length && !editing ? (
        <section className="mb-6 flex flex-col gap-2">
          {warnings.map((n, i) => {
            const Icon = noticeIcon[n.tone];
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
              >
                <Link
                  href={routes[n.action] ?? "/"}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 transition-opacity hover:opacity-80"
                  style={{ background: `color-mix(in srgb, ${noticeColor[n.tone]} 11%, transparent)` }}
                >
                  <Icon className="size-4 flex-none" style={{ color: noticeColor[n.tone] }} />
                  <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
                    <b className="font-semibold">{n.title}.</b>{" "}
                    <span className="text-muted-foreground">{n.text}</span>
                  </span>
                  <ArrowRight className="size-4 flex-none text-subtle-foreground" />
                </Link>
              </motion.div>
            );
          })}
        </section>
      ) : null}

      <AnimatePresence>
        {editing ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-[76px] z-30 mb-5 flex flex-wrap items-center gap-2.5 rounded-[var(--radius-md)] bg-elevated/95 px-4 py-3 shadow-lg ring-1 ring-border-soft backdrop-blur"
          >
            <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
              <b className="font-semibold">Arranging the page.</b>{" "}
              <span className="text-muted-foreground">
                Drag a widget by its handle, or tap a bar to resize it.
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Add
            </Button>
            {!isDefault(layout) ? (
              <Button
                variant="ghost" size="sm"
                onClick={() => persist(defaultLayout(), "Back to the default layout")}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            ) : null}
            <Button size="sm" onClick={finishEditing}>
              <Check className="size-4" />
              Done
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setDragId(String(e.active.id))}
        onDragCancel={() => setDragId(null)}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={visible} strategy={rectSortingStrategy}>
          {/* stretch, not items-start. A short widget beside a tall
              one left a hole the height of the difference. */}
          <div className="mb-8 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-6 lg:grid-cols-12">
            {visible.map((id, i) => {
              const card = DASH_CARDS.find((c) => c.id === id);
              const w = clampWidth(layout.widths[id] ?? 12);
              return (
                <WidgetShell
                  key={id}
                  id={id}
                  name={card?.name ?? id}
                  width={w}
                  index={i}
                  editing={editing}
                  onWidth={(next: Width) =>
                    edit({ ...layout, widths: { ...layout.widths, [id]: next } })
                  }
                  onHide={() =>
                    edit({ ...layout, hidden: [...layout.hidden, id] })
                  }
                >
                  {widgets[id] ?? (
                    <div className="rounded-[var(--radius)] border border-dashed border-border px-4 py-6 text-center text-[13px] text-subtle-foreground">
                      {card?.name ?? "This widget"} has nothing to show this month
                    </div>
                  )}
                </WidgetShell>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(.32,.72,0,1)" }}>
          {dragId ? (
            <div className="rounded-[var(--radius)] bg-elevated px-4 py-3 shadow-2xl ring-2 ring-primary">
              <div className="text-[13.5px] font-semibold">
                {DASH_CARDS.find((c) => c.id === dragId)?.name ?? dragId}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="mx-auto flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] text-subtle-foreground transition-colors hover:bg-fill-2 hover:text-muted-foreground"
        >
          <LayoutGrid className="size-4" />
          Arrange this page
        </button>
      ) : null}

      {setupOpen ? (
        <Wizard currency={currency} onClose={() => setSetupOpen(false)} />
      ) : null}

      <AddWidget
        hidden={layout.hidden}
        open={adding}
        onOpenChange={setAdding}
        onAdd={(id) => {
          edit({ ...layout, hidden: layout.hidden.filter((h) => h !== id) });
          setAdding(false);
          toast.success(`${DASH_CARDS.find((c) => c.id === id)?.name} added`);
        }}
      />
    </>
  );
}

/** Against last month, as a short line under a figure. */
function Delta({
  now, was, invert,
}: {
  now: number;
  was: number;
  /** spending less is the good direction */
  invert?: boolean;
}) {
  if (was <= 0) return null;
  const change = ((now - was) / was) * 100;
  if (Math.abs(change) < 1) {
    return <span className="text-muted-foreground">same as last month</span>;
  }

  const up = change > 0;
  const good = invert ? !up : up;

  return (
    <span className={good ? "text-primary" : "text-muted-foreground"}>
      {up ? "+" : ""}{Math.round(change)}% on last month
    </span>
  );
}
