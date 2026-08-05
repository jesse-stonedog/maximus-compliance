# @optima/engine

Pure, clock-free compliance rules evaluator. Entity facts and rules in, filing
obligations out.

Part of **[Optima Filings](https://github.com/stonedog-code/optima-filings)** —
an open-source compliance calendar for small entities: nonprofits, LLCs,
S-Corps, C-Corps and B-Corps. It answers one question well: *given this entity,
in these jurisdictions, what is due, when, to whom, and for how much?*

```bash
npm install @optima/engine @optima/rules
```

## Quick start

```ts
import { evaluate, type EntityFacts } from "@optima/engine";
import { ALL_RULES } from "@optima/rules";

const entity: EntityFacts = {
  name: "Cascade Trails Association",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
};

const { obligations, indeterminate } = evaluate(entity, ALL_RULES, {
  asOf: "2026-08-05",
  horizonMonths: 12,
});

for (const o of obligations) {
  console.log(o.dueOn, o.title, o.citation);
}
```

## Four properties worth knowing before you build on it

**It is pure.** No filesystem, no network, no database, no `process.env`. That
is what makes it testable against thousands of fixtures, embeddable in a
browser, and safe to expose as an API.

**It is clock-free.** Every entry point takes an explicit `asOf` date; nothing
calls `Date.now()`. So results are reproducible and cacheable — and *"what was
due in 2024?"* is a question you can actually ask, which matters for late
filings and penalty calculations.

**Dates are civil dates, not instants.** `YYYY-MM-DD` strings throughout, never
`Date`. A filing deadline is a calendar fact in a jurisdiction; a timestamp
acquires a zone and shifts by a day.

**Money is integer minor units.** `6000` is $60.00. Never a float — a rounding
error in a fee is a support ticket and a credibility hit.

## Drafts are excluded by default

Every rule carries a `status`:

- **`active`** — a person read the primary source and confirmed it.
- **`draft`** — written from general knowledge, *not* yet checked against the
  statute.

`evaluate()` **excludes drafts unless you ask for them**, because the default
should protect the consumer who did not think about it. Pass
`includeDraft: true` and every obligation carries `status` so you can label it.

```ts
evaluate(entity, ALL_RULES, { asOf, includeDraft: true });
```

Do not show a draft rule to a user as fact.

## Indeterminate rules are reported, not dropped

A rule that *might* apply but depends on a fact the entity has not supplied
comes back in `indeterminate` rather than silently vanishing.

*"You may owe a Form 990 — tell us your gross revenue"* is useful. An incomplete
calendar presented as complete is the failure this product cannot afford.

## Staleness

Regulatory data does not fail loudly; it rots quietly. Every rule carries
`lastVerified`, and the engine exposes the arithmetic:

```ts
import { isStale, monthsSinceVerified, STALE_AFTER_MONTHS } from "@optima/engine";

isStale(rule.lastVerified, "2026-08-05"); // → boolean, 12-month default
```

## API surface

Everything exported from the package root is a public promise under semver.

| | |
|---|---|
| **Evaluation** | `evaluate`, `EvaluationResult`, `Obligation`, `IndeterminateRule`, `EvaluateOptions` |
| **Entity facts** | `ENTITY_TYPES`, `CONDITIONABLE_FACTS`, `isEntityType`, `EntityFacts`, `EntityType`, `CalendarDate`, `Jurisdiction`, `MonthDay` |
| **Rules** | `Rule`, `Cadence`, `Fee`, `RuleStatus`, `RuleCondition`, `RuleConditionGroup`, `isConditionGroup` |
| **Calendar maths** | `addDays`, `addMonths`, `addYears`, `compareDates`, `dateInMonth`, `daysInMonth`, `dayOfWeek`, `formatDate`, `parseDate`, `parseMonthDay`, `isOnOrAfter`, `isOnOrBefore`, `isWeekend`, `rollForwardOffWeekend` |
| **Staleness** | `isStale`, `monthsSinceVerified`, `STALE_AFTER_MONTHS` |
| **Documents** | `DOCUMENT_TYPES`, `DOCUMENT_TYPE_INFO`, `DocumentType`, `isDocumentType`, `toDocumentType`, `requiresDocumentDate`, `DEFAULT_DOCUMENT_TYPE` |

Zero runtime dependencies, and it stays that way. This package gets embedded in
browsers and imposed on every self-hoster.

## This is not legal or tax advice

This software tells people when to file with the government, and a missed
deadline costs real money. **Verify anything that matters against the primary
source** — every rule carries a `citation` for exactly that purpose.

## Licence

**AGPL-3.0-only.** Copyright © 2026 StoneDogCode L.L.C.

Contributions require a [CLA](https://github.com/stonedog-code/optima-filings/blob/main/CLA.md).
Rule data lives in [`@optima/rules`](https://www.npmjs.com/package/@optima/rules)
and is maintained by pull request — corrections welcome, citations required.
