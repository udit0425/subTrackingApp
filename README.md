# SubTracker

Offline-first subscription tracker built with Expo (SDK 58), Expo Router and TypeScript.

## Features (MVP)

- Add, edit and delete subscriptions (name, price, currency, billing cycle, first billing date, category, notes)
- Renewal dates calculated automatically from the first billing date (weekly / monthly / quarterly / yearly, month-end safe)
- Dashboard: monthly and yearly totals, spend by category, renewals in the next 30 days
- Multi-currency: each subscription keeps its own currency; totals are converted to a display currency using editable rates
- Local renewal reminders at 9:00 AM, 0/1/3/7 days before renewal (iOS and Android)
- Data is stored only on the device (AsyncStorage)

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
src/store/useStore.ts     zustand store, persisted to AsyncStorage
```

Reminders are rebuilt from the data whenever subscriptions change and on every launch. Each subscription gets its next 3 renewals scheduled, capped at 60 notifications in total because iOS limits pending notifications to 64.
