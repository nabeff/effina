"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COOLDOWN, greetingFor, mayPlay, type Moment, type MomentKind,
} from "@/lib/budget";

/**
 * Runs the island's moments.
 *
 * One at a time, each on its own cooldown, and none at all when
 * the person has asked for less motion. The rules themselves
 * live in lib/budget/moments, so this only has to schedule
 * them and remember what played when.
 */

const AMBIENT_EVERY = 10 * 60_000;
const IDLE_BLINK_AFTER = 45_000;

export function useMoments({ enabled = true }: { enabled?: boolean } = {}) {
  const [moment, setMoment] = useState<Moment | null>(null);
  const lastAt = useRef<Partial<Record<MomentKind, number>>>({});
  const playing = useRef<MomentKind | null>(null);

  const play = useCallback(
    (m: Moment) => {
      if (!enabled) return false;
      if (!mayPlay(m.kind, { playing: playing.current, lastAt: lastAt.current })) {
        return false;
      }
      playing.current = m.kind;
      lastAt.current[m.kind] = Date.now();
      setMoment(m);
      /* a decoration clears quickly, a takeover holds its line */
      const hold = m.hold || 1900;
      setTimeout(() => {
        playing.current = null;
        setMoment((cur) => (cur === m ? null : cur));
      }, hold);
      return true;
    },
    [enabled],
  );

  /* the ambient ripple, and the greeting on the first open */
  useEffect(() => {
    if (!enabled) return;
    const hello = greetingFor();
    if (hello) {
      const t = setTimeout(() => play(hello), 900);
      return () => clearTimeout(t);
    }
  }, [enabled, play]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => play({ kind: "ripple", hold: 1900 }), AMBIENT_EVERY);
    return () => clearInterval(t);
  }, [enabled, play]);

  /* a blink once nothing has happened for a while */
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => play({ kind: "blink", hold: 400 }), IDLE_BLINK_AFTER);
    };
    reset();
    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [enabled, play]);

  return { moment, play, cooldowns: COOLDOWN };
}
