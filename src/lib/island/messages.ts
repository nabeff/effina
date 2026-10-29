/**
 * What Mazaj says.
 *
 * Every line the island can show lives here, so the wording can
 * be changed without going near the logic that picks it.
 *
 * The voice is a calm assistant who already knows your money and
 * what time it is. Short, warm, useful. Never a bare number, and
 * never a scolding, because somebody looking at their budget at
 * eleven at night does not need a lecture.
 *
 * Rules the wording follows:
 *   about five words closed, a sentence open
 *   no exclamation marks, no emoji, no guilt
 *   every figure comes from real data, never invented
 */

export type Slot =
  | "setup"
  | "overspent"
  | "billToday"
  | "billSoon"
  | "received"
  | "goalClose"
  | "goalReached"
  | "monthEnd"
  | "free"
  | "dayClosedUnder"
  | "dayClosedOver"
  | "calm";

export type PartOfDay = "morning" | "day" | "evening" | "night";

/** what a line can be given to work with */
export interface Facts {
  /** formatted already, so the wording never does arithmetic */
  amount?: string;
  name?: string;
  days?: number;
  when?: string;
}

interface Phrasing {
  /** the closed island, about five words */
  short: (f: Facts) => string;
  /** the open panel, one sentence */
  long: (f: Facts) => string;
}

/**
 * Several phrasings per slot, so the same situation does not
 * read identically every time it comes up. Which one is chosen
 * is decided by the caller, not at random, so a line does not
 * change while somebody is reading it.
 */
export const MESSAGES: Record<Slot, Partial<Record<PartOfDay, Phrasing[]>> & { any: Phrasing[] }> = {
  setup: {
    any: [
      {
        short: () => "Let's set up your budget",
        long: () =>
          "A few questions about what you earn and what leaves every month, and this page fills itself in.",
      },
    ],
  },

  overspent: {
    any: [
      {
        short: (f) => `${f.name} is getting tight`,
        long: (f) =>
          `${f.name} has gone ${f.amount} past its share this month. You can move money to it from the rebalance screen.`,
      },
      {
        short: (f) => `${f.name} went over`,
        long: (f) =>
          `${f.name} is ${f.amount} over. Nothing is broken, it just needs topping up from somewhere else.`,
      },
    ],
    evening: [
      {
        short: () => "Slightly over today, it's fine",
        long: (f) =>
          `${f.name} is ${f.amount} over this month. Tomorrow is a fresh day for it.`,
      },
    ],
  },

  billToday: {
    any: [
      {
        short: (f) => `${f.name} is due today`,
        long: (f) => `${f.name} is due today, ${f.amount}.`,
      },
    ],
    morning: [
      {
        short: (f) => `${f.name} is due today`,
        long: (f) => `${f.name} comes out today, ${f.amount}. Worth knowing before you spend.`,
      },
    ],
  },

  billSoon: {
    any: [
      {
        short: (f) => `${f.name} on ${f.when}`,
        long: (f) => `${f.name} is due on ${f.when}, ${f.amount}.`,
      },
      {
        short: (f) => `${f.name} in ${f.days} days`,
        long: (f) => `${f.name} is ${f.amount}, due in ${f.days} days.`,
      },
    ],
    evening: [
      {
        short: (f) => `Tomorrow: ${f.name}`,
        long: (f) => `${f.name} is due tomorrow, ${f.amount}.`,
      },
    ],
  },

  received: {
    any: [
      {
        short: () => "Salary just landed",
        long: (f) => `${f.amount} came in. It is already divided across your envelopes.`,
      },
      {
        short: (f) => `${f.amount} came in`,
        long: (f) => `${f.amount} has landed and been split the way you set it up.`,
      },
    ],
  },

  goalClose: {
    any: [
      {
        short: (f) => `${f.name} is almost there`,
        long: (f) => `${f.amount} left on ${f.name}.`,
      },
    ],
  },

  goalReached: {
    any: [
      {
        short: (f) => `You hit ${f.name}`,
        long: (f) => `${f.name} is fully saved. That one is done.`,
      },
    ],
  },

  monthEnd: {
    any: [
      {
        short: (f) => `${f.days} days left, looking good`,
        long: (f) => `${f.days} days left and ${f.amount} still to spend. Comfortable.`,
      },
      {
        short: (f) => `Last stretch, ${f.amount} to go`,
        long: (f) => `${f.days} days left with ${f.amount} in hand.`,
      },
    ],
  },

  free: {
    morning: [
      {
        short: (f) => `Morning, ${f.amount} for today`,
        long: (f) => `${f.amount} to spend today, and the month is on track.`,
      },
      {
        short: () => "New day, you're on track",
        long: (f) => `${f.amount} for today. Nothing needs you yet.`,
      },
    ],
    day: [
      {
        short: (f) => `Still ${f.amount} for today`,
        long: (f) => `${f.amount} left for today. You are keeping pace.`,
      },
    ],
    evening: [
      {
        short: (f) => `${f.amount} left tonight`,
        long: (f) => `${f.amount} still unspent today.`,
      },
    ],
    night: [
      {
        short: (f) => `${f.amount} left for today`,
        long: (f) => `${f.amount} unspent, and the day is nearly over.`,
      },
    ],
    any: [
      {
        short: (f) => `${f.amount} free today`,
        long: (f) => `${f.amount} to spend today.`,
      },
    ],
  },

  dayClosedUnder: {
    any: [
      {
        short: (f) => `Quiet day, ${f.amount} saved`,
        long: (f) => `You came in ${f.amount} under today. That goes back into the month.`,
      },
    ],
  },

  dayClosedOver: {
    any: [
      {
        short: () => "A bit over today, it's fine",
        long: (f) => `Today went ${f.amount} over. The month can still absorb it.`,
      },
    ],
  },

  calm: {
    any: [
      {
        short: () => "All good today",
        long: () => "Nothing needs you right now.",
      },
    ],
    morning: [
      {
        short: () => "Morning, all is well",
        long: () => "Nothing needs you this morning.",
      },
    ],
    evening: [
      {
        short: () => "Quiet evening",
        long: () => "Nothing needs you tonight.",
      },
    ],
  },
};

/** Which part of the day it is, by the clock on this device. */
export function partOfDay(now = new Date()): PartOfDay {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "day";
  if (h >= 18 && h < 23) return "evening";
  return "night";
}

/**
 * Picks the wording for a slot.
 *
 * The variation is chosen by a seed rather than at random, so
 * the same situation on the same day reads the same way and a
 * line never changes under somebody's eyes.
 */
export function phrase(
  slot: Slot,
  facts: Facts,
  opts: { part?: PartOfDay; seed?: number } = {},
): { short: string; long: string } {
  const part = opts.part ?? partOfDay();
  const group = MESSAGES[slot];
  const options = group[part]?.length ? group[part]! : group.any;
  const pick = options[Math.abs(opts.seed ?? 0) % options.length];
  return { short: pick.short(facts), long: pick.long(facts) };
}
