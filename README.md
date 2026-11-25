# SubTracker

Offline-first subscription tracker built with Expo (SDK 58), Expo Router and TypeScript.

## Features (MVP)

- Add, edit and delete subscriptions (name, price, currency, billing cycle, first billing date, category, notes)
- Renewal dates calculated automatically from the first billing date (weekly / monthly / quarterly / yearly, month-end safe)
- Tags you create yourself (e.g. Work, Family plan): add them on the add/edit screen, then filter the list by tag; the totals follow the filter
- Dashboard: monthly and yearly totals, spend by category, renewals in the next 30 days
- Multi-currency: each subscription keeps its own currency; totals are converted to a display currency using editable rates
- Local renewal reminders at 9:00 AM, 0/1/3/7 days before renewal (iOS and Android)
- Data is stored only on the device (AsyncStorage)
- Backup and restore: export a JSON backup and import it with merge or replace; export a CSV spreadsheet

## Run

```bash
npm install
npm start          # then press i / a, or scan the QR code with Expo Go
npm run web
```

Checks: `npm run typecheck` and `npm run lint`.

## Structure

```
src/app/                  routes (Expo Router)
  (tabs)/index.tsx        subscription list
  (tabs)/dashboard.tsx    spend breakdown
  (tabs)/settings.tsx     display currency, exchange rates, test reminder
  subscription/new.tsx    add (modal)
  subscription/[id].tsx   edit and delete (modal)
src/components/           form, card, chips, date field
src/lib/billing.ts        renewal date maths and totals
src/lib/currency.ts       currencies, conversion, formatting
src/lib/reminders.ts      notification scheduling
src/lib/backup.ts         backup format, validation, merge, CSV
src/lib/tags.ts           tag cleaning, de-duplication, filtering
src/lib/fileTransfer.ts   share sheet / document picker / web download
src/store/useStore.ts     zustand store, persisted to AsyncStorage
```

Reminders are rebuilt from the data whenever subscriptions change and on every launch. Each subscription gets its next 3 renewals scheduled, capped at 60 notifications in total because iOS limits pending notifications to 64.

## Web version

The same code runs in the browser (react-native-web). On web, data is saved in the browser's local storage, renewal reminders are hidden (browsers can't schedule them), and backups download as files.

```bash
npm run web                          # dev server at http://localhost:8081
npx expo export --platform web       # static single-page build in dist/
```

Live at **https://subtrackerapp.expo.app** (EAS Hosting, project `@udit2504/sub-tracker`).

To publish changes: `npm run deploy:web` (needs `npx expo login` as udit2504).

## Release builds (EAS)

App IDs: `com.udit0425.subtracker` (iOS bundle ID and Android package). These cannot be changed after the first store upload.

```bash
npx eas-cli@latest login
npx eas-cli@latest init                                # links the project to your Expo account
npx eas-cli@latest build --profile preview -p android  # installable APK for testing
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit -p ios                       # or -p android
```

Build numbers are managed remotely by EAS and increase automatically for production builds.

## Android APK download (GitHub Actions)

Every push to `main` runs `.github/workflows/build-apk.yml`, which builds a signed APK and publishes it as the latest GitHub release. The web version shows a **Download APK** banner (web only, hidden on iPhone and iPad) that links to:

https://github.com/udit0425/subTrackingApp/releases/latest/download/subtracker.apk

The workflow needs four repository secrets (Settings → Secrets and variables → Actions): `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Keep a copy of the keystore: every APK must be signed with the same key, or phones can't install the update over the existing app (and uninstalling deletes the app's data).

## iPhone (Home Screen web app)

There is no iOS build yet. On iPhone, open the website in Safari and tap Share → **Add to Home Screen**: it opens full screen with its own icon, and data stays in that phone's browser storage. Reminders don't work there. The website shows iPhone visitors this tip in place of the APK banner, and hides it once opened from the Home Screen.

Files in `public/` are copied into the web build: `index.html` (page template with the Home Screen tags), `manifest.json`, and the icons.
