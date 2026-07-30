import type { CapacitorConfig } from "@capacitor/cli";

// STRYV Coach — Capacitor iOS wrapper
// Build the web bundle first (`bun run build`), then run `bunx cap sync ios`
// and open Xcode with `bunx cap open ios`.
const config: CapacitorConfig = {
  appId: "com.stryv.coach",
  appName: "STRYV Coach",
  webDir: "dist",
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0a0a",
    limitsNavigationsToAppBoundDomains: false,
  },
  // For fastest iteration during development you can point the native shell at
  // your Lovable published URL instead of shipping bundled HTML. Uncomment and
  // set to your production URL, then re-run `cap sync ios`.
  // server: {
  //   url: "https://your-app.lovable.app",
  //   cleartext: false,
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    // Capgo over-the-air updates. The API key is NEVER put here — it lives on
    // your Mac / CI as the CAPGO_TOKEN env var and is used by the capgo CLI.
    CapacitorUpdater: {
      autoUpdate: true,
      // Wait for the app to call notifyAppReady() before trusting a bundle;
      // if it never does, Capgo rolls back to the previous working bundle.
      appReadyTimeout: 10000,
      responseTimeout: 20,
      directUpdate: false,
    },
  },
};

export default config;
