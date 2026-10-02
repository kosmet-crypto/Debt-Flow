# DebtFlow

A simple, offline debt tracker for Android: who owes you, whom you owe, in which currency, and how a
repayment plan is going. It replaces the Android app *Debt Manager Pro* and can import its database.

- **One question per entry:** did money go out (*I give*) or come in (*I get*)? The app works out
  whether that raises or lowers the debt.
- **One running account per person and currency.** Each account has its own history and running balance.
- **Foreign-currency debts:** you can record what you actually sent in your local currency (for
  example 10 000 NOK against a debt in euros). The rate is calculated, or taken from the ECB for that day.
- **Repayment plans**, for example 10 000 NOK a month. Shows ahead or behind and an estimated end date.
- **Import from Debt Manager** (Settings → Export database → `.db`). The SQLite file is read on the
  phone by a small built-in reader. The import is checked against Debt Manager's own totals. Kroner
  amounts written in notes ("16 000 nok vraćeno", "3000 kr") are read as estimated local amounts and
  shown with `~`.
- Serbian (Cyrillic), English and Norwegian. Light and dark theme. JSON backup and restore, CSV export
  for Excel. Undo after saving or deleting.
- The local currency can follow your location: one coarse reading at start, matched offline.

Your data stays on the phone (`localStorage`). The only network request is the optional exchange-rate
lookup (ECB rates via [Frankfurter](https://frankfurter.dev)). Without it the app uses built-in
approximate rates or the rates you enter.

## Files

- `index.html`: the whole app (HTML, CSS and JS), with no build step and no dependencies.

Author: Ivan St. Epicurus001 - Srbija/Norge
