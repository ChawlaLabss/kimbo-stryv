# Launching STRYV Coach on iOS

This app is a web app wrapped as a native iOS app with **Capacitor**. Everything
below runs on your **Mac with Xcode installed** — Lovable can't compile or
submit iOS binaries.

---

## 0. One-time accounts & tools

- [ ] Enroll in the **Apple Developer Program** — $99/year. https://developer.apple.com/programs/
- [ ] Install **Xcode** (App Store) and open it once so it installs command line tools.
- [ ] Install **CocoaPods**: `sudo gem install cocoapods`
- [ ] Install **Node/Bun** and clone this repo locally (export from Lovable → GitHub).

---

## 1. Install Capacitor & sync iOS project

From the project root on your Mac:

```bash
bun install
bun add @capacitor/core @capacitor/ios @capacitor/preferences \
        @capacitor/camera @capacitor/push-notifications \
        @capacitor/splash-screen @capacitor/status-bar
bun add -D @capacitor/cli

# Build the web bundle
bun run build

# Create the native iOS project (run once)
bunx cap add ios

# Sync web assets into the native project
bunx cap sync ios

# Open in Xcode
bunx cap open ios
```

The `ios/` folder is now a real Xcode project. Commit it to git.

---

## 2. Configure signing in Xcode

1. Select the **App** target → **Signing & Capabilities**.
2. Team: your Apple Developer team.
3. Bundle Identifier: `com.stryv.coach` (change in `capacitor.config.ts` if taken).
4. Click **+ Capability** and add:
   - **Push Notifications**
   - **HealthKit** (check "Clinical Health Records" off unless needed)
   - **Background Modes** → check *Remote notifications*

---

## 3. Info.plist permission strings

Xcode → `App/Info.plist` → add these keys (Apple **rejects** the build without them):

| Key | Value |
| --- | --- |
| `NSCameraUsageDescription` | "STRYV uses the camera to capture progress photos for your weekly check-in." |
| `NSPhotoLibraryUsageDescription` | "STRYV lets you attach progress photos from your library." |
| `NSPhotoLibraryAddUsageDescription` | "STRYV can save progress photos back to your library." |
| `NSHealthShareUsageDescription` | "STRYV reads body weight and steps from Apple Health to personalize your training." |
| `NSHealthUpdateUsageDescription` | "STRYV can log workouts to Apple Health when you complete a session." |

---

## 4. Push notifications (APNs + FCM)

1. Apple Developer → **Keys** → create an **APNs Auth Key** (.p8). Note the Key ID and Team ID.
2. Create a **Firebase** project → add an iOS app with bundle id `com.stryv.coach`.
3. Firebase → Project settings → **Cloud Messaging** → upload the `.p8` + Key ID + Team ID.
4. Download `GoogleService-Info.plist` and drag it into the Xcode `App/` group.
5. In `AppDelegate.swift` initialize Firebase (`FirebaseApp.configure()`).
6. In-app: on login, call `PushNotifications.register()` and POST the token to a
   `device_tokens` table (I can wire this next once you confirm Firebase details).

---

## 5. Apple HealthKit

Use the community plugin `@perfood/capacitor-healthkit` (well maintained):

```bash
bun add @perfood/capacitor-healthkit
bunx cap sync ios
```

Then request read permission for `HKQuantityTypeIdentifierBodyMass` and
`HKQuantityTypeIdentifierStepCount` from a new "Connect Apple Health" button in
Profile → Settings. On success, prefill daily check-in weight and steps.

---

## 6. App Store submission

1. https://appstoreconnect.apple.com → **My Apps** → **+** → New App.
2. Fill: name (STRYV Coach), primary language, bundle ID, SKU, category **Health & Fitness**.
3. Add app icon (1024×1024, no alpha), screenshots (6.7" required), privacy
   policy URL, support URL, description.
4. Complete the **App Privacy** questionnaire (Health data, Photos, Identifiers, Usage data).
5. In Xcode: **Product → Archive → Distribute App → App Store Connect → Upload**.
6. Once processed, add the build to **TestFlight** for internal testing.
7. When ready, submit for App Store Review (usually 24–72h).

---

## 7. Ongoing dev loop

After any code change in Lovable / GitHub:

```bash
git pull
bun install
bun run build
bunx cap sync ios
# Xcode → Product → Run  (or Archive + upload for a new TestFlight build)
```

---

## What's already done in this repo

- `capacitor.config.ts` — Capacitor project config with bundle id, splash, push options.
- `public/manifest.webmanifest` — web app manifest so Safari "Add to Home Screen" also works pre-launch.
- iOS meta tags in `src/routes/__root.tsx` (status bar, apple-touch-icon, theme color).
- Safe-area padding on the bottom nav so the tab bar clears the iPhone home indicator.

## What still needs your input

1. Apple Developer team ID and preferred bundle identifier.
2. Confirm push provider (Firebase FCM assumed).
3. A **1024×1024 PNG app icon** (no transparency, no rounded corners — Apple applies the mask).
4. Privacy policy + support URL for App Store Connect.
