/**
 * The shipped rule packs, run through the real engine.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `rules:validate` proves a rule is well-formed. This proves it *does something
 * sensible* — the gap between the two is where a schema-valid rule quietly
 * produces a wrong date, which is the defect class this product cannot afford.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { evaluate } from "../src/evaluate.js";
import { CONDITIONABLE_FACTS } from "../src/facts.js";
import type { Rule } from "../src/rule.js";
import {
  DE_CORP,
  ENDOWED_NON_SOLICITING_CHARITY,
  OR_LLC,
  WA_LARGE_CHARITY,
  WA_SMALL_CHARITY,
} from "./fixtures/entities.js";

const rulesRoot = join(__dirname, "..", "..", "rules");
const schemaPath = join(rulesRoot, "schema", "rule.v1.json");

function ruleFiles(dir: string = join(rulesRoot, "us")): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return ruleFiles(full);
    return name.endsWith(".json") ? [full] : [];
  });
}

const RULES: Rule[] = ruleFiles().map((file) => {
  const { $schema: _schema, ...rule } = JSON.parse(readFileSync(file, "utf8"));
  return rule as Rule;
});

const byId = (id: string): Rule => {
  const found = RULES.find((rule) => rule.id === id);
  if (!found) throw new Error(`No such rule: ${id}`);
  return found;
};

describe("the pack loads", () => {
  it("has rules", () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  it("has a unique id per rule version", () => {
    const ids = RULES.map((r) => r.id);
    // Duplicates are legitimate only across effective windows, and the
    // validator checks that separately. None of the seed rules is superseded.
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("schema and TypeScript agree", () => {
  it("allows exactly the facts the engine can evaluate", () => {
    // Two definitions of the conditionable facts exist — the schema's enum and
    // the engine's const — because the validator runs before anything is built
    // and cannot import from dist. This is what stops them drifting: a fact
    // added to one and not the other would let a rule validate and then never
    // match.
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    // Both condition branches — leaf and `anyOf` member — `$ref` this one
    // definition, so there is a single place the enum can drift, not two.
    const schemaFacts = schema.definitions.condition.properties.fact.enum;
    expect([...schemaFacts].sort()).toEqual([...CONDITIONABLE_FACTS].sort());
  });

  it("uses the same condition definition for leaves and for anyOf members", () => {
    // If the group branch stopped $ref-ing the shared definition, a fact could
    // become valid inside a group and invalid outside it — and that drift would
    // only ever surface as a rule that validates and then never matches.
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const [leaf, group] = schema.properties.conditions.items.oneOf;
    expect(leaf.$ref).toBe("#/definitions/condition");
    expect(group.properties.anyOf.items.$ref).toBe("#/definitions/condition");
  });

  it("allows exactly the entity types the engine knows", () => {
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const schemaTypes = schema.properties.entityTypes.items.enum;
    // Imported lazily so a mismatch reports as a value diff, not a type error.
    const { ENTITY_TYPES } = require("../src/facts.js");
    expect([...schemaTypes].sort()).toEqual([...ENTITY_TYPES].sort());
  });
});

describe("every seeded rule is honest about its provenance", () => {
  it.each(RULES.map((r) => r.id))("%s cites a primary source", (id) => {
    const rule = byId(id);
    expect(rule.citation.length).toBeGreaterThan(4);
    // A bare URL is not a citation — a reviewer needs to know which statute to
    // read, not just where the agency lives.
    expect(rule.citation).not.toMatch(/^https?:\/\//);
  });

  it("marks unverified rules as draft rather than asserting them", () => {
    // The seed set was written from general knowledge, not from reading each
    // statute. Shipping it as `active` would be the exact false-confidence
    // failure the whole design is built to avoid.
    const active = RULES.filter((r) => r.status === "active");
    const drafts = RULES.filter((r) => r.status === "draft");
    expect(drafts.length + active.length).toBe(RULES.length);
    for (const rule of drafts) {
      expect(rule.notes ?? "").not.toBe("");
    }
  });
});

describe("a small Washington charity", () => {
  const result = evaluate(WA_SMALL_CHARITY, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes the state annual report at the end of its formation month", () => {
    // Formed 2021-03-15.
    const report = result.obligations.find(
      (o) => o.ruleId === "us-wa-sos-nonprofit-annual-report",
    );
    expect(report?.dueOn).toBe("2026-03-31");
    expect(report?.feeMinorUnits).toBe(6000);
  });

  it("owes the 990-N, not the full 990", () => {
    // $42,000 of revenue is under the e-Postcard ceiling.
    const federal = result.obligations
      .filter((o) => o.jurisdiction === "US")
      .map((o) => o.ruleId);
    expect(federal).toContain("us-federal-form-990-n");
    expect(federal).not.toContain("us-federal-form-990");
    expect(federal).not.toContain("us-federal-form-990-ez");
  });

  it("owes the 990-N on 15 May for a calendar fiscal year", () => {
    const postcard = result.obligations.find(
      (o) => o.ruleId === "us-federal-form-990-n",
    );
    expect(postcard?.dueOn).toBe("2026-05-15");
  });

  it("owes charity registration because it solicits", () => {
    expect(result.obligations.map((o) => o.ruleId)).toContain(
      "us-wa-charitable-solicitation-registration",
    );
  });

  it("owes nothing in Oregon or Delaware", () => {
    const foreign = result.obligations.filter(
      (o) => o.jurisdiction === "US-OR" || o.jurisdiction === "US-DE",
    );
    expect(foreign).toEqual([]);
  });
});

describe("a large Washington charity with a June fiscal year", () => {
  const result = evaluate(WA_LARGE_CHARITY, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes the full 990, and it is not due in May", () => {
    // Year ends 30 June, so the return is due the 15th day of the 5th month
    // after — November — the case a hardcoded "May 15" gets wrong for every
    // non-calendar filer.
    //
    // MONDAY THE 16th, NOT SUNDAY THE 15th. This assertion said `2026-11-15`
    // until the 990 rules gained `weekendRule: "roll-forward"`, and it was
    // asserting a deadline that falls on a Sunday. The IRS is explicit — "If a
    // due date falls on a Saturday, Sunday, or legal holiday, the due date is
    // delayed until the next business day" — so the engine is right and the
    // fixture was wrong.
    //
    // Worth keeping as the weekend case rather than picking a mid-week year
    // end: it is the assertion that would go quiet if the weekend rule were
    // ever dropped from the rule JSON, and a deadline shown on a day the IRS
    // is closed is exactly the kind of small wrongness that costs trust.
    const federal = result.obligations.find((o) => o.jurisdiction === "US");
    expect(federal?.ruleId).toBe("us-federal-form-990");
    expect(federal?.dueOn).toBe("2026-11-16");
  });
});

describe("an Oregon LLC formed on 31 January", () => {
  const result = evaluate(OR_LLC, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes only the Oregon annual report", () => {
    expect(result.obligations.map((o) => o.ruleId)).toEqual([
      "us-or-sos-llc-annual-report",
    ]);
  });

  it("owes it at the end of January, not in February", () => {
    expect(result.obligations[0]?.dueOn).toBe("2026-01-31");
  });
});

describe("a Delaware corporation", () => {
  const result = evaluate(DE_CORP, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("owes the annual report on the fixed March date", () => {
    const report = result.obligations.find(
      (o) => o.ruleId === "us-de-corporation-annual-report",
    );
    expect(report?.dueOn).toBe("2026-03-01");
  });

  it("does not owe the LLC tax", () => {
    expect(result.obligations.map((o) => o.ruleId)).not.toContain(
      "us-de-llc-annual-tax",
    );
  });
});

describe("an endowed Washington charity that does not solicit", () => {
  const result = evaluate(ENDOWED_NON_SOLICITING_CHARITY, RULES, {
    asOf: "2026-01-01",
    horizonMonths: 12,
    includeDraft: true,
  });

  it("must still register with the Charities Program", () => {
    // THE REGRESSION (NEH-228). The trigger is soliciting donations OR holding
    // $250k+ in charitable assets. With only the soliciting half expressed,
    // this organisation was told it owed nothing — a false negative, where a
    // clean calendar hides a filing.
    expect(result.obligations.map((o) => o.ruleId)).toContain(
      "us-wa-charitable-solicitation-registration",
    );
  });

  it("is not caught merely by having large TOTAL assets", () => {
    // Guards the distinction the fact model exists to preserve: an
    // organisation with big non-charitable holdings and little charitable
    // property must NOT be pushed into registering.
    const nonCharitable = {
      ...ENDOWED_NON_SOLICITING_CHARITY,
      charitableAssetsMinorUnits: 1_000_00, // $1,000 — well under the line
    };
    const narrow = evaluate(nonCharitable, RULES, {
      asOf: "2026-01-01",
      horizonMonths: 12,
      includeDraft: true,
    });
    expect(narrow.obligations.map((o) => o.ruleId)).not.toContain(
      "us-wa-charitable-solicitation-registration",
    );
  });
});

/**
 * Amounts and citations checked against the primary source on 2026-08-05, with
 * the exact quote in each rule's `notes`.
 *
 * These are here because a fee is a plain number in a JSON file, and a plain
 * number is the easiest thing in this repo to "tidy" back to a wrong value
 * months later — the two corrected below had both been wrong since the seed
 * commit, and one of them (Delaware) had a note *asking* for exactly this
 * check. A number nobody asserts is a number that drifts back.
 *
 * Deliberately NOT a claim that the rules are verified: they are all still
 * `draft`, because promotion means a person read the statute. This pins what
 * the reading found so far.
 */
describe("what the primary sources actually say", () => {
  it("charges $400 for the Delaware LLC annual tax, not $300", () => {
    // 6 Del. C. 18-1107(b): "...shall pay an annual tax, for the use of the
    // State of Delaware, in the amount of $400." The seed value of $300 was
    // right for earlier years and had gone stale — the exact rot the
    // `lastVerified` discipline exists to catch.
    expect(byId("us-de-llc-annual-tax").fee?.amountMinorUnits).toBe(40_000);
  });

  it("charges $40 to RENEW a Washington charity registration, not the $60 to apply", () => {
    // RCW 19.09.062 sets both, and the seed took the wrong one. This rule is
    // the renewal. A wrong fee is a smaller failure than a wrong date, but it
    // is the kind a customer notices at the moment they are paying.
    expect(
      byId("us-wa-charitable-solicitation-registration").fee?.amountMinorUnits,
    ).toBe(4_000);
  });

  it("cites a Washington nonprofit section that exists", () => {
    // The seed cited RCW 24.03A.1010, which returns "The Citation you
    // requested cannot be found". An unreviewable citation is worse than a
    // missing one: it looks checked.
    const rule = byId("us-wa-sos-nonprofit-annual-report");
    expect(rule.citation).toContain("24.03A.070");
    expect(rule.citation).not.toContain("24.03A.1010");
  });

  it("does not cite the commercial fund-raiser section for a charity's own renewal", () => {
    // RCW 19.09.097 governs contracts with commercial fund-raisers and says
    // nothing about renewal. Citing it made the rule look sourced while
    // pointing a reviewer at the wrong page.
    expect(
      byId("us-wa-charitable-solicitation-registration").citation,
    ).not.toContain("19.09.097");
  });

  it("rolls the 990 family forward off a weekend, because the IRS says so", () => {
    // Opted in per rule, never globally — rolling by default would invent a
    // legal position no rule claimed. Here the agency states it outright.
    for (const id of [
      "us-federal-form-990",
      "us-federal-form-990-ez",
      "us-federal-form-990-n",
    ]) {
      expect(byId(id).weekendRule).toBe("roll-forward");
    }
  });

  it("does not roll a state report forward, because no state source says to", () => {
    // The other half of the same discipline, and the reason this test exists:
    // an "add it everywhere while I'm here" tidy-up would be a silent legal
    // claim about five agencies that none of them made.
    for (const rule of RULES.filter((r) => r.jurisdiction !== "US")) {
      expect(rule.weekendRule).toBeUndefined();
    }
  });
});
