# @optima/rules

Crowd-maintained US business compliance rule packs. **Every rule cites its
statute.**

The data half of **[Optima Filings](https://github.com/stonedog-code/optima-filings)**.
Evaluated by [`@optima/engine`](https://www.npmjs.com/package/@optima/engine),
which turns these rules plus an entity's facts into a filing calendar.

```bash
npm install @optima/rules @optima/engine
```

```ts
import { ALL_RULES } from "@optima/rules";
import { evaluate } from "@optima/engine";

evaluate(entity, ALL_RULES, { asOf: "2026-08-05" });
```

## ⚠️ Read this before showing a date to anyone

**The current rule set is entirely `status: "draft"`.** Every rule was written
from general knowledge and **not one has been checked against its primary source
by a human.**

`evaluate()` excludes drafts by default, so a stock integration shows an *empty*
calendar. That is the honest answer, not a bug. Opting in with
`includeDraft: true` is a deliberate act, and every obligation carries `status`
so you can label it.

This is a compliance product. The first wrong deadline that costs somebody a
penalty is the credibility event the project does not recover from — so the
seed set says what it is rather than looking finished.

## The bet

Compliance is a **data-coverage problem, not a software problem.** 50 states,
thousands of municipalities and a dozen entity types, with legislatures moving
deadlines and fees every session, is more than any one team can track.

So the rules are open, and the people who know them — CPAs, attorneys, business
owners — maintain their own jurisdictions by pull request.

**A rule is never paid.** If a deadline exists in the hosted product it exists
here, at the same accuracy, on the same day.

## What a rule looks like

```json
{
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

Validated against a published JSON Schema, shipped at
`@optima/rules/schema/rule.v1.json`.

## Five rules about the data

**Every rule cites its source.** A statute, form number, or the agency's own
page — never another compliance vendor, whose errors and liability you would be
importing. CI rejects a rule without a citation.

**Every rule carries `lastVerified`** — the date a human last read the primary
source. Bumping it without re-reading is *worse* than leaving it stale, because
it converts an honest "unknown" into a false "checked".

**Rules are temporal, not current.** `effectiveFrom` / `effectiveTo` are
required and superseded rules stay in the pack, so *"what was due in 2024"* is
answerable — which is what late filings and penalty calculations need.

**Superseding, not editing.** When a fee changes, the old rule gets an
`effectiveTo` and a new one is added. Overwriting destroys the historical answer
and hides the change from review.

**Money is integer minor units.** `6000` is $60.00. Never a float.

## Versioning — dates, not semver

`YYYY.M.PATCH`. This is **data**: it changes when a legislature does, and semver
does not describe that. `@optima/engine` is separately semver'd, because its
*behaviour* changes far less often than the rules do.

A **schema** change is what bumps `rule.v1.json` to `v2`; v1 rules keep working.

Pin exactly if a reproducible calendar matters to you. *"Which version said this
was due?"* is the first question asked when a deadline is disputed, and a caret
range makes it unanswerable from a lockfile.

## Contributing

The highest-value contribution is **a citation somebody checked.**

Rules live at `us/<state>/<slug>.json` in the
[repository](https://github.com/stonedog-code/optima-filings), organised by
jurisdiction rather than entity type — one Washington annual report covers
S-Corps, C-Corps and B-Corps at once.

Take a neighbouring rule, change three fields, submit. If you have not read the
primary source, mark it `draft` and say so — **a draft is a perfectly good
contribution**, and far better than a guess presented as fact.

If you would rather not open a pull request, the repository has an issue
template for *"a deadline or fee changed"* — jurisdiction, what changed, the
citation. Converting that to JSON takes five minutes.

Contributions require a [CLA](https://github.com/stonedog-code/optima-filings/blob/main/CLA.md).

## This is not legal or tax advice

Verify anything that matters against the primary source. The citation on every
rule is there so you can.

## Licence

**AGPL-3.0-only.** Copyright © 2026 StoneDogCode L.L.C.
