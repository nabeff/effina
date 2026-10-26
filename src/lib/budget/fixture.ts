/**
 * The seed budget, as data rather than as a function with side
 * effects. Every test builds from this, so a test that changes
 * something cannot leak into the next one.
 */

import type { BudgetData, Hue } from "@/types/budget";

const id = (s: string) => `00000000-0000-4000-8000-${s.padStart(12, "0")}`;

export const BILL_IDS = {
  loan: id("b1"), claude: id("b2"), wifi: id("b3"),
  gym: id("b4"), phone: id("b5"), spotify: id("b6"),
};

export const ENV_IDS = {
  food: id("e1"), save: id("e2"), biz: id("e3"), trans: id("e4"),
  gf: id("e5"), emg: id("e6"), dad: id("e7"), fun: id("e8"), tax: id("e9"),
};

export function seedBudget(now = new Date(2026, 9, 26)): BudgetData {
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const shift = (by: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + by, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const day = (d: number) => `${cur}-${String(d).padStart(2, "0")}`;

  const bills = [
    { id: BILL_IDS.loan, name: "Bank loan", amount: 2050, dueDay: 2, icon: "landmark", hue: "pink" as Hue, note: "", position: 0 },
    { id: BILL_IDS.claude, name: "Claude", amount: 1000, dueDay: 3, icon: "bot", hue: "purple" as Hue, note: "", position: 1 },
    { id: BILL_IDS.wifi, name: "Wifi", amount: 375, dueDay: 4, icon: "router", hue: "teal" as Hue, note: "", position: 2 },
    { id: BILL_IDS.gym, name: "Gym", amount: 290, dueDay: 2, icon: "dumbbell", hue: "green" as Hue, note: "", position: 3 },
    { id: BILL_IDS.phone, name: "Phone", amount: 100, dueDay: 3, icon: "smartphone", hue: "orange" as Hue, note: "", position: 4 },
    { id: BILL_IDS.spotify, name: "Spotify", amount: 45, dueDay: 4, icon: "audio-lines", hue: "mint" as Hue, note: "", position: 5 },
  ];

  const envelopes = [
    { id: ENV_IDS.food, name: "Food & daily life", pct: 16, kind: "spend" as const, icon: "shopping-cart", hue: "indigo" as Hue, note: "", position: 0 },
    { id: ENV_IDS.save, name: "Savings", pct: 20, kind: "save" as const, icon: "piggy-bank", hue: "green" as Hue, note: "", position: 1 },
    { id: ENV_IDS.biz, name: "Business & tools", pct: 7, kind: "spend" as const, icon: "briefcase", hue: "orange" as Hue, note: "", position: 2 },
    { id: ENV_IDS.trans, name: "Transport", pct: 6, kind: "spend" as const, icon: "car", hue: "teal" as Hue, note: "", position: 3 },
    { id: ENV_IDS.gf, name: "Girlfriend", pct: 10, kind: "spend" as const, icon: "gift", hue: "pink" as Hue, note: "", position: 4 },
    { id: ENV_IDS.emg, name: "Emergency fund", pct: 12, kind: "save" as const, icon: "shield-check", hue: "mint" as Hue, note: "", position: 5 },
    { id: ENV_IDS.dad, name: "Dad debt", pct: 11, kind: "debt" as const, icon: "heart-handshake", hue: "purple" as Hue, note: "", position: 6 },
    { id: ENV_IDS.fun, name: "Fun money", pct: 8, kind: "spend" as const, icon: "party-popper", hue: "yellow" as Hue, note: "", position: 7 },
    { id: ENV_IDS.tax, name: "Tax reserve", pct: 10, kind: "save" as const, icon: "percent", hue: "brown" as Hue, note: "", position: 8 },
  ];

  let n = 0;
  const tx = (date: string, direction: "in" | "out", amount: number,
              envelopeId: string | null, billId: string | null, note: string) => ({
    id: id(`t${++n}`), date, direction, amount, envelopeId, billId,
    note, isSample: true, isAuto: false,
  });

  const transactions = [
    tx(day(3), "in", 13500, null, null, "Client invoice, Atlas Studio"),
    tx(day(12), "in", 9000, null, null, "Retainer, monthly"),
    ...bills.map((b, i) => tx(day(2 + (i % 3)), "out", b.amount, null, b.id, b.name)),
    tx(day(6), "out", 2000, ENV_IDS.dad, null, "Paid dad back"),
    tx(day(5), "out", 820, ENV_IDS.food, null, "Groceries, Marjane"),
    tx(day(9), "out", 410, ENV_IDS.food, null, "Groceries"),
    tx(day(11), "out", 260, ENV_IDS.trans, null, "Taxi, week"),
    tx(day(13), "out", 650, ENV_IDS.gf, null, "Gift for her"),
    tx(day(14), "out", 480, ENV_IDS.gf, null, "Dinner out"),
    tx(day(16), "out", 390, ENV_IDS.gf, null, "Food, the week she stayed"),
    tx(day(18), "out", 900, ENV_IDS.gf, null, "Weekend away"),
    tx(day(15), "out", 890, ENV_IDS.biz, null, "External SSD"),
    tx(day(17), "out", 540, ENV_IDS.fun, null, "Concert ticket"),
  ];

  const closed = (month: string, income: number, spend: Record<string, number>,
                  debtPaid: number, saveSplit: Record<string, number>) => {
    const perEnvelope = { ...spend, [ENV_IDS.dad]: debtPaid, ...saveSplit };
    const billTotal = bills.reduce((a, b) => a + b.amount, 0);
    return {
      id: id(`c${month.replace("-", "")}`),
      month, income,
      spent: billTotal + Object.values(perEnvelope).reduce((a, v) => a + v, 0),
      saved: Object.values(saveSplit).reduce((a, v) => a + v, 0),
      billTotal, debtPaid, rolled: 0, perEnvelope,
    };
  };

  return {
    settings: {
      income: 22500, currency: "DH", leftovers: "save",
      taxRate: 10, taxPaid: {}, debtTotal: 15000, debtPaidBefore: 0,
      doneMonths: {}, accent: "green", motion: "full", glass: "medium",
      background: "glow", radius: "round", density: "comfy",
      theme: "dark", glow: "green", layoutOrder: [], layoutWidths: {},
      onboarded: true, tourDone: true,
    },
    bills, envelopes, transactions,
    goals: [
      { id: id("g1"), name: "Apple Watch Series 4", price: 2300, saved: 0, share: 30, icon: "watch", hue: "teal" as Hue, targetMonth: "", note: "", position: 0 },
      { id: id("g2"), name: "Ring for her", price: 2300, saved: 0, share: 25, icon: "gem", hue: "pink" as Hue, targetMonth: "", note: "", position: 1 },
      { id: id("g3"), name: "Car", price: 60000, saved: 0, share: 45, icon: "car", hue: "indigo" as Hue, targetMonth: "", note: "", position: 2 },
    ],
    transfers: [],
    closedMonths: [
      closed(shift(-3), 21000, { [ENV_IDS.food]: 2650, [ENV_IDS.trans]: 980, [ENV_IDS.gf]: 1750, [ENV_IDS.biz]: 420, [ENV_IDS.fun]: 1100 }, 1500, { [ENV_IDS.save]: 3200, [ENV_IDS.emg]: 1900, [ENV_IDS.tax]: 2000 }),
      closed(shift(-2), 23000, { [ENV_IDS.food]: 3100, [ENV_IDS.trans]: 760, [ENV_IDS.gf]: 2050, [ENV_IDS.biz]: 1250, [ENV_IDS.fun]: 1480 }, 2000, { [ENV_IDS.save]: 4100, [ENV_IDS.emg]: 2200, [ENV_IDS.tax]: 2200 }),
      closed(shift(-1), 22000, { [ENV_IDS.food]: 2400, [ENV_IDS.trans]: 840, [ENV_IDS.gf]: 1600, [ENV_IDS.biz]: 310, [ENV_IDS.fun]: 920 }, 2500, { [ENV_IDS.save]: 3900, [ENV_IDS.emg]: 2050, [ENV_IDS.tax]: 2100 }),
    ],
  };
}
