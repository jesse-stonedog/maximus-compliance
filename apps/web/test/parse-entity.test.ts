/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { dollarsToMinorUnits, parseEntityForm } from "../src/lib/parse-entity.js";

function form(fields: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
  }
  return fd;
}

const valid = {
  name: "Example Cascade Trails Association",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: "US, US-WA",
  fiscalYearEnd: "12-31",
};

describe("dollarsToMinorUnits", () => {
  it.each([
    ["42000", 4_200_000],
    ["1234.56", 123456],
    ["0.05", 5],
    ["0", 0],
  ])("converts %s dollars to %d minor units", (input, expected) => {
    expect(dollarsToMinorUnits(input)).toBe(expected);
  });

  it("does not lose a cent to floating point", () => {
    // parseFloat("1234.56") * 100 is 123455.99999999999. Truncating that loses
    // a cent; this is the one place a human-entered decimal crosses into the
    // integer-minor-units convention the rest of the codebase relies on.
    for (const dollars of ["1234.56", "0.29", "19.99", "8.07", "100.10"]) {
      const minor = dollarsToMinorUnits(dollars)!;
      expect(Number.isInteger(minor)).toBe(true);
      expect(minor).toBe(Math.round(Number(dollars) * 100));
    }
  });

  it("treats blank as unknown, not as zero", () => {
    expect(dollarsToMinorUnits("")).toBeUndefined();
    expect(dollarsToMinorUnits("   ")).toBeUndefined();
  });

  it("rejects nonsense and negatives rather than coercing them", () => {
    expect(dollarsToMinorUnits("abc")).toBeUndefined();
    expect(dollarsToMinorUnits("-5")).toBeUndefined();
  });
});

describe("parseEntityForm", () => {
  it("accepts a complete form", () => {
    const result = parseEntityForm(form(valid));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts).toMatchObject({
      name: valid.name,
      entityTypes: ["501c3", "nonprofit-corp"],
      formedOn: "2021-03-15",
      fiscalYearEnd: "12-31",
    });
  });

  it.each([
    [{ name: "" }, /Name is required/],
    [{ entityTypes: [] }, /at least one legal form/],
    [{ formedOn: "15-03-2021" }, /real date/],
    [{ homeJurisdiction: "Washington" }, /not a recognised code/],
    [{ jurisdictions: "US, Cascadia" }, /not a recognised jurisdiction/],
    [{ fiscalYearEnd: "December" }, /MM-DD/],
    [{ fiscalYearEnd: "13-01" }, /not a real month/],
  ])("rejects %o", (override, message) => {
    const result = parseEntityForm(form({ ...valid, ...override }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(message);
  });

  it("adds the home jurisdiction if the user left it out of the list", () => {
    // A rule only applies if its jurisdiction is listed, so omitting the home
    // state would silently drop every state filing — a false negative from a
    // typo. Adding it is what the user meant.
    const result = parseEntityForm(form({ ...valid, jurisdictions: "US" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.jurisdictions).toContain("US-WA");
  });

  it("uppercases jurisdiction codes so us-wa works", () => {
    const result = parseEntityForm(
      form({ ...valid, homeJurisdiction: "us-wa", jurisdictions: "us, us-wa" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.homeJurisdiction).toBe("US-WA");
  });

  it("omits an unfilled money field rather than storing zero", () => {
    const result = parseEntityForm(form(valid));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts).not.toHaveProperty("grossRevenueMinorUnits");
  });

  it("keeps a real zero the user typed", () => {
    const result = parseEntityForm(form({ ...valid, grossRevenue: "0" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.grossRevenueMinorUnits).toBe(0);
  });

  it("reads an unticked solicits box as false, not unknown", () => {
    // The checkbox is always in the submission, so absence means "no" here —
    // unlike the money fields, where absence genuinely means "not supplied".
    const result = parseEntityForm(form(valid));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.solicitsCharitableContributions).toBe(false);
  });

  it("reads a ticked solicits box as true", () => {
    const result = parseEntityForm(form({ ...valid, solicits: "true" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.solicitsCharitableContributions).toBe(true);
  });

  it("drops an entity type the engine does not know", () => {
    const result = parseEntityForm(
      form({ ...valid, entityTypes: ["501c3", "sole-trader"] }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.entityTypes).toEqual(["501c3"]);
  });
});
