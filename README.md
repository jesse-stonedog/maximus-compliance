# Optima Filings

**Know what your business owes, and when.**

Given an entity and the jurisdictions it is registered in, this tells you what is
due, when, to whom, and for how much — annual reports, franchise taxes, charity
registrations, federal returns.

Free and self-hostable. A paid cloud service at
[optimafilings.com](https://optimafilings.com) adds reminders, filing
integrations and document storage, but **the rules and the engine are open, and
every rule is the same on both sides.**

---

> ### ⚠️ This is not legal or tax advice
>
> This software helps you track deadlines. It does not replace an attorney or an
> accountant, and it does not guarantee that its data is current or correct for
> your situation. Filing deadlines and fees change, agencies interpret their own
> rules, and your circumstances may be unusual.
>
> **Verify anything that matters against the cited primary source** — every rule
> names the statute it came from, so you can. You remain responsible for your own
> filings.

> ### 🚧 The rule data is not ready to rely on yet
>
> Every rule currently shipped is `status: "draft"` — written from general
> knowledge and **not yet checked against its statute by a human**. The engine
> excludes drafts by default for exactly this reason. Do not use this to run a
> real compliance calendar until the seed set has been verified
> (tracked as NEH-194).

---

## Why open source

Compliance is a data-coverage problem, not a software problem. Fifty states,
thousands of municipalities, a dozen entity types, and legislatures that move
deadlines and fees every session — that is more than any one company can track
accurately.

So the rule data is public and the people who actually know it — CPAs,
attorneys, and business owners — can correct it directly. **You do not need to
be a developer to help.** If a deadline or a fee is wrong where you live,
[open an issue](../../issues/new/choose) and say so; converting that into a rule
is five minutes of someone's time.

## What is in here

| Package | What it is |
|---|---|
| `@maximus/engine` | The evaluator. Pure and clock-free: entity facts and rules in, obligations out. No I/O, no `Date.now()`, so a result is reproducible and you can ask what was due in 2024. |
| `@maximus/rules` | The rule packs, as JSON, plus the JSON Schema that validates them. Every rule carries a citation and the date a human last verified it. |

## Quick start

```bash
npm install
npm run gate          # validate rules, typecheck, lint, test
npm run rules:staleness   # which rules nobody has re-verified lately
```

## A rule

```json
{
  "$schema": "../../schema/rule.v1.json",
  "id": "us-wa-sos-nonprofit-annual-report",
  "jurisdiction": "US-WA",
  "title": "Nonprofit Corporation Annual Report",
  "agency": "Washington Secretary of State",
  "entityTypes": ["501c3", "nonprofit-corp"],
  "cadence": { "type": "annual", "anchor": "formation-month", "dayOfMonth": "last" },
  "fee": { "amountMinorUnits": 6000, "currency": "USD" },
  "citation": "RCW 24.03A.1010",
  "lastVerified": "2026-08-01",
  "status": "draft",
  "effectiveFrom": "2022-01-01"
}
```

Three things about that are deliberate and worth knowing before you write one:

- **`citation` is required.** A rule nobody can check is a rumour.
- **`lastVerified` is required**, because crowdsourced regulatory data does not
  fail loudly — it rots quietly, staying valid-looking while the fee changes.
  Bumping the date without re-reading the statute is worse than leaving it
  stale: it turns an honest "unknown" into a false "checked".
- **Fees are integer minor units.** `6000` is $60.00. Never a float.

When a fee or deadline changes, **do not edit the rule** — set `effectiveTo` on
the old one and add a new one. That is what keeps "what was due in 2024"
answerable, and what makes the change visible to a reviewer.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions require signing a CLA
assigning copyright to StoneDogCode L.L.C., which is what allows the project to
be dual-licensed.

## Licence

AGPL-3.0-only. Copyright © 2026 StoneDogCode L.L.C.

If you run a modified version as a network service, the AGPL requires you to
offer your users its source. That is the point: it keeps improvements to a
shared public dataset shared.
