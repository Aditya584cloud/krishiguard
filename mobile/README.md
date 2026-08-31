# KrishiGuard — Mobile (Android)

A Capacitor-wrapped, mobile-optimized client for the same KrishiGuard backend
the web app (`../frontend`) uses. It is a fully independent frontend project —
it shares no files with `../frontend`, and building/running it never touches
the web app.

## Stack

- Vite + React 19 + TypeScript + Tailwind CSS v4 (same versions as `../frontend`)
- Capacitor 7 (Android platform added; iOS not buildable in this Linux dev
  environment — see "iOS" below)
- HashRouter (not BrowserRouter) — the bundle is loaded from a local asset
  origin on-device, with no server to handle SPA fallback routing

## What talks to the backend

`src/api/client.ts` calls the exact same REST endpoints as the web app
(`/api/farmers`, `/api/farmers/:id/analysis`, `/api/market`, `/api/advisory`,
`/api/distress`, `/api/farmers/:id/weather`) — no business logic, ML, or
distress/market computation is duplicated on-device. The 6-hour freshness
policy is enforced entirely server-side via `GET /api/farmers/:id/analysis`;
this app just displays whatever that endpoint returns, same as the web app.

There is no authentication in this prototype (the web app has none either) —
"which farmer" is tracked client-side by farmer ID, same mechanism the web
app uses (here: `localStorage['krishiguard.mobile.selectedFarmerId']`,
independent from the web app's own key).

## Configuring the backend URL

`VITE_API_BASE_URL` is read at **build** time (see `.env.example`). A device
or emulator is not the same machine as your dev backend, so `localhost` is
almost never correct:

- Android emulator → `http://10.0.2.2:8000` (the default in `.env`)
- Physical device on the same Wi-Fi → your machine's LAN IP, e.g. `http://192.168.1.23:8000`
- Production → the real deployed backend URL

After changing it: `npm run build && npx cap sync android`.

## Building

```bash
npm install
npm run build          # tsc -b && vite build -> dist/
npx cap sync android    # copies dist/ into the native Android project
```

### Android APK

Requires a JDK (17+) and the Android SDK (platform 35, build-tools 35.0.0).
Neither was preinstalled in this dev environment; both were downloaded
user-locally (no root) to build and verify a real APK during development:
JDK 21 → `~/.local/opt/jdk-21`, SDK → `~/.android-sdk`.

```bash
cd android
JAVA_HOME=/path/to/jdk-21 ANDROID_HOME=/path/to/android-sdk ./gradlew assembleDebug
# -> app/build/outputs/apk/debug/app-debug.apk (auto-signed with the Android debug key — installable)

./gradlew assembleRelease
# -> app/build/outputs/apk/release/app-release.apk
```

The release build is signed with `android/keystore/krishiguard-demo-release.keystore`,
a throwaway keystore generated for this prototype (see the comment in
`android/app/build.gradle`). **This is not a real production signing
identity.** A real deployment must generate its own keystore, store it
securely (never commit it), and keep its passwords out of `build.gradle`.

### iOS

Not buildable in this Linux dev environment — Capacitor's iOS platform
requires Xcode and CocoaPods, which only run on macOS. The project has not
had `npx cap add ios` run against it (running it here would produce a broken,
unusable platform folder rather than a real one, since there is no Xcode to
open or build it). On a Mac with Xcode installed:

```bash
npx cap add ios
npx cap sync ios
npx cap open ios   # then build/run from Xcode
```

## Local caching

`src/lib/cache.ts` caches the last successful `FarmerAnalysisResult` per
farmer in `localStorage`, purely so a farmer who loses signal still sees
their last-known assessment instead of a blank error screen. It is always
shown as "Cached {time} ago" (see `FreshnessBadge`), never presented as live
data, and is never the source of truth — the backend's `FarmerAnalysis`
table and its 6-hour policy remain authoritative.

## Android back button

`src/hooks/useAndroidBackButton.ts` wires the hardware/gesture back button
via `@capacitor/app`: it navigates back a screen if one is open, or exits the
app from the Dashboard root. No-ops outside a native Android shell.
