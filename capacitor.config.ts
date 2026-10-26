import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The native shell.
 *
 * It loads the deployed site rather than bundling the app, because
 * this is a Next server app: the auth callback, the proxy and the
 * Supabase session all need a server, and a static export would
 * drop them.
 *
 * What the wrapper adds is the parts a browser tab cannot have: a
 * home screen icon, the native status bar, a splash screen, and a
 * path to the App Store.
 */
const config: CapacitorConfig = {
  appId: "com.nabileffina.app",
  appName: "Nabil Effina",
  webDir: "public",
  server: {
    url: "https://effina.vercel.app",
    cleartext: false,
  },
  backgroundColor: "#000000",
  ios: {
    contentInset: "always",
    backgroundColor: "#000000",
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: "#000000",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#000000",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
      overlaysWebView: true,
    },
  },
};

export default config;
