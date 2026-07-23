import type { CapacitorConfig } from "@capacitor/cli";

// STRV Coach — Capacitor iOS wrapper
// Build the web bundle first (`bun run build`), then run `bunx cap sync ios`
// and open Xcode with `bunx cap open ios`.
const config: CapacitorConfig = {
  appId: "com.strv.coach",
  appName: "STRV Coach",
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
  },
};

export default config;
