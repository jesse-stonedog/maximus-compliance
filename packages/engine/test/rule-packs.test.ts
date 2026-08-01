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
    // Year ends 30 June, so the return is due 15 November — the case a
    // hardcoded "May 15" gets wrong for every non-calendar filer.
    const federal = result.obligations.find((o) => o.jurisdiction === "US");
    expect(federal?.ruleId).toBe("us-federal-form-990");
    expect(federal?.dueOn).toBe("2026-11-15");
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
