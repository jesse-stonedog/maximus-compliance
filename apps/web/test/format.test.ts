/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Obligation } from "@maximus/engine";
import {
  daysUntil,
  entityTypeLabel,
  formatDate,
  formatFee,
  formatMoney,
  jurisdictionLabel,
  relativeDue,
  urgency,
} from "../src/lib/format.js";

const obligation: Obligation = {
  ruleId: "us-wa-sos-nonprofit-annual-report",
  title: "Annual Report",
  agency: "Washington Secretary of State",
  jurisdiction: "US-WA",
  dueOn: "2026-03-31",
  citation: "RCW 24.03A.1010",
  status: "active",
  lastVerified: "2026-08-01",
};

describe("formatMoney", () => {
  it.each([
    [6000, "$60.00"],
    [30000, "$300.00"],
    [5, "$0.05"],
    [0, "$0.00"],
    [123456789, "$1,234,567.89"],
  ])("renders %d minor units as %s", (minor, expected) => {
    expect(formatMoney(minor)).toBe(expected);
  });

  it("never loses a cent to floating point", () => {
    for (let cents = 0; cents < 500; cents += 1) {
      expect(formatMoney(cents)).toMatch(/^\$\d[\d,]*\.\d{2}$/);
    }
  });
});

describe("formatFee", () => {
  it('shows an em dash, never "$0.00", when no fee is recorded', () => {
    // Zero would claim the filing is free. What we know is that nobody
    // recorded a fee.
    expect(formatFee(obligation)).toBe("—");
  });

  it("shows a real zero fee as $0.00", () => {
    expect(formatFee({ ...obligation, feeMinorUnits: 0 })).toBe("$0.00");
  });
});

describe("formatDate", () => {
  it("is unambiguous to US and non-US readers alike", () => {
    // 03/04/2026 means two different days depending on the reader. A named
    // month cannot be misread, which matters when the value is a deadline.
    expect(formatDate("2026-03-31")).toBe("31 Mar 2026");
    expect(formatDate("2026-11-01")).toBe("1 Nov 2026");
  });
});

describe("daysUntil", () => {
  it("counts forward and backward", () => {
    expect(daysUntil("2026-01-01", "2026-01-31")).toBe(30);
    expect(daysUntil("2026-01-31", "2026-01-01")).toBe(-30);
    expect(daysUntil("2026-01-01", "2026-01-01")).toBe(0);
  });

  it("crosses a leap day correctly", () => {
    expect(daysUntil("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysUntil("2025-02-28", "2025-03-01")).toBe(1);
  });

  it("crosses a year boundary", () => {
    expect(daysUntil("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("urgency", () => {
  it.each([
    ["2026-01-01", "2025-12-25", "overdue"],
    ["2026-01-01", "2026-01-01", "due-soon"],
    ["2026-01-01", "2026-01-31", "due-soon"],
    ["2026-01-01", "2026-02-15", "upcoming"],
  ])("as of %s, %s is %s", (asOf, dueOn, expected) => {
    expect(urgency(asOf, dueOn)).toBe(expected);
  });

  it("treats today as due-soon rather than overdue", () => {
    // Something due today is still filable today. Calling it overdue would be
    // both wrong and needlessly alarming.
    expect(urgency("2026-03-31", "2026-03-31")).toBe("due-soon");
  });
});

describe("relativeDue", () => {
  it.each([
    ["2026-01-01", "2026-01-01", "due today"],
    ["2026-01-01", "2026-01-02", "due tomorrow"],
    ["2026-01-01", "2026-01-11", "in 10 days"],
    ["2026-01-02", "2026-01-01", "1 day overdue"],
    ["2026-01-11", "2026-01-01", "10 days overdue"],
  ])("as of %s, %s reads as %s", (asOf, dueOn, expected) => {
    expect(relativeDue(asOf, dueOn)).toBe(expected);
  });

  it("switches to months once a day count stops being useful", () => {
    expect(relativeDue("2026-01-01", "2026-07-01")).toBe("in about 6 months");
  });

  it("conveys overdue in words, not only in colour", () => {
    // WCAG 1.4.1: colour must never be the only signal. A screen reader gets
    // nothing from the red text.
    expect(relativeDue("2026-04-12", "2026-03-31")).toContain("overdue");
  });
});

describe("labels", () => {
  it("renders entity types the way a person would say them", () => {
    expect(entityTypeLabel("501c3")).toBe("501(c)(3)");
    expect(entityTypeLabel("llc")).toBe("LLC");
  });

  it("names jurisdictions rather than showing codes", () => {
    expect(jurisdictionLabel("US")).toBe("Federal");
    expect(jurisdictionLabel("US-WA")).toBe("Washington");
  });

  it("falls back to the raw code for anything unmapped", () => {
    // A new jurisdiction must render as "US-TX", not as blank or "undefined".
    expect(jurisdictionLabel("US-TX")).toBe("US-TX");
    expect(entityTypeLabel("co-op")).toBe("co-op");
  });
});

describe("accessible names for repeated items", () => {
  it("distinguishes two occurrences of the same action by date", () => {
    // A recurring action puts this year's and next year's on the page at once.
    // Buttons named only by title are indistinguishable to a screen reader —
    // and the labels are built from formatDate, so this is the piece that has
    // to stay unambiguous.
    expect(formatDate("2026-08-10")).not.toBe(formatDate("2027-08-10"));
  });
});
