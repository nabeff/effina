/**
 * The figures must not drift.
 *
 * These are the 65 assertions that proved the original engine,
 * ported to the typed one. A change that moves a number here is
 * a change to someone's money, so it has to be deliberate.
 */

import { describe, it, expect } from "vitest";
import { seedBudget, ENV_IDS } from "./fixture";
import {
  stats, billTotal, totalPct, emergencyTarget, capNotes,
  splitParts, paceState, todayState, affordState, spendPotUsedPct,
  goalState, goalSolo, goalTimeline, goalSplit, goalVerdict, savingsPerMonth,
  taxState, debtState, incomeForYear,
  planMoves, donorRank, billsDue,
  notices, noticeCount, loggingGap, closePrompt,
  baseOf, incomeSettled, daysLeft, isFuture, shiftMonth, monthKey,
} from "./index";
import type { Envelope, EnvelopeRow } from "@/types/budget";

const NOW = new Date(2026, 9, 26);        // 26 October 2026
const MONTH = monthKey(NOW);

describe("the budget still works", () => {
  const data = seedBudget(NOW);

  it("bills total 3,860", () => {
    expect(Math.round(billTotal(data))).toBe(3860);
  });

  it("percentages total 100", () => {
    expect(totalPct(data)).toBe(100);
  });

  it("the flexible pot is 18,640", () => {
    expect(Math.round(stats(data, MONTH, NOW).flex)).toBe(18640);
  });

  it("free to spend is 3,977", () => {
    expect(Math.round(stats(data, MONTH, NOW).leftToSpend)).toBe(3977);
  });

  it("the split always sums to income", () => {
    const st = stats(data, MONTH, NOW);
    const total = splitParts(st).reduce((a, p) => a + p.amount, 0);
    expect(Math.round(total)).toBe(Math.round(st.base));
  });

  it("every envelope share adds up to the pot", () => {
    const st = stats(data, MONTH, NOW);
    const shares = st.envRows.reduce((a, r) => a + r.share, 0);
    expect(Math.round(shares)).toBe(Math.round(st.flex));
  });
});

describe("income timing", () => {
  it("a running month plans on the larger figure", () => {
    const data = seedBudget(NOW);
    data.transactions = data.transactions.filter((t) => t.direction !== "in");
    data.transactions.push({
      id: "x", date: `${MONTH}-03`, direction: "in", amount: 5000,
      envelopeId: null, billId: null, note: "partial", isSample: false, isAuto: false,
    });
    /* 5,000 arrived but 22,500 is typical, so plan on 22,500 */
    expect(baseOf(data, MONTH, NOW)).toBe(22500);
  });

  it("marking a month done switches to what really arrived", () => {
    const data = seedBudget(NOW);
    data.transactions = data.transactions.filter((t) => t.direction !== "in");
    data.transactions.push({
      id: "x", date: `${MONTH}-03`, direction: "in", amount: 5000,
      envelopeId: null, billId: null, note: "all of it", isSample: false, isAuto: false,
    });
    data.settings.doneMonths[MONTH] = true;
    expect(baseOf(data, MONTH, NOW)).toBe(5000);
    expect(incomeSettled(data, MONTH, NOW)).toBe(true);
  });

  it("a future month has not started", () => {
    const next = shiftMonth(MONTH, 1);
    expect(isFuture(next, NOW)).toBe(true);
    expect(incomeSettled(seedBudget(NOW), next, NOW)).toBe(false);
    expect(daysLeft(next, NOW)).toBeGreaterThan(27);
  });

  it("a past month is finished", () => {
    expect(daysLeft(shiftMonth(MONTH, -1), NOW)).toBe(0);
  });

  it("today still counts as spendable", () => {
    expect(daysLeft(MONTH, NOW)).toBe(6);   // 31 - 26 + 1
  });
});

describe("caps", () => {
  it("the emergency target is three months of bills", () => {
    expect(Math.round(emergencyTarget(seedBudget(NOW)))).toBe(11580);
  });

  it("nothing is capped on a normal month", () => {
    const st = stats(seedBudget(NOW), MONTH, NOW);
    expect(st.envRows.some((r) => r.capped)).toBe(false);
  });

  it("a settled debt takes nothing and Savings absorbs it", () => {
    const data = seedBudget(NOW);
    data.settings.debtTotal = 100;          // already overpaid this month
    const st = stats(data, MONTH, NOW);

    const debt = st.envRows.find((r) => r.kind === "debt")!;
    const save = st.envRows.find((r) => r.id === ENV_IDS.save)!;

    expect(debt.capped).toBe(true);
    expect(Math.round(debt.share)).toBe(0);
    expect(Math.round(save.share)).toBe(3728 + 2050);
  });

  it("the shares still sum to the pot when a cap fires", () => {
    const data = seedBudget(NOW);
    data.settings.debtTotal = 100;
    const st = stats(data, MONTH, NOW);
    const shares = st.envRows.reduce((a, r) => a + r.share, 0);
    expect(Math.round(shares)).toBe(Math.round(st.flex));
  });

  it("a cap explains itself", () => {
    const data = seedBudget(NOW);
    data.settings.debtTotal = 100;
    const notes = capNotes(data, stats(data, MONTH, NOW));
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0]).toContain("moves to Savings");
  });
});

describe("pace and today", () => {
  const data = seedBudget(NOW);
  const st = stats(data, MONTH, NOW);

  it("reads a verdict from spending against days", () => {
    const pace = paceState(st);
    expect(["On track", "A bit fast", "Too fast"]).toContain(pace.label);
    expect(pace.through).toBeGreaterThan(0);
  });

  it("the used percentage never goes negative", () => {
    expect(spendPotUsedPct(st)).toBeGreaterThanOrEqual(0);
  });

  it("today has an allowance and the ring never exceeds full", () => {
    const td = todayState(data, st, `${MONTH}-26`);
    expect(td.allowance).toBeGreaterThan(0);
    expect(td.pct).toBeLessThanOrEqual(100);
  });

  it("bills are not counted as today's spending", () => {
    /* every bill falls on days 2 to 4, so the 26th sees none */
    expect(todayState(data, st, `${MONTH}-26`).spent).toBe(0);
  });
});

describe("can I afford it", () => {
  const st = stats(seedBudget(NOW), MONTH, NOW);

  it("spending 400 leaves the right daily figure", () => {
    const af = affordState(st, 400);
    expect(Math.round(af.perDay)).toBe(Math.round((st.leftToSpend - 400) / st.daysLeft));
    expect(af.days).toBe(st.daysLeft);
  });

  it("an unaffordable amount is flagged", () => {
    expect(affordState(st, 99999).tight).toBe(true);
  });

  it("zero changes nothing", () => {
    expect(Math.round(affordState(st, 0).perDay)).toBe(Math.round(st.perDay));
  });
});

describe("goals", () => {
  const data = seedBudget(NOW);

  it("savings a month is 3,728", () => {
    expect(Math.round(savingsPerMonth(data))).toBe(3728);
  });

  it("a goal knows what is left and how fast", () => {
    const g = data.goals[0];
    const gs = goalState(data, g, NOW);
    expect(gs.left).toBe(2300);
    expect(Math.round(gs.perMonth)).toBe(1118);   // 30 percent of 3,728
    expect(gs.months).toBe(3);
  });

  it("going alone is faster than sharing", () => {
    const g = data.goals[0];
    const solo = goalSolo(data, g)!;
    const shared = goalState(data, g, NOW).months!;
    expect(solo).toBeLessThanOrEqual(shared);
  });

  it("the timeline finishes every goal", () => {
    const tl = goalTimeline(data, 120, NOW);
    expect(tl.finished.length).toBe(3);
    expect(tl.series.length).toBe(3);
  });

  it("finishing one releases its share", () => {
    /* the car alone would take 36 months at 45 percent, but the
       other two finish early and hand their shares over */
    const tl = goalTimeline(data, 120, NOW);
    const car = tl.finished.find((f) => f.name === "Car")!;
    expect(car.month).toBeLessThan(36);
  });

  it("the allocation sums to the pool", () => {
    const total = goalSplit(data).reduce((a, p) => a + p.amount, 0);
    expect(Math.round(total)).toBe(Math.round(savingsPerMonth(data)));
  });

  it("names the month everything is paid for", () => {
    expect(goalVerdict(data, NOW).tone).toBe("good");
  });

  it("says plainly when no goal has a share", () => {
    const d = seedBudget(NOW);
    d.goals = d.goals.map((g) => ({ ...g, share: 0 }));
    expect(goalVerdict(d, NOW).tone).toBe("bad");
  });
});

describe("tax", () => {
  const data = seedBudget(NOW);

  it("owes ten percent of the year", () => {
    const t = taxState(data, MONTH, NOW);
    expect(Math.round(t.owed)).toBe(Math.round(incomeForYear(data, "2026") * 0.1));
  });

  it("knows whether the reserve covers it", () => {
    const t = taxState(data, MONTH, NOW);
    expect(typeof t.ok).toBe("boolean");
    expect(t.covered).toBeLessThanOrEqual(100);
  });

  it("counts payments already made", () => {
    const d = seedBudget(NOW);
    const before = taxState(d, MONTH, NOW).left;
    d.settings.taxPaid["2026"] = 5000;
    expect(taxState(d, MONTH, NOW).left).toBe(Math.max(0, before - 5000));
  });
});

describe("debt", () => {
  it("still owes 7,000", () => {
    const data = seedBudget(NOW);
    expect(Math.round(debtState(data, MONTH, NOW).left)).toBe(7000);
  });

  it("counts what was paid before the app existed", () => {
    const data = seedBudget(NOW);
    data.settings.debtPaidBefore = 1000;
    expect(Math.round(debtState(data, MONTH, NOW).left)).toBe(6000);
  });
});

describe("rebalance", () => {
  const data = seedBudget(NOW);
  const st = stats(data, MONTH, NOW);

  it("finds the overspent envelope", () => {
    expect(st.over.length).toBeGreaterThan(0);
    expect(st.over[0].name).toBe("Girlfriend");
  });

  it("takes from fun money before savings", () => {
    const fun = st.envRows.find((r) => r.id === ENV_IDS.fun)!;
    const save = st.envRows.find((r) => r.id === ENV_IDS.save)!;
    expect(donorRank(fun)).toBeLessThan(donorRank(save));
  });

  it("never takes from tax or debt", () => {
    const tax = st.envRows.find((r) => r.id === ENV_IDS.tax)!;
    const dad = st.envRows.find((r) => r.id === ENV_IDS.dad)!;
    expect(donorRank(tax)).toBe(9);
    expect(donorRank(dad)).toBe(9);
  });

  it("covers the overspend", () => {
    const { moves } = planMoves(st);
    const covered = moves.filter((m) => m.from).reduce((a, m) => a + m.amount, 0);
    expect(Math.round(covered)).toBe(Math.round(-st.over[0].left));
  });

  it("says plainly when nothing can be moved", () => {
    const d = seedBudget(NOW);
    /* spend every flexible envelope dry */
    const s = stats(d, MONTH, NOW);
    s.envRows.filter((r) => r.kind === "spend").forEach((r) => {
      d.transactions.push({
        id: `drain-${r.id}`, date: `${MONTH}-20`, direction: "out",
        amount: Math.max(0, r.left), envelopeId: r.id, billId: null,
        note: "", isSample: false, isAuto: false,
      });
    });
    const after = stats(d, MONTH, NOW);
    const { moves } = planMoves(after);
    expect(moves.every((m) => m.amount > 0)).toBe(true);
  });
});

describe("bills pay themselves", () => {
  it("lists what is due and unpaid", () => {
    const data = seedBudget(NOW);
    data.transactions = data.transactions.filter((t) => !t.billId);
    const due = billsDue(data, stats(data, MONTH, NOW), MONTH, NOW);
    expect(due.length).toBe(6);
  });

  it("lists nothing once they are paid", () => {
    const data = seedBudget(NOW);
    const due = billsDue(data, stats(data, MONTH, NOW), MONTH, NOW);
    expect(due.length).toBe(0);
  });

  it("leaves a closed month alone", () => {
    const data = seedBudget(NOW);
    data.transactions = data.transactions.filter((t) => !t.billId);
    data.closedMonths.push({
      id: "c", month: MONTH, income: 0, spent: 0, saved: 0,
      billTotal: 0, debtPaid: 0, rolled: 0, perEnvelope: {},
    });
    expect(billsDue(data, stats(data, MONTH, NOW), MONTH, NOW).length).toBe(0);
  });
});

describe("notices", () => {
  const data = seedBudget(NOW);
  const st = stats(data, MONTH, NOW);

  it("lists a real problem", () => {
    const list = notices(data, st);
    expect(list.length).toBeGreaterThan(0);
  });

  it("puts the worst first", () => {
    const list = notices(data, st);
    const tones = list.map((n) => n.tone);
    const firstGood = tones.indexOf("good");
    const lastBad = tones.lastIndexOf("bad");
    if (firstGood > -1 && lastBad > -1) expect(lastBad).toBeLessThan(firstGood);
  });

  it("every notice can be acted on", () => {
    expect(notices(data, st).every((n) => !!n.action && !!n.title)).toBe(true);
  });

  it("good news is not counted as a problem", () => {
    const list = notices(data, st);
    expect(noticeCount(list)).toBe(list.filter((n) => n.tone !== "good").length);
  });

  it("samples alone never trigger a logging gap", () => {
    expect(loggingGap(data, [], NOW)).toBe(null);
  });

  it("a four day silence is flagged", () => {
    const d = seedBudget(NOW);
    d.transactions.push({
      id: "real", date: `${MONTH}-22`, direction: "out", amount: 50,
      envelopeId: ENV_IDS.food, billId: null, note: "Real",
      isSample: false, isAuto: false,
    });
    const gap = loggingGap(d, [], NOW);
    expect(gap?.days).toBe(4);
    expect(gap?.text).toMatch(/since \w+day\./);
  });

  it("a no spend day clears it", () => {
    const d = seedBudget(NOW);
    d.transactions.push({
      id: "real", date: `${MONTH}-22`, direction: "out", amount: 50,
      envelopeId: ENV_IDS.food, billId: null, note: "Real",
      isSample: false, isAuto: false,
    });
    expect(loggingGap(d, [`${MONTH}-26`], NOW)).toBe(null);
  });

  it("prompts to close an open previous month", () => {
    const d = seedBudget(NOW);
    const prev = shiftMonth(MONTH, -1);
    d.closedMonths = d.closedMonths.filter((c) => c.month !== prev);
    d.transactions.push({
      id: "p", date: `${prev}-10`, direction: "out", amount: 300,
      envelopeId: ENV_IDS.food, billId: null, note: "Last month",
      isSample: false, isAuto: false,
    });
    expect(closePrompt(d, NOW)?.month).toBe(prev);
  });
});

/* ---- donor order ----
   "Emergency fund" contains the letters of "fun". A substring test
   ranked it as the first envelope to raid, the opposite of the rule,
   so these pin the order by name. */
describe("donorRank", () => {
  const row = (name: string, kind: Envelope["kind"]) =>
    ({ name, kind } as EnvelopeRow);

  it("ranks fun money first and the emergency fund fourth", () => {
    expect(donorRank(row("Fun money", "spend"))).toBe(0);
    expect(donorRank(row("Girlfriend", "spend"))).toBe(1);
    expect(donorRank(row("Food & daily life", "spend"))).toBe(2);
    expect(donorRank(row("Emergency fund", "save"))).toBe(4);
    expect(donorRank(row("Savings", "save"))).toBe(5);
  });

  it("never lets tax or debt donate", () => {
    expect(donorRank(row("Tax reserve", "save"))).toBe(9);
    expect(donorRank(row("Dad debt", "debt"))).toBe(9);
  });

  it("asks fun money before the emergency fund", () => {
    const order = [
      row("Emergency fund", "save"),
      row("Fun money", "spend"),
    ].sort((a, b) => donorRank(a) - donorRank(b));
    expect(order[0].name).toBe("Fun money");
  });
});
