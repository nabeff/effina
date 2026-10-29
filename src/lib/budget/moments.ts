/**
 * The island's moments.
 *
 * Little things it does when something happens or when enough
 * time has passed. The rules that keep them from becoming
 * annoying live here, away from the animation, because "never
 * more than one at a time" and "not again for five minutes" are
 * decisions rather than drawings.
 */

export type MomentKind =
  | "ripple"
  | "greeting"
  | "blink"
  | "received"
  | "spent"
  | "goal"
  | "dayClosed";

export interface Moment {
  kind: MomentKind;
  /** the line it shows, if it takes over the island */
  text?: string;
  /** the figure it animates to */
  value?: number;
  /** how long it holds the island, in ms. 0 means it only
      decorates the dot and never widens anything. */
  hold: number;
}

/** how long before the same kind may play again */
export const COOLDOWN: Record<MomentKind, number> = {
  ripple: 10 * 60_000,
  greeting: 6 * 60 * 60_000,
  blink: 90_000,
  received: 60_000,
  spent: 5_000,
  goal: 60_000,
  dayClosed: 60 * 60_000,
};

/** an event outranks an ambient flourish, always */
const RANK: Record<MomentKind, number> = {
  received: 0,
  goal: 1,
  dayClosed: 2,
  spent: 3,
  greeting: 4,
  ripple: 5,
  blink: 6,
};

/**
 * Decides whether a moment may play right now.
 *
 * One at a time, and never the same kind twice inside its own
 * cooldown. A moment that is refused is dropped rather than
 * queued forever, because a celebration that arrives ten
 * minutes late is worse than one that never arrives.
 */
export function mayPlay(
  kind: MomentKind,
  state: { playing: MomentKind | null; lastAt: Partial<Record<MomentKind, number>> },
  now = Date.now(),
): boolean {
  if (state.playing) {
    /* an event may interrupt a flourish, never the reverse */
    if (RANK[kind] >= RANK[state.playing]) return false;
  }
  const last = state.lastAt[kind];
  if (last !== undefined && now - last < COOLDOWN[kind]) return false;
  return true;
}

/** Which greeting the hour deserves, or none outside those hours. */
export function greetingFor(now = new Date()): Moment | null {
  const h = now.getHours();
  if (h >= 5 && h < 12) {
    return { kind: "greeting", text: "Good morning", hold: 2600 };
  }
  if (h >= 18 && h < 24) {
    return { kind: "greeting", text: "Good evening", hold: 2600 };
  }
  return null;
}

/** Sorts a handful of moments so the most important plays. */
export function pick(moments: Moment[]): Moment | null {
  if (!moments.length) return null;
  return [...moments].sort((a, b) => RANK[a.kind] - RANK[b.kind])[0];
}
