"use client";

import { useEffect } from "react";

/**
 * The parts that only exist inside the native shell.
 *
 * Everything is loaded on demand and wrapped, so the browser build
 * never pulls in Capacitor and a failure here can never stop the
 * web app from rendering.
 */
export function Native() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled || !Capacitor.isNativePlatform()) return;

        document.documentElement.dataset.native = Capacitor.getPlatform();

        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

        /* held until the page is actually painted, so the app never
           shows a blank frame between the splash and the figures */
        const { SplashScreen } = await import("@capacitor/splash-screen");
        await SplashScreen.hide().catch(() => {});
      } catch {
        /* not a native build, or a plugin is missing. Either way
           the web app is already working. */
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}

/**
 * A short tap, for actions worth feeling. Silent everywhere it is
 * not available, which includes every browser.
 */
export async function tap() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* haptics are a nicety, never a requirement */
  }
}
