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
- Android bridge `window.DebtFlowAndroid` (optional): `getVersion`, `ready`, `canSelfUpdate`,
  `checkForUpdate`, `http`, `saveFile(name, text, mime)`, `shareText`. `<meta name="debtflow-native-api">`
  declares the bridge version the page needs.

## Checking changes

- Syntax: `sed -n '/<script>/,/<\/script>/p' index.html | sed '1d;$d' > /tmp/df.js && node --check /tmp/df.js`
- UI: Playwright/Chromium at phone size (390×844, `hasTouch`), opened as `file://`. Click through the
  changed part, check that the console has no errors (the rate request is blocked in the cloud
  sandbox; that is expected), and take screenshots.
