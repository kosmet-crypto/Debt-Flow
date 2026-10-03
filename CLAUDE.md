# DebtFlow: notes for Claude

Personal Android app (WebView) for tracking debts; replaces "Debt Manager Pro" and imports its database.

- **Talk to the user in Serbian (Cyrillic).** Code, comments and commit messages stay in English.
- New features are agreed first; small fixes the user clearly asked for are done right away.

## Privacy (strict)

- The repo is **public**. Never commit a Debt Manager export or any other real data (`*.db` is in
  `.gitignore`). Use such files only for local testing in the scratchpad, and delete them when done.
- No network calls that carry user data. The only allowed request is the exchange-rate lookup
  (`api.frankfurter.dev`), always in try/catch with built-in/manual fallback.

## Inside `index.html` (one `<script>`, sections marked `/* ===== name ===== */`)

- `L`: translations, each key `[English, Serbian Cyrillic, Norwegian]`. Every new UI string needs all
  three; use `t('key', {vars})`.
- `D`: user data (`schema: 1`) in `localStorage` (`debtflow.data.v1`): `people`, `debts`
  (`personId`, `dir` `'to'` = they owe me / `'by'` = I owe, `currency`, `title`, `opened`, `closed`,
  `plan {amt, cur, start}`), `entries` (`debtId`, `date`, signed `amount` in the debt currency where
  + raises the debt, `note`, `kind` `tx|close`, optional `loc {amt, cur, rate, inferred}`).
  `C`: exchange-rate cache (not in backups).
- Backward compatibility: old data and backups must keep loading. Add fields with defaults in
  `normalize()`; bump `schema` and migrate if the shape changes incompatibly.
- `SQLiteFile`: dependency-free SQLite reader (B-tree pages, varints, records, overflow pages).
  `importDebtManager`: maps Debt Manager v8 tables. debtor `'1'` = they owe me, settled `'1'` = closed,
  balance = amount_owed + Σ payments, payment type `1/2` = system close, orphans skipped and reported.
  The acceptance check compares open balances with `namePivot` per (person, currency, direction).
- Entry form: the user picks the money flow (*I give* / *I get*). The sign follows from the
  account direction (`gaveFlow`, `saveEntry`).
- Statistics (`/* ===== statistics ===== */`): per-debt page from the account card. "Repayments" are
  `kind tx` entries with `amount < 0`. `finishRange` uses the last 12 complete months (zeros included):
  realistic = mean, optimistic = max(P75, mean), cautious = min(P25, mean), so the band always encloses
  the realistic line; fewer than 6 months → realistic only; >10 years or pace 0 → "10+". Charts are
  hand-written SVG (`balanceChart`, `barChart`) with a touch/hover tooltip (`CH`, `chartPointer`).
- Spending categories: `settings.cats` `[{id, name, words}]`, matched on entry notes after `fold()`
  (lowercase, Cyrillic → Latin, no diacritics). Editable in Settings.
- Android bridge `window.DebtFlowAndroid` (optional): `getVersion`, `ready`, `canSelfUpdate`,
  `checkForUpdate`, `http`, `saveFile(name, text, mime)`, `shareText`. `<meta name="debtflow-native-api">`
  declares the bridge version the page needs.

## Android wrapper and updates (same setup as GrowPort)

- `android/`: WebView wrapper, package `com.kosmet.debtflow`, copies `index.html` into the APK at build time.
  `MainActivity` (bridge `DebtFlowAndroid`, geolocation permission, file save, share), `WebUpdater`
  (silent page update from `main`), `ApkInstaller` (in-app APK update, sideload flavor only).
- `.github/workflows/android.yml` builds on every push (`main`, `claude/**`, `ccr-**`); only `main`
  publishes a Release `v1.0.<run>` with `debtflow.apk`.
- **Merging to `main` ships to the phone:** the app downloads the new `index.html` at the next start
  and uses it from the start after that. Changes in `android/` need a new APK (the app offers it).
- When the page starts using a new `DebtFlowAndroid` method, raise `<meta name="debtflow-native-api">`
  in `index.html` **and** `WebUpdater.NATIVE_API`.
- `targetSdk` stays 34. The keystore in the repo is intentional (every CI build must update the app).

## Checking changes

- `node tests/run.js`: statistics math on hand-computed cases, categories, "same as last time", and
  screenshots (light/dark, 390 and 1280 px) into `tests/out/` (git-ignored). Made-up data only.

- Syntax: `sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/df.js && node --check /tmp/df.js`
- UI: Playwright/Chromium at phone size (390×844, `hasTouch`), opened as `file://`. Click through the
  changed part, check that the console has no errors (the rate request is blocked in the cloud
  sandbox; that is expected), and take screenshots.
