/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The report link is the ONLY path in the self-hosted product that sends
 * anything to a third party.
 *
 * Everything else in this tier runs on the user's own machine against their own
 * SQLite file — that is the tier's whole proposition. So this one link is worth
 * more scrutiny than its size suggests: it opens github.com with a query string
 * that lands in a **public, permanent** issue tracker, in their browser history,
 * and in whatever proxy sits between.
 *
 * The tests below are therefore mostly about what is NOT in it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { jurisdictionLabel, REPO, reportRuleUrl } from "../src/lib/report-rule";

const RULE = {
  ruleId: "us-wa-sos-nonprofit-annual-report",
  jurisdiction: "US-WA",
  title: "Nonprofit Corporation Annual Report",
  agencyUrl: "https://www.sos.wa.gov/corporations-charities/",
};

describe("reportRuleUrl", () => {
  it("points at the issue FORM, not a blank issue", () => {
    // A blank issue from a non-developer is a paragraph of prose with no
    // jurisdiction and no source, and the source is the one thing the project
    // will not publish a rule without.
    const url = new URL(reportRuleUrl(RULE));
    expect(url.origin).toBe("https://github.com");
    expect(url.pathname).toBe(`/${REPO}/issues/new`);
    expect(url.searchParams.get("template")).toBe("rule-change.yml");
  });

  it("prefills what the screen already knows", () => {
    const params = new URL(reportRuleUrl(RULE)).searchParams;
    expect(params.get("jurisdiction")).toBe("WA");
    expect(params.get("rule-id")).toBe("us-wa-sos-nonprofit-annual-report");
    expect(params.get("filing")).toBe("Nonprofit Corporation Annual Report");
    // The page we just asked them to check. They have the tab open; making them
    // paste it back is the friction that turns a report into a shrug.
    expect(params.get("citation")).toBe(RULE.agencyUrl);
  });

  it("leaves WHAT IS WRONG empty, because only they can answer it", () => {
    // Prefilling a guess here would put our words in their report — and this is
    // the field a maintainer reads first.
    const params = new URL(reportRuleUrl(RULE)).searchParams;
    expect(params.get("whats-wrong")).toBeNull();
  });

  it("carries NOTHING about the entity, even when handed extra fields", () => {
    // The signature takes a `RuleContext` so an entity field cannot be passed
    // by accident. This asserts the runtime behaviour too: a caller that
    // spreads a whole `DatedItem` in — the obvious mistake — must not leak.
    const url = reportRuleUrl({
      ...RULE,
      // @ts-expect-error deliberately passing fields the type forbids
      entityId: "entity-0c4f",
      entityName: "Cascade Trails Association",
      ein: "91-1234567",
      revenueMinorUnits: 42_000_00,
    });

    expect(url).not.toMatch(/entity/i);
    expect(url).not.toMatch(/Cascade/i);
    expect(url).not.toMatch(/91-1234567/);
    expect(url).not.toMatch(/4200000/);

    // Positively, so this cannot pass by the function returning nothing useful.
    const params = new URL(url).searchParams;
    expect([...params.keys()].sort()).toEqual([
      "citation",
      "filing",
      "jurisdiction",
      "rule-id",
      "template",
    ]);
  });

  it("omits a field rather than sending an empty one", () => {
    // A rule with no agency page is a legitimate state. `citation=` in the URL
    // would prefill the required source box with an empty string, which reads
    // as answered.
    const params = new URL(reportRuleUrl({ title: "Some filing" })).searchParams;
    expect(params.has("citation")).toBe(false);
    expect(params.has("rule-id")).toBe(false);
    expect(params.has("jurisdiction")).toBe(false);
    expect(params.get("filing")).toBe("Some filing");
  });

  it("escapes a title rather than breaking the URL with it", () => {
    const url = reportRuleUrl({ ...RULE, title: "Form 990 & 990-T (combined)?" });
    // Round-trips: whatever the encoding, the value that comes back out is the
    // value that went in.
    expect(new URL(url).searchParams.get("filing")).toBe("Form 990 & 990-T (combined)?");
    // And the `&` did not start a new parameter.
    expect(new URL(url).searchParams.get("990-T (combined)?")).toBeNull();
  });
});

describe("jurisdictionLabel", () => {
  it("says what a person would say", () => {
    expect(jurisdictionLabel("US")).toBe("federal");
    expect(jurisdictionLabel("US-WA")).toBe("WA");
    expect(jurisdictionLabel("US-WA/seattle")).toBe("WA/seattle");
  });

  it("returns empty for an absent jurisdiction rather than the string undefined", () => {
    // `String(undefined)` in a query parameter is the classic version of this,
    // and it reads as a real answer to whoever triages the issue.
    expect(jurisdictionLabel(undefined)).toBe("");
  });

  it("passes an unrecognised code through rather than guessing", () => {
    // Deliberately no 50-state lookup table: it would drift from the rule pack,
    // and a confidently-wrong expansion is worse than a code a human can read.
    expect(jurisdictionLabel("CA-BC")).toBe("CA-BC");
  });
});

describe("the prefill keys are a contract with the issue template", () => {
  /**
   * GitHub keys prefills by each field's `id` in the YAML. A renamed field
   * there does not error — the link still opens, the box is just empty — so
   * nothing would report this breaking except a person noticing that reports
   * stopped arriving prefilled.
   */
  const template = readFileSync(
    join(__dirname, "..", "..", "..", ".github", "ISSUE_TEMPLATE", "rule-change.yml"),
    "utf8",
  );

  it.each(["jurisdiction", "filing", "rule-id", "citation"])(
    "the template still has a field with id %s",
    (id) => {
      expect(template).toMatch(new RegExp(`^\\s*id:\\s*${id}\\s*$`, "m"));
    },
  );

  it("the template warns about pasting private detail, at the point of entry", () => {
    // The README says it too, but the person filling in a free-text box has
    // not necessarily read the README — and free text is exactly where somebody
    // pastes their own EIN.
    expect(template).toMatch(/public and permanent/i);
    expect(template).toMatch(/EIN/);
  });

  it("still requires a source", () => {
    // The project will not publish a deadline nobody can check. If this ever
    // becomes optional it should be a decision, not a diff nobody noticed.
    expect(template).toMatch(/id:\s*citation/);
    expect(template).toMatch(/required:\s*true/);
  });
});
