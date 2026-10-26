"use client";

import { useEffect } from "react";
import { useBudget } from "@/lib/hooks/use-budget";

/**
 * Stamps the saved look onto the root element. The tokens in
 * globals.css do all the work, so changing the accent redefines
 * --primary and every green element follows with no component
 * touched.
 */
export function Appearance() {
  const { data } = useBudget();
  const s = data?.settings;

  useEffect(() => {
    if (!s) return;
    const root = document.documentElement;

    root.dataset.accent = s.accent || "green";
    root.dataset.radius = s.radius || "round";

    /* "system" leaves both classes off, so the media query in
       globals.css decides */
    root.classList.remove("dark", "light");
    if (s.theme === "dark" || s.theme === "light") root.classList.add(s.theme);
  }, [s]);

  return null;
}
