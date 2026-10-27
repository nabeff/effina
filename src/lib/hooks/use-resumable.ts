"use client";

import { useEffect, useState } from "react";

/**
 * State that survives a refresh.
 *
 * Setup asks several questions before it writes anything, so a
 * reload halfway through used to throw the answers away and
 * start again. This keeps them in the browser until the wizard
 * finishes, then clears them.
 *
 * It is deliberately not the database. Nothing from setup is
 * saved to the account until the last step, so a half filled
 * form should not live there either.
 */
export function useResumable<T>(key: string, initial: () => T) {
  /* read once, lazily. The server has no storage, and this only
     ever runs in a component the server never renders. */
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      /* a corrupt or blocked store just means a fresh start */
    }
    return initial();
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode, or the quota is full. Not worth failing. */
    }
  }, [key, value]);

  const clear = () => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  };

  return [value, setValue, { clear }] as const;
}
