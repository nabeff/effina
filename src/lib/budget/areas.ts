/**
 * Life areas, and the real things inside them.
 *
 * Nobody knows what percentage of their income should go to
 * transport. Everybody knows whether they have a car. So setup
 * asks about things that exist in a life, and the shares are
 * worked out from the answers.
 *
 * The weights are relative, not percentages. They only decide
 * how a pot is divided between whatever was picked.
 */

import type { Hue } from "@/types/budget";
import { makeHundred, type DraftEnvelope } from "./onboarding";

export interface AreaItem {
  id: string;
  name: string;
  /** relative pull on the money, not a percentage */
  weight: number;
  /** a bill is a fixed amount, not a share of what is left */
  bill?: boolean;
}

export interface Area {
  id: string;
  name: string;
  hint: string;
  icon: string;
  hue: Hue;
  kind: "spend" | "save" | "debt";
  items: AreaItem[];
}

export const AREAS: Area[] = [
  {
    id: "home",
    name: "Home",
    hint: "Where you live and what keeps it running",
    icon: "house",
    hue: "indigo",
    kind: "spend",
    items: [
      { id: "rent", name: "Rent or mortgage", weight: 0, bill: true },
      { id: "power", name: "Electricity and water", weight: 0, bill: true },
      { id: "internet", name: "Internet", weight: 0, bill: true },
      { id: "household", name: "Household and repairs", weight: 6 },
    ],
  },
  {
    id: "food",
    name: "Food",
    hint: "Groceries and eating out",
    icon: "shopping-cart",
    hue: "green",
    kind: "spend",
    items: [
      { id: "groceries", name: "Groceries", weight: 18 },
      { id: "eating-out", name: "Eating out and coffee", weight: 7 },
    ],
  },
  {
    id: "transport",
    name: "Getting around",
    hint: "However you move",
    icon: "car",
    hue: "teal",
    kind: "spend",
    items: [
      { id: "fuel", name: "Fuel", weight: 7 },
      { id: "transit", name: "Taxis and transport", weight: 5 },
      { id: "car", name: "Car payment or insurance", weight: 0, bill: true },
    ],
  },
  {
    id: "health",
    name: "Health",
    hint: "Looking after yourself",
    icon: "heart-pulse",
    hue: "pink",
    kind: "spend",
    items: [
      { id: "insurance", name: "Health insurance", weight: 0, bill: true },
      { id: "medical", name: "Medicine and appointments", weight: 5 },
      { id: "fitness", name: "Gym or sport", weight: 0, bill: true },
    ],
  },
  {
    id: "people",
    name: "People",
    hint: "Whoever you look after or spend on",
    icon: "users",
    hue: "purple",
    kind: "spend",
    items: [
      { id: "family", name: "Family and children", weight: 10 },
      { id: "partner", name: "Partner", weight: 6 },
      { id: "gifts", name: "Gifts and occasions", weight: 4 },
    ],
  },
  {
    id: "work",
    name: "Work",
    hint: "What the job costs you",
    icon: "briefcase",
    hue: "orange",
    kind: "spend",
    items: [
      { id: "tools", name: "Software and tools", weight: 0, bill: true },
      { id: "equipment", name: "Equipment", weight: 5 },
      { id: "learning", name: "Courses and books", weight: 4 },
    ],
  },
  {
    id: "life",
    name: "Your own time",
    hint: "Yours to spend without explaining",
    icon: "party-popper",
    hue: "yellow",
    kind: "spend",
    items: [
      { id: "fun", name: "Going out and hobbies", weight: 8 },
      { id: "subs", name: "Subscriptions", weight: 0, bill: true },
      { id: "travel", name: "Travel", weight: 6 },
    ],
  },
  {
    id: "future",
    name: "The future",
    hint: "Money you are not spending yet",
    icon: "piggy-bank",
    hue: "mint",
    kind: "save",
    items: [
      { id: "savings", name: "Savings", weight: 14 },
      { id: "emergency", name: "Emergency fund", weight: 8 },
      { id: "goals", name: "Something you are saving for", weight: 6 },
    ],
  },
  {
    id: "owed",
    name: "What you owe",
    hint: "Debts and anything set aside",
    icon: "heart-handshake",
    hue: "brown",
    kind: "debt",
    items: [
      { id: "debt", name: "Paying someone back", weight: 10 },
      { id: "tax", name: "Tax set aside", weight: 12 },
    ],
  },
];

export function areaById(id: string): Area | undefined {
  return AREAS.find((a) => a.id === id);
}

/** Every item that is not a fixed bill, with its area. */
export function shareItems(picked: string[]) {
  const out: { item: AreaItem; area: Area }[] = [];
  for (const area of AREAS) {
    for (const item of area.items) {
      if (!item.bill && picked.includes(item.id)) out.push({ item, area });
    }
  }
  return out;
}

/** The bills a person picked, which need an amount rather than a share. */
export function billItems(picked: string[]) {
  const out: { item: AreaItem; area: Area }[] = [];
  for (const area of AREAS) {
    for (const item of area.items) {
      if (item.bill && picked.includes(item.id)) out.push({ item, area });
    }
  }
  return out;
}

/**
 * Turns the things a person picked into envelopes.
 *
 * One envelope per area, not per item, because nine areas make a
 * readable budget and twenty six items make a spreadsheet. The
 * area's share is the sum of its items' weights against every
 * other picked weight, so picking a car moves money toward
 * getting around without anyone naming a percentage.
 *
 * Bills are left out of the weighing. They are fixed amounts and
 * get their own step.
 */
export function splitFromItems(picked: string[]): DraftEnvelope[] {
  const out: DraftEnvelope[] = [];

  for (const area of AREAS) {
    const weight = area.items
      .filter((i) => !i.bill && picked.includes(i.id))
      .reduce((a, i) => a + i.weight, 0);
    if (weight <= 0) continue;
    out.push({
      name: area.name,
      pct: weight,
      kind: area.kind,
      icon: area.icon,
      hue: area.hue,
    });
  }

  return makeHundred(out);
}

/** The items inside an area that a person has picked. */
export function pickedIn(area: Area, picked: string[]): AreaItem[] {
  return area.items.filter((i) => picked.includes(i.id));
}

/**
 * What opening an area ticks for you.
 *
 * The common answer, so the usual case is one tap and the rest
 * is correction. Not everything in the area, which would make
 * every area claim the same large share.
 */
export function suggestedIn(area: Area): string[] {
  const bills = area.items.filter((i) => i.bill).map((i) => i.id);
  const biggest = area.items
    .filter((i) => !i.bill)
    .sort((a, b) => b.weight - a.weight)[0];
  return biggest ? [...bills, biggest.id] : bills;
}

/** Everything a person is likely to want, so nobody starts at zero. */
export function defaultPicks(): string[] {
  return [
    "rent", "power", "groceries", "eating-out",
    "transit", "fun", "savings", "emergency",
  ];
}
