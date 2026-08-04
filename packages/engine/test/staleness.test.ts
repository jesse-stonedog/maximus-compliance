/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The boundary is the whole point of these tests.
 *
 * A staleness indicator that is right in the middle of the range and wrong at
 * exactly twelve months is worse than none: it disagrees with
 * `npm run rules:staleness` for the rules closest to the line, which are
 * precisely the rules someone is deciding about.
 */

import {
  STALE_AFTER_MONTHS,
  isStale,
  monthsSinceVerified,
} from "../src/staleness.js";

describe("monthsSinceVerified", () => {
  it("counts whole months", () => {
    expect(monthsSinceVerified("2025-01-15", "2026-01-15")).toBe(12);
    expect(monthsSinceVerified("2025-01-15", "2025-07-15")).toBe(6);
    expect(monthsSinceVerified("2025-01-15", "2025-02-14")).toBe(0);
  });

  it("does not round a partial month up", () => {
    // One day short of twelve months is eleven months, not twelve. This is the
    // case a days/30 implementation gets wrong.
    expect(monthsSinceVerified("2025-01-15", "2026-01-14")).toBe(11);
  });

  it("is zero on the day it was verified", () => {
    expect(monthsSinceVerified("2026-08-04", "2026-08-04")).toBe(0);
  });

  it("treats a future lastVerified as fresh rather than negative", () => {
    // A data error, not a state to render. "-3 months" in front of a user is
    // worse than treating it as just-verified; the rule validator rejects it.
    expect(monthsSinceVerified("2027-01-01", "2026-08-04")).toBe(0);
  });

  describe("month-length irregularities", () => {
    it("handles a 31st anchored into shorter months", () => {
      // 31 Jan + 1 month clamps to 28 Feb, so 28 Feb is a full month later.
      expect(monthsSinceVerified("2025-01-31", "2025-02-28")).toBe(1);
      // ...but 27 Feb is not.
      expect(monthsSinceVerified("2025-01-31", "2025-02-27")).toBe(0);
      expect(monthsSinceVerified("2025-01-31", "2025-03-31")).toBe(2);
    });

    it("handles a leap day anchor", () => {
      // 2027 is not a leap year, so the anniversary clamps to 28 Feb.
      expect(monthsSinceVerified("2024-02-29", "2025-02-28")).toBe(12);
      expect(monthsSinceVerified("2024-02-29", "2025-02-27")).toBe(11);
      // 2028 is a leap year and the anniversary is exact.
      expect(monthsSinceVerified("2024-02-29", "2028-02-29")).toBe(48);
    });

    it("handles a 30th anchored into February", () => {
      expect(monthsSinceVerified("2025-03-30", "2026-02-28")).toBe(11);
    });
  });

  it("counts across multiple years", () => {
    expect(monthsSinceVerified("2020-06-01", "2026-08-04")).toBe(74);
  });
});

describe("isStale", () => {
  it("is false below the threshold", () => {
    expect(isStale("2025-09-01", "2026-08-04")).toBe(false);
  });

  it("is true exactly at the threshold", () => {
    // Inclusive: `rules:staleness` reports "unverified for more than N months"
    // using a cutoff date, and a rule verified exactly N months ago is on the
    // wrong side of it. The dashboard must agree.
    expect(isStale("2025-08-04", "2026-08-04")).toBe(true);
  });

  it("is false one day before the threshold", () => {
    expect(isStale("2025-08-05", "2026-08-04")).toBe(false);
  });

  it("is true well past the threshold", () => {
    expect(isStale("2020-01-01", "2026-08-04")).toBe(true);
  });

  it("accepts a stricter threshold", () => {
    expect(isStale("2026-01-04", "2026-08-04", 6)).toBe(true);
    expect(isStale("2026-01-04", "2026-08-04", 12)).toBe(false);
  });

  it("defaults to the threshold the repo agrees on", () => {
    expect(STALE_AFTER_MONTHS).toBe(12);
  });
});
