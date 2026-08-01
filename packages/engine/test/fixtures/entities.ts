/**
 * Fixture entities. Obviously fake, on purpose.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * This repo is public. A fixture built from a real organisation would publish
 * its EIN, formation date and revenue permanently, so every name here is
 * plainly invented and every number is round.
 */

import type { EntityFacts } from "../../src/facts.js";

export const WA_SMALL_CHARITY: EntityFacts = {
  name: "Example Cascade Trails Association",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 4_200_000, // $42,000 — under the 990-N ceiling
  totalAssetsMinorUnits: 1_100_000,
  solicitsCharitableContributions: true,
};

export const WA_LARGE_CHARITY: EntityFacts = {
  name: "Example Puget Housing Fund",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2015-09-30",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "06-30", // deliberately not a calendar year
  grossRevenueMinorUnits: 310_000_000, // $3.1M
  totalAssetsMinorUnits: 890_000_000,
  solicitsCharitableContributions: true,
};

export const OR_LLC: EntityFacts = {
  name: "Example Willamette Woodworks LLC",
  entityTypes: ["llc"],
  formedOn: "2023-01-31", // month-end formation, to exercise clamping
  homeJurisdiction: "US-OR",
  jurisdictions: ["US-OR"],
  fiscalYearEnd: "12-31",
};

export const DE_CORP: EntityFacts = {
  name: "Example Nautilus Robotics Inc.",
  entityTypes: ["c-corp"],
  formedOn: "2024-02-29", // leap-day formation
  homeJurisdiction: "US-DE",
  jurisdictions: ["US-DE"],
  fiscalYearEnd: "12-31",
};

/** Registered in Delaware and foreign-qualified in Washington. */
export const MULTI_STATE_CORP: EntityFacts = {
  name: "Example Rainier Analytics Inc.",
  entityTypes: ["c-corp"],
  formedOn: "2022-07-10",
  homeJurisdiction: "US-DE",
  jurisdictions: ["US-DE", "US-WA"],
  fiscalYearEnd: "12-31",
  registeredOn: { "US-WA": "2023-04-01" },
};

/**
 * Modest receipts, large endowment.
 *
 * The entity the AND-only condition grammar got wrong: under the receipts
 * threshold, far over the assets one, and so owing a full Form 990 while being
 * told it owed nothing. A false negative — the user sees a clean calendar and
 * misses a filing.
 */
export const ENDOWED_CHARITY: EntityFacts = {
  name: "Example Kitsap Heritage Endowment",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2010-05-20",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 8_000_000, // $80,000 — under the $200k receipts test
  totalAssetsMinorUnits: 1_200_000_000, // $12M — far over the $500k assets test
  solicitsCharitableContributions: false,
};

/** A charity that has not told us its revenue. Drives the indeterminate path. */
export const CHARITY_WITHOUT_REVENUE: EntityFacts = {
  name: "Example Olympic Literacy Project",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2020-11-05",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  solicitsCharitableContributions: true,
};
