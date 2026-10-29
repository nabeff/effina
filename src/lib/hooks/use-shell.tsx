"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  useSyncExternalStore,
} from "react";
import { shiftMonth, thisMonth } from "@/lib/budget";

/**
 * The two things the header owns that the pages also need.
 *
 * Which month you are looking at, and whether figures are
 * hidden. Both live here because the header changes them and
 * every page reads them, and passing either down through ten
 * components would be worse than one small context.
 *
 * Both survive a reload. A hidden figure that reappears on
 * refresh is not private, and a month you picked that snaps back
 * to today is just annoying.
 */

interface Shell {
  month: string;
  /** today's month, empty until mounted */
  today: string;
  setMonth: (m: string) => void;
  stepMonth: (by: number) => void;
  atToday: boolean;
  /** true when amounts should be blurred */
  priv: boolean;
  togglePriv: () => void;
}

const Ctx = createContext<Shell | null>(null);

const PRIV_KEY = "effina.privacy";

/* a tiny store, so the toggle and every reader stay in step */
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn();
}

function readPriv() {
  try {
    return window.localStorage.getItem(PRIV_KEY) === "1";
  } catch {
    return false;
  }
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  /* Both are read in the initialiser rather than an effect.
     This provider is a client component that never prerenders,
     so there is no server render to disagree with, and reading
     them here avoids a second render on every load. */
  const [month, setMonth] = useState<string | null>(null);
  /* The server cannot know what this browser stored, so the
     first client render has to agree with it and correct itself
     after. useSyncExternalStore is exactly that, with no flash
     of the wrong icon and no hydration warning. */
  const priv = useSyncExternalStore(subscribe, readPriv, () => false);

  const togglePriv = useCallback(() => {
    try {
      window.localStorage.setItem(PRIV_KEY, readPriv() ? "0" : "1");
    } catch {
      /* a blocked store just means the choice is not remembered */
    }
    emit();
  }, []);

  /* the flag lives on the document, so a figure inside a sheet
     or a popover is covered by the same rule */
  useEffect(() => {
    document.documentElement.dataset.private = priv ? "1" : "0";
  }, [priv]);

  const stepMonth = useCallback((by: number) => {
    setMonth((m) => shiftMonth(m ?? thisMonth(), by));
  }, []);

  /* What today is depends on the clock, which the build does not
     share with the browser, so the server answers with nothing
     and the browser corrects it on hydration. */
  const now = useSyncExternalStore(
    () => () => {},
    thisMonth,
    () => null,
  );

  const value = useMemo(() => {
    const current = month ?? now ?? "";
    return {
      month: current,
      today: now ?? "",
      setMonth,
      stepMonth,
      atToday: !month || month === now,
      priv,
      togglePriv,
    };
  }, [month, now, stepMonth, priv, togglePriv]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShell(): Shell {
  const v = useContext(Ctx);
  if (!v) {
    /* a page rendered outside the shell still works, it just
       shows today and hides nothing */
    return {
      month: thisMonth(),
      today: thisMonth(),
      setMonth: () => {},
      stepMonth: () => {},
      atToday: true,
      priv: false,
      togglePriv: () => {},
    };
  }
  return v;
}
