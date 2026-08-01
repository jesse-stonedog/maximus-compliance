/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { evaluate } from "../src/evaluate.js";
import type { EntityFacts } from "../src/facts.js";
import type { Rule } from "../src/rule.js";
import {
  CHARITY_WITHOUT_REVENUE,
  DE_CORP,
  ENDOWED_CHARITY,
  MULTI_STATE_CORP,
  OR_LLC,
  WA_LARGE_CHARITY,
  WA_SMALL_CHARITY,
} from "./fixtures/entities.js";

/** A minimal active rule; spread over it to vary one thing at a time. */
function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "us-wa-test-rule",
    jurisdiction: "US-WA",
    title: "Test Filing",
    agency: "Test Agency",
    entityTypes: ["nonprofit-corp"],
    cadence: { type: "annual", anchor: "formation-month", dayOfMonth: "last" },
    citation: "Test statute 1.2.3",
    lastVerified: "2026-01-01",
    status: "active",
    effectiveFrom: "2020-01-01",
    ...overrides,
  };
}

const dueDates = (entity: EntityFacts, rules: Rule[], asOf: string, months = 12) =>
  evaluate(entity, rules, { asOf, horizonMonths: months }).obligations.map(
    (o) => o.dueOn,
  );

describe("applicability", () => {
  it("skips a rule for a jurisdiction the entity is not registered in", () => {
    const result = evaluate(OR_LLC, [rule({ jurisdiction: "US-WA" })], {
      asOf: "2026-01-01",
    });
    expect(result.obligations).toHaveLength(0);
  });

  it("applies a rule matching ANY of the entity's legal forms", () => {
    // An entity holds several at once — a 501(c)(3) is also a nonprofit
    // corporation. Matching only a single "primary" type would drop either the
    // state report or the federal return, depending on which was called primary.
    const result = evaluate(
      WA_SMALL_CHARITY,
      [rule({ entityTypes: ["nonprofit-corp"] })],
      { asOf: "2026-01-01" },
    );
    expect(result.obligations).toHaveLength(1);
  });

  it("skips a rule matching none of them", () => {
    const result = evaluate(WA_SMALL_CHARITY, [rule({ entityTypes: ["llc"] })], {
      asOf: "2026-01-01",
    });
    expect(result.obligations).toHaveLength(0);
  });

  it("applies a rule in a foreign jurisdiction the entity registered in", () => {
    const result = evaluate(
      MULTI_STATE_CORP,
      [rule({ jurisdiction: "US-WA", entityTypes: ["c-corp"] })],
      { asOf: "2026-01-01" },
    );
    expect(result.obligations).toHaveLength(1);
  });
});

describe("draft rules", () => {
  it("are excluded by default", () => {
    // The default protects the consumer that forgets to think about it. An
    // unverified deadline presented as fact is the failure this product cannot
    // afford.
    const result = evaluate(WA_SMALL_CHARITY, [rule({ status: "draft" })], {
      asOf: "2026-01-01",
    });
    expect(result.obligations).toHaveLength(0);
  });

  it("are included on request, and carry their status through", () => {
    const result = evaluate(WA_SMALL_CHARITY, [rule({ status: "draft" })], {
      asOf: "2026-01-01",
      includeDraft: true,
    });
    expect(result.obligations[0]?.status).toBe("draft");
  });
});

describe("conditions", () => {
  const revenueRule = rule({
    conditions: [
      { fact: "grossRevenueMinorUnits", op: "lte", value: 5_000_000 },
    ],
  });

  it("applies when the condition holds", () => {
    expect(evaluate(WA_SMALL_CHARITY, [revenueRule], { asOf: "2026-01-01" })
      .obligations).toHaveLength(1);
  });

  it("does not apply when it does not", () => {
    expect(evaluate(WA_LARGE_CHARITY, [revenueRule], { asOf: "2026-01-01" })
      .obligations).toHaveLength(0);
  });

  it("reports indeterminate rather than guessing when the fact is missing", () => {
    // Treating "revenue unknown" as "revenue is 0" is how a system tells a
    // large charity it can file the postcard return.
    const result = evaluate(CHARITY_WITHOUT_REVENUE, [revenueRule], {
      asOf: "2026-01-01",
    });
    expect(result.obligations).toHaveLength(0);
    expect(result.indeterminate).toEqual([
      {
        ruleId: "us-wa-test-rule",
        title: "Test Filing",
        jurisdiction: "US-WA",
        missingFacts: ["grossRevenueMinorUnits"],
      },
    ]);
  });

  it("stops asking for facts once another condition has settled the matter", () => {
    // A known-false entry short-circuits the whole set, unknowns included. The
    // rule cannot apply, so demanding revenue would be asking for data to
    // settle a question already settled.
    const solicitingOnly = rule({
      conditions: [
        { fact: "solicitsCharitableContributions", op: "eq", value: true },
        { fact: "grossRevenueMinorUnits", op: "gt", value: 1 },
      ],
    });
    const result = evaluate(
      { ...CHARITY_WITHOUT_REVENUE, solicitsCharitableContributions: false },
      [solicitingOnly],
      { asOf: "2026-01-01" },
    );
    expect(result.obligations).toHaveLength(0);
    expect(result.indeterminate).toHaveLength(0);
  });

  it("requires every condition to hold, not just one", () => {
    const bothRequired = rule({
      conditions: [
        { fact: "grossRevenueMinorUnits", op: "gt", value: 1_000_000 },
        { fact: "solicitsCharitableContributions", op: "eq", value: false },
      ],
    });
    expect(evaluate(WA_SMALL_CHARITY, [bothRequired], { asOf: "2026-01-01" })
      .obligations).toHaveLength(0);
  });
});

describe("anyOf condition groups", () => {
  // The Form 990 shape: receipts >= $200k OR assets >= $500k.
  const eitherThreshold = rule({
    conditions: [
      {
        anyOf: [
          { fact: "grossRevenueMinorUnits", op: "gte", value: 20_000_000 },
          { fact: "totalAssetsMinorUnits", op: "gte", value: 50_000_000 },
        ],
      },
    ],
  });

  it("applies when only the second alternative holds", () => {
    // THE REGRESSION. Under the receipts threshold, far over the assets one.
    // With AND-only conditions this entity was told it owed nothing — a false
    // negative, where the user sees a clean calendar and misses a filing.
    expect(
      evaluate(ENDOWED_CHARITY, [eitherThreshold], { asOf: "2026-01-01" })
        .obligations,
    ).toHaveLength(1);
  });

  it("applies when only the first alternative holds", () => {
    expect(
      evaluate(WA_LARGE_CHARITY, [eitherThreshold], { asOf: "2026-01-01" })
        .obligations,
    ).toHaveLength(1);
  });

  it("does not apply when neither holds", () => {
    expect(
      evaluate(WA_SMALL_CHARITY, [eitherThreshold], { asOf: "2026-01-01" })
        .obligations,
    ).toHaveLength(0);
  });

  it("does not ask for a fact it no longer needs", () => {
    // $3.1M of receipts settles it. Asking for total assets as well would be
    // noise, and the whole reason a known-true beats an unknown in a group.
    const noAssets = { ...WA_LARGE_CHARITY };
    delete noAssets.totalAssetsMinorUnits;
    const result = evaluate(noAssets, [eitherThreshold], { asOf: "2026-01-01" });
    expect(result.obligations).toHaveLength(1);
    expect(result.indeterminate).toHaveLength(0);
  });

  it("is indeterminate when no alternative is known true and one is unknown", () => {
    const partial = { ...WA_SMALL_CHARITY };
    delete partial.totalAssetsMinorUnits;
    // Receipts are known and below the line; assets are unknown and could be
    // over it. Neither "applies" nor "does not apply" is honest here.
    const result = evaluate(partial, [eitherThreshold], { asOf: "2026-01-01" });
    expect(result.obligations).toHaveLength(0);
    expect(result.indeterminate[0]?.missingFacts).toEqual([
      "totalAssetsMinorUnits",
    ]);
  });

  it("does not apply when every alternative is known false", () => {
    const result = evaluate(WA_SMALL_CHARITY, [eitherThreshold], {
      asOf: "2026-01-01",
    });
    expect(result.obligations).toHaveLength(0);
    expect(result.indeterminate).toHaveLength(0);
  });

  it("combines a group with a plain condition as an AND", () => {
    const groupAndPlain = rule({
      conditions: [
        { fact: "solicitsCharitableContributions", op: "eq", value: true },
        {
          anyOf: [
            { fact: "grossRevenueMinorUnits", op: "gte", value: 20_000_000 },
            { fact: "totalAssetsMinorUnits", op: "gte", value: 50_000_000 },
          ],
        },
      ],
    });
    // ENDOWED_CHARITY passes the group but does not solicit.
    expect(
      evaluate(ENDOWED_CHARITY, [groupAndPlain], { asOf: "2026-01-01" })
        .obligations,
    ).toHaveLength(0);
    // WA_LARGE_CHARITY passes both.
    expect(
      evaluate(WA_LARGE_CHARITY, [groupAndPlain], { asOf: "2026-01-01" })
        .obligations,
    ).toHaveLength(1);
  });
});

describe("formation-month cadence", () => {
  it("falls at the end of the anniversary month", () => {
    expect(dueDates(WA_SMALL_CHARITY, [rule()], "2026-01-01")).toEqual([
      "2026-03-31",
    ]);
  });

  it("clamps a month-end formation instead of rolling into the next month", () => {
    // OR_LLC was formed 31 January. February has no 31st; the deadline must be
    // 28/29 February, not 1 March — a day late, every year.
    const dates = dueDates(
      OR_LLC,
      [rule({ jurisdiction: "US-OR", entityTypes: ["llc"] })],
      "2026-01-01",
    );
    expect(dates).toEqual(["2026-01-31"]);
  });

  it("handles a leap-day formation in a common year", () => {
    const dates = dueDates(
      DE_CORP,
      [
        rule({
          jurisdiction: "US-DE",
          entityTypes: ["c-corp"],
          cadence: {
            type: "annual",
            anchor: "formation-month",
            dayOfMonth: 29,
          },
        }),
      ],
      "2026-01-01",
    );
    expect(dates).toEqual(["2026-02-28"]);
  });

  it("emits one occurrence per year across a multi-year horizon", () => {
    expect(dueDates(WA_SMALL_CHARITY, [rule()], "2026-01-01", 36)).toEqual([
      "2026-03-31",
      "2027-03-31",
      "2028-03-31",
    ]);
  });
});

describe("biennial cadence", () => {
  it("keeps the parity of the formation year", () => {
    // Walking forward from formation rather than from `asOf` is what preserves
    // this: an entity formed in an odd year files in odd years.
    const biennial = rule({
      cadence: { type: "biennial", anchor: "formation-month", dayOfMonth: "last" },
    });
    // WA_SMALL_CHARITY was formed 2021 (odd), so 2021, 2023, 2025, 2027…
    expect(dueDates(WA_SMALL_CHARITY, [biennial], "2026-01-01", 48)).toEqual([
      "2027-03-31",
      "2029-03-31",
    ]);
  });
});

describe("calendar cadence", () => {
  it("uses the fixed date regardless of formation", () => {
    const deTax = rule({
      jurisdiction: "US-DE",
      entityTypes: ["c-corp"],
      cadence: { type: "annual", anchor: "calendar", month: 3, day: 1 },
    });
    expect(dueDates(DE_CORP, [deTax], "2026-01-01")).toEqual(["2026-03-01"]);
  });

  it("never emits an occurrence before the entity existed", () => {
    const deTax = rule({
      jurisdiction: "US-DE",
      entityTypes: ["c-corp"],
      cadence: { type: "annual", anchor: "calendar", month: 3, day: 1 },
    });
    // DE_CORP was formed 2024-02-29, so 2024-03-01 counts but 2023 must not.
    const all = dueDates(DE_CORP, [deTax], "2023-01-01", 48);
    expect(all[0]).toBe("2024-03-01");
  });
});

describe("fiscal-year-end cadence", () => {
  const form990 = rule({
    id: "us-federal-form-990",
    jurisdiction: "US",
    entityTypes: ["501c3"],
    cadence: {
      type: "annual",
      anchor: "fiscal-year-end",
      offsetMonths: 5,
      dayOfMonth: 15,
    },
  });

  it("is 15 May for a calendar-year filer", () => {
    expect(dueDates(WA_SMALL_CHARITY, [form990], "2026-01-01")).toEqual([
      "2026-05-15",
    ]);
  });

  it("moves with a non-calendar fiscal year", () => {
    // WA_LARGE_CHARITY's year ends 30 June, so the return is due 15 November —
    // the case a hardcoded "May 15" would get wrong for every such filer.
    expect(dueDates(WA_LARGE_CHARITY, [form990], "2026-01-01")).toEqual([
      "2026-11-15",
    ]);
  });
});

describe("one-time cadence", () => {
  it("fires once, a fixed number of days after formation", () => {
    const initialReport = rule({
      cadence: { type: "one-time", anchor: "formation", offsetDays: 120 },
    });
    expect(dueDates(WA_SMALL_CHARITY, [initialReport], "2021-01-01", 24)).toEqual([
      "2021-07-13",
    ]);
  });

  it("does not recur", () => {
    const initialReport = rule({
      cadence: { type: "one-time", anchor: "formation", offsetDays: 120 },
    });
    expect(dueDates(WA_SMALL_CHARITY, [initialReport], "2026-01-01", 120)).toEqual(
      [],
    );
  });
});

describe("weekend rolling", () => {
  it("is off unless the rule opts in", () => {
    // Rolling by default would invent a legal position the rule never claimed.
    // 2026-08-01 is a Saturday.
    const saturday = rule({
      cadence: { type: "annual", anchor: "calendar", month: 8, day: 1 },
    });
    expect(dueDates(WA_SMALL_CHARITY, [saturday], "2026-01-01")).toEqual([
      "2026-08-01",
    ]);
  });

  it("rolls to Monday when it does", () => {
    const saturday = rule({
      cadence: { type: "annual", anchor: "calendar", month: 8, day: 1 },
      weekendRule: "roll-forward",
    });
    expect(dueDates(WA_SMALL_CHARITY, [saturday], "2026-01-01")).toEqual([
      "2026-08-03",
    ]);
  });
});

describe("effective windows", () => {
  it("checks the rule against the DUE date, not against asOf", () => {
    // This is what makes historical questions answerable: a rule that expired
    // in June still governs a filing that was due in March.
    const expired = rule({
      cadence: { type: "annual", anchor: "calendar", month: 3, day: 1 },
      effectiveFrom: "2020-01-01",
      effectiveTo: "2026-06-30",
    });
    expect(dueDates(WA_SMALL_CHARITY, [expired], "2026-01-01")).toEqual([
      "2026-03-01",
    ]);
    expect(dueDates(WA_SMALL_CHARITY, [expired], "2027-01-01")).toEqual([]);
  });

  it("selects the version in force on each date across a supersession", () => {
    const oldFee = rule({
      id: "us-wa-fee-rule",
      cadence: { type: "annual", anchor: "calendar", month: 3, day: 1 },
      fee: { amountMinorUnits: 5000, currency: "USD" },
      effectiveFrom: "2020-01-01",
      effectiveTo: "2026-12-31",
    });
    const newFee = rule({
      id: "us-wa-fee-rule",
      cadence: { type: "annual", anchor: "calendar", month: 3, day: 1 },
      fee: { amountMinorUnits: 7500, currency: "USD" },
      effectiveFrom: "2027-01-01",
    });

    const result = evaluate(WA_SMALL_CHARITY, [oldFee, newFee], {
      asOf: "2026-01-01",
      horizonMonths: 36,
    });
    expect(
      result.obligations.map((o) => [o.dueOn, o.feeMinorUnits]),
    ).toEqual([
      ["2026-03-01", 5000],
      ["2027-03-01", 7500],
      ["2028-03-01", 7500],
    ]);
  });
});

describe("output", () => {
  it("sorts by due date, then by rule id for a stable order", () => {
    const march = rule({
      id: "us-wa-b-rule",
      cadence: { type: "annual", anchor: "calendar", month: 3, day: 1 },
    });
    const alsoMarch = rule({
      id: "us-wa-a-rule",
      cadence: { type: "annual", anchor: "calendar", month: 3, day: 1 },
    });
    const january = rule({
      id: "us-wa-z-rule",
      cadence: { type: "annual", anchor: "calendar", month: 1, day: 15 },
    });

    const result = evaluate(WA_SMALL_CHARITY, [march, alsoMarch, january], {
      asOf: "2026-01-01",
    });
    expect(result.obligations.map((o) => o.ruleId)).toEqual([
      "us-wa-z-rule",
      "us-wa-a-rule",
      "us-wa-b-rule",
    ]);
  });

  it("carries the citation and verification date into every obligation", () => {
    // The UI has to be able to show what a deadline is based on and how stale
    // that basis is, without going back to the rule pack.
    const [obligation] = evaluate(WA_SMALL_CHARITY, [rule()], {
      asOf: "2026-01-01",
    }).obligations;
    expect(obligation).toMatchObject({
      citation: "Test statute 1.2.3",
      lastVerified: "2026-01-01",
      status: "active",
    });
  });

  it("omits the fee entirely when a rule has none", () => {
    // Rather than reporting 0, which reads as "free" instead of "not stated".
    const [obligation] = evaluate(WA_SMALL_CHARITY, [rule()], {
      asOf: "2026-01-01",
    }).obligations;
    expect(obligation).not.toHaveProperty("feeMinorUnits");
  });
});

describe("determinism", () => {
  it("returns identical results for identical inputs", () => {
    const rules = [rule(), rule({ id: "us-wa-other" })];
    const a = evaluate(WA_SMALL_CHARITY, rules, { asOf: "2026-01-01" });
    const b = evaluate(WA_SMALL_CHARITY, rules, { asOf: "2026-01-01" });
    expect(a).toEqual(b);
  });

  it("does not mutate its inputs", () => {
    const entity = structuredClone(WA_SMALL_CHARITY);
    const rules = [rule()];
    const rulesBefore = structuredClone(rules);
    evaluate(entity, rules, { asOf: "2026-01-01" });
    expect(entity).toEqual(WA_SMALL_CHARITY);
    expect(rules).toEqual(rulesBefore);
  });
});
