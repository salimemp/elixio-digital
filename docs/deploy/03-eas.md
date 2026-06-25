# Step 3 — Build the Mobile App with EAS

This builds the iOS and Android apps via Expo Application Services (EAS). End state: an internal distribution build you can install on your phone, and a one-time setup of the production build pipeline.

## 3.1 Install the EAS CLI

```bash
npm install -g eas-cli
eas login
```

This opens a browser. Sign in with the Expo account you created in pre-flight.

## 3.2 Initialize EAS in the mobile project

```bash
cd apps/mobile
eas init
```

This will:
- Link the project to Expo's cloud
- Print a project ID. Copy it.

## 3.3 Wire the project ID into app.json

Open `apps/mobile/app.json` and replace the placeholder:

```json
"extra": {
  "apiUrl": "",
  "eas": {
    "projectId": "<paste-the-project-id-here>"
  }
}
```

Commit this change.

## 3.4 Add an `eas.json` to apps/mobile

The repo doesn't ship with one (it's project-specific). Create `apps/mobile/eas.json`:

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_API_URL": "https://staging.api.elixio.digital" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "env": { "EXPO_PUBLIC_API_URL": "https://api.elixio.digital" }
    },
    "production": {
      "env": { "EXPO_PUBLIC_API_URL": "https://api.elixio.digital" }
    }
  },
  "submit": {
    "production": {
      "ios": { "ascAppId": "<your-apple-app-store-connect-app-id>" },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

The `serviceAccountKeyPath` is for Play Console submission; skip until you wire it.

## 3.5 Build a preview (internal distribution)

This is the build you install on your phone to test before the public release.

```bash
cd apps/mobile
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

First build takes 15–30 minutes. EAS emails you when it's done, or you can watch at https://expo.dev/accounts/<you>/projects/elixio-digital/builds.

Once the iOS build completes:
- EAS gives you an install link.
- Open it on your iPhone → installs via TestFlight (you may need to register your device UDID in your Apple Developer account first; EAS walks you through this).
- Open the app → it points at `https://api.elixio.digital` → sign in with the admin you bootstrapped.

## 3.6 Submit to the App Stores (later)

When you're ready to ship publicly:

### iOS

1. **App Store Connect** → https://appstoreconnect.apple.com → **My Apps** → **+** → **New App** → fill in name, primary language, bundle ID (`com.elixio.digital`).
2. Copy the **Apple ID** (a 10-digit number) into `eas.json` `submit.production.ios.ascAppId`.
3. **EAS Submit** will then push the build to App Store Connect for review. Apple requires IAP for digital content sold in-app. The plan is to **link out to the web checkout** (a `WebBrowser.openAuthSessionAsync` call) so the IAP 30% cut doesn't apply. Document this in App Review notes.

### Android

1. **Google Play Console** → https://play.google.com/console → **Create app** → fill in details.
2. **Setup** → **API access** → create a service account with the **Release Manager** role.
3. Download the JSON key → save as `apps/mobile/google-service-account.json` (DO NOT commit).
4. EAS Submit uses that key to push the build to the internal test track.

## 3.7 Common issues

- **"No bundle identifier set"** → you skipped step 3.3. Add the EAS project ID to `app.json`.
- **"Apple developer account doesn't have this device registered"** → register your device's UDID at https://developer.apple.com/account/resources/devices/list, then rebuild.
- **Build fails on "expo-crypto" or "expo-secure-store"** → these are Expo config plugins; EAS picks them up automatically. If you ever eject to a bare workflow, you'd need to add them manually to `ios/Podfile` and `android/settings.gradle`.

## ✅ Done when

- An iOS preview build is installed on your phone and you can sign in.
- An Android preview APK is installed on a device or emulator and you can sign in.
- `eas.json` is committed with the right `EXPO_PUBLIC_API_URL` for each profile.

## Next

→ [04-dns-domain.md](./04-dns-domain.md) — point `elixio.digital` at Cloudflare Pages and `api.elixio.digital` at Railway.
