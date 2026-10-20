# Engineering Nexus for Android: release handoff

This repository contains the installable web app foundation. The Android container is generated from the **live** HTTPS manifest with Google's Bubblewrap CLI. The current Next.js site must stay hosted; the Android package does not bundle or replace its Supabase backend.

## Already included

- `/manifest.webmanifest` from `src/app/manifest.ts`, scoped to `/`.
- 192 px, 512 px, and maskable launcher icons from the existing Engineering Nexus logo.
- Android theme color and mobile home screen metadata.
- `scripts/create-assetlinks.mjs`, which creates the domain verification file once the real package name and signing fingerprints are known.

## Inputs still required

1. Final HTTPS deployment URL, controlled by the publisher; use one stable host for links, sign in, the manifest and asset links.
2. Publisher's Play Console account and chosen Android package ID. Example **only**: `com.engineeringnexus.platform`. Confirm the real ID before creating the Play listing: a published package ID cannot be renamed.
3. Android signing key, stored securely outside this ZIP, and the **Play App Signing certificate** SHA-256 from Play Console. The local upload certificate can differ from the Play signing certificate.
4. Real owner/contact details and accurate privacy policy and Data safety answers; approved reviewer account with access to representative content.

## Generate the Android project after deploying the site

On a development machine with Node.js, JDK and Android SDK, install the current `@bubblewrap/cli` and, in a separate directory **outside the web project's `src` folder**, run:

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://YOUR_FINAL_HOST/manifest.webmanifest
```

Set the confirmed package ID and application name when prompted. Inspect `twa-manifest.json` and the generated `app/build.gradle`: for new phone app submissions in September 2026, `targetSdkVersion` must be **36 or newer**. Keep the signing keystore and passwords out of this repository and ZIP. Build an app bundle with:

```bash
bubblewrap build
```

Use the generated `.aab` for Google Play. Retain the signing key and generated Android project for future updates. After Play App Signing has assigned the app signing certificate, generate the verified-origin statement in the **web** project:

```bash
node scripts/create-assetlinks.mjs com.yourorg.engineeringnexus "AA:BB:...:FF"
```

Replace the example package/fingerprint with the actual values. If locally installed APK builds use a different certificate, pass its SHA-256 as a second fingerprint. Deploy the resulting `public/.well-known/assetlinks.json` and verify that `https://YOUR_FINAL_HOST/.well-known/assetlinks.json` returns HTTP 200 and the exact package and Play signing fingerprint. Rebuild/test on a phone: a failed association opens a browser Custom Tab instead of a fullscreen Trusted Web Activity.

## Play submission blockers to resolve before publishing

- This platform currently exposes a **HEMOX APK download** under `/dashboard` for eligible members. Google's Policy Coverage page says Play apps may not let users install other apps. Make a deliberate Play release decision: remove that installer route from the experience reachable in the published app, or replace it with a compliant Play listing when HEMOX has one. Do not submit the current unmodified experience. Keep ordinary research files accessible.
- Registration exists, but this archive does not implement an in-app account deletion path and an external deletion-request URL. Add a real deletion workflow covering Supabase Auth and associated data before submission; suspending an account is insufficient.
- Give reviewers an approved **non-admin demo account** and instructions for reaching courses, SILO, and other gated features. A pending account is insufficient for review.
- Validate narrow phone screens, sign-in/session persistence, internal navigation, download flows, a clear network error state, content policy, privacy policy, and Data safety disclosures. The PWA shell has no offline cache: it requires network access.

Current policy links: [target API](https://support.google.com/googleplay/android-developer/answer/11926878), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [app access for review](https://support.google.com/googleplay/android-developer/answer/9859455), [policy coverage](https://support.google.com/googleplay/android-developer/answer/10146128), [Bubblewrap commands](https://github.com/GoogleChromeLabs/bubblewrap/tree/main/packages/cli), and [Trusted Web Activities](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start).
