Goal: Package the existing STRV web app as a native iOS app in the App Store using Capacitor, with real push notifications, camera access for progress photos, and Apple Health integration.

---

Phase 1 — iOS web foundation
- Add a web app manifest (`public/manifest.webmanifest`) with app name, short name, theme/background colors, display mode, and icon references.
- Add iOS meta tags to `src/routes/__root.tsx`: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`, and a `theme-color` tag.
- Generate iOS app icon set from a single 1024×1024 source and place the files under `public/icons/`.
- Ensure the bottom navigation handles the iOS safe area (`env(safe-area-inset-bottom)`) and the status bar does not clip headers.
- Add a small in-app "Install the app" hint for users who visit in Safari before the native app ships.

Phase 2 — Capacitor integration
- Add `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`, and `@capacitor/preferences` to the project.
- Create `capacitor.config.ts` pointing the webDir at the Vite build output, with appId `com.strv.coach`, appName `STRV Coach`, and the server URL set to the Lovable published URL for the native build.
- Configure the build pipeline so Capacitor can consume the app: adjust the TanStack Start build to emit a static output into `dist/` (or a dedicated `capacitor-dist/` folder) that Capacitor can sync.
- Add npm scripts: `build:ios`, `sync:ios`, `open:ios`.
- Run the iOS platform addition once (`capacitor add ios`) so the `ios/` native project is generated and checked into the repo.
- Verify the app loads in the iOS simulator and that auth/session flows still work inside the WKWebView.

Phase 3 — Native features

Camera (progress photos)
- Add `@capacitor/camera`.
- Create a thin adapter in `src/lib/native/camera.ts` that requests permission, opens the native camera/photo picker, and returns a base64 or file URI.
- Update the weekly check-in and progress-photo flows so that on iOS they use the native camera when available, and fall back to the existing file picker on web.
- Save the captured image to the existing private `progress-photos` Supabase storage bucket.

Apple Health (steps, weight, workouts)
- Add `@capacitor/healthkit` or a community-maintained Capacitor HealthKit plugin.
- Request read permissions for steps, body weight, and mindful/wellness data categories.
- Add a Health sync option in Profile/Settings that lets the user authorize Apple Health and choose which metrics to read.
- On sync, pull the latest body weight into the daily check-in and the latest step count into the daily check-in steps field. Do not write back to Health without explicit permission.

Push notifications
- Add `@capacitor/push-notifications`.
- Configure Firebase Cloud Messaging for iOS: create an Apple App ID in the Apple Developer portal, enable Push Notifications, generate an APNs Auth Key (.p8), and upload it to Firebase.
- Add a Firebase iOS configuration file and the FCM SDK to the native iOS project.
- Create a server route or server function to store FCM device tokens per user (or use Supabase Realtime as a fallback). Use the token to send targeted daily check-in reminders, weekly check-in prompts, and coach insight notifications.
- Wire the coach notification system (`coach_notifications`) to send a push only when the user is not currently in the app.

Phase 4 — App Store submission
- Create an Apple Developer Program account (required; $99/year). You must do this step as the account owner because it involves DUNS/identity verification.
- Register the App ID `com.strv.coach` in Apple Developer → Certificates, Identifiers & Profiles.
- Create the App Store Connect record for STRV Coach, set up the required privacy policy URL, support URL, and app category (Health & Fitness).
- Generate a Privacy Manifest (`PrivacyInfo.xcprivacy`) for the iOS project describing data collection (health, photos, identifiers, usage data).
- Prepare App Store assets: 1024×1024 app icon, feature graphic, screenshots for 6.7" and 6.5" iPhone, 13" iPad, and a short app preview video.
- Build the app: `npm run build:ios` → `sync:ios` → open Xcode → Archive → Distribute via App Store Connect.
- Submit to TestFlight for internal testing, then submit to App Store Review.

---

Technical considerations
- TanStack Start is full-stack by default. Capacitor is easiest with a static frontend. We will configure the Vite build so the Capacitor app consumes a static export of the same UI while the backend stays on Lovable Cloud (Supabase + TanStack server functions). The native app will still use the Lovable backend for data, auth, AI, and storage.
- Web-based auth (Google/Apple OAuth) needs to complete inside the native app. We will keep the existing OAuth flow but ensure the redirect closes the in-app browser (SFSafariViewController) and returns to the app correctly.
- Push notifications require Apple Developer portal setup that cannot be done by Lovable; you will need to download the APNs key and paste it into Firebase, then upload the Firebase config.
- Apple HealthKit permissions require App Store review notes explaining why the data is being read and how it is used to personalize training/nutrition.

---

What you need to provide or decide
1. Apple Developer Program enrollment (or confirm you already have it).
2. Desired bundle identifier if `com.strv.coach` is not acceptable.
3. Whether you want Firebase Cloud Messaging for push, or a different provider (OneSignal, etc.).
4. A 1024×1024 app icon in PNG format without transparency, plus a splash-screen background image or solid color.
5. Privacy policy and support URLs for App Store Connect.

Out of scope (can be added later)
- App Store Optimization (ASO) copywriting and keyword strategy.
- Offline mode / local SQLite caching beyond Capacitor's Preferences.
- Native Apple Watch or iPad-specific layouts.
- In-app purchases / subscriptions through Apple.