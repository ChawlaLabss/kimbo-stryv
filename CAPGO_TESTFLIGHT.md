# STRYV on TestFlight (with Capgo live updates)

## What Capgo does and does not do

- **Does:** push new JS/HTML/CSS bundles straight to installed apps (TestFlight
  or App Store) without a new Apple review or upload.
- **Does NOT:** replace the Apple Developer Program, Xcode signing, or the first
  binary upload. Apple requires a real, signed `.ipa` to exist on App Store
  Connect before TestFlight has anything to distribute.

So the order is: **pay Apple → build & upload once → then Capgo for everything after.**

---

## 0. Prerequisites

- [ ] Apple Developer Program membership ($99/yr) — https://developer.apple.com/programs/
- [ ] A Mac with Xcode + CocoaPods (`sudo gem install cocoapods`)
- [ ] The repo cloned locally (Lovable → GitHub → clone)
- [ ] Your Capgo API key

Store the Capgo key as an environment variable — never commit it:

```bash
echo 'export CAPGO_TOKEN="your-capgo-api-key"' >> ~/.zshrc
source ~/.zshrc
```

---

## 1. Install dependencies

```bash
bun install
bun add @capacitor/core @capacitor/ios @capgo/capacitor-updater
bun add -D @capacitor/cli @capgo/cli
```

---

## 2. Build the web bundle and create the iOS project

```bash
bun run build          # outputs to dist/
bunx cap add ios       # run once
bunx cap sync ios
bunx cap open ios
```

---

## 3. Sign the app in Xcode

1. Select the **App** target → **Signing & Capabilities**.
2. **Team:** your paid Apple Developer team (not "Personal Team" — that can't
   reach TestFlight).
3. **Bundle Identifier:** `com.stryv.coach` (must match `capacitor.config.ts`
   and the App ID you register in the Apple Developer portal).
4. Add the Info.plist permission strings listed in `IOS_LAUNCH.md` — Apple
   rejects builds that use camera/health without them.

---

## 4. Create the App Store Connect record

1. https://appstoreconnect.apple.com → **My Apps** → **+** → **New App**
2. Name: `STRYV Coach`, Bundle ID: `com.stryv.coach`, SKU: anything unique,
   Category: **Health & Fitness**.
3. You do **not** need screenshots or a description for TestFlight internal
   testing — only for App Store review later.

---

## 5. Upload the first build

In Xcode:

1. Set the device selector to **Any iOS Device (arm64)**.
2. **Product → Archive**
3. In the Organizer: **Distribute App → App Store Connect → Upload**.
4. Wait ~10–20 min for processing, then App Store Connect → your app →
   **TestFlight**.
5. Internal testers (up to 100 people on your team) get it immediately.
   External testers need a short Beta App Review (usually <24h).

Bump `CFBundleShortVersionString` / build number in Xcode before every new
archive, or the upload is rejected as a duplicate.

---

## 6. Wire up Capgo

Log in and register the app (one time):

```bash
bunx @capgo/cli login $CAPGO_TOKEN
bunx @capgo/cli app add com.stryv.coach
```

Tell the app to confirm a bundle booted correctly — add this to your app entry
(otherwise Capgo assumes the update is broken and rolls back):

```ts
import { CapacitorUpdater } from "@capgo/capacitor-updater";
CapacitorUpdater.notifyAppReady();
```

Then re-sync so the native project picks up the plugin:

```bash
bunx cap sync ios
```

Archive and upload **once more** so TestFlight has a build containing the Capgo
plugin. Everything after this is over-the-air.

---

## 7. The ongoing loop (no Xcode, no Apple review)

After any change in Lovable:

```bash
git pull
bun install
bun run build
bunx @capgo/cli bundle upload --channel production
```

Testers get the update on next app launch. Useful extras:

```bash
bunx @capgo/cli bundle list                      # see uploaded bundles
bunx @capgo/cli channel set production --bundle 1.0.3
bunx @capgo/cli bundle delete 1.0.3              # roll back by removing a bad bundle
```

---

## Rules Apple enforces on live updates

Capgo updates are allowed under App Store guideline 3.3.2 as long as you only
change JS/HTML/CSS. You may **not** use it to add native capabilities, change
the app's core purpose, or ship features that were hidden during review. Any
native change (new Capacitor plugin, new permission, new capability) requires a
fresh Xcode archive and upload.

---

## What I need from you to go further

1. Confirm you've enrolled in the Apple Developer Program.
2. Confirm the bundle id `com.stryv.coach` is what you registered.
3. A 1024×1024 PNG app icon (no transparency, no rounded corners).
