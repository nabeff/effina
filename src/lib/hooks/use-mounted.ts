"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False while rendering on the server and during hydration, true
 * afterwards.
 *
 * Anything derived from today's date differs between the build and
 * the browser, so reading it during prerender bakes a stale month
 * into the HTML. useSyncExternalStore gives the two answers
 * directly, rather than setting state inside an effect and
 * rendering twice.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
