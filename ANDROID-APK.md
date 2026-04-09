# Android Build

This project now supports both test and release Android builds through Capacitor.

## Mobile API

The Android app must use a real hosted API URL.

Local file:

- `spl-frontend/.env.android.local`

Example:

```env
VITE_API_BASE_URL=https://your-domain.com/api
VITE_ENABLE_HERO_VIDEO=true
VITE_HERO_VIDEO_URL=
```

## Build commands

From `spl-frontend/`:

```powershell
npm run android:apk
```

Builds a debug APK:

- `android/app/build/outputs/apk/debug/app-debug.apk`

```powershell
npm run android:release:setup
```

Creates a local release keystore and signing properties if they do not already exist.

Local-only release signing files:

- `spl-frontend/android/keystore/spl-league-release.jks`
- `spl-frontend/android/keystore.properties`

These are gitignored on purpose.

```powershell
npm run android:release:apk
```

Builds a signed release APK:

- `android/app/build/outputs/apk/release/app-release.apk`

```powershell
npm run android:release:aab
```

Builds a signed Android App Bundle for Google Play:

- `android/app/build/outputs/bundle/release/app-release.aab`

```powershell
npm run android:release:all
```

Runs release setup, then builds both the signed release APK and the signed Play Store AAB.

## Android Studio

Open the native project with:

```powershell
npm run android:open
```

## Current app identity

- App name: `SPL League`
- App id: `com.spl.league`
- Android version name: `1.0.0`
- Android version code: `1`
