/**
 * The entity fact model.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * **A rule may only reference a fact that appears here.** That constraint is
 * enforced by `rules:validate`, and it is why this file was written before the
 * rule schema rather than alongside it: design rules first and you discover
 * each missing fact one rule at a time, versioning the schema repeatedly. Every
 * schema version is a migration for self-hosters and a breaking change for the
 * B2B API.
 *
 * Adding a fact is cheap and backwards-compatible. Changing what an existing
 * one *means* is neither — a rule written against the old meaning keeps
 * validating and starts producing wrong dates, with nothing failing anywhere.
 */

/**
 * A civil calendar date, `YYYY-MM-DD`.
 *
 * Deliberately a string, never a `Date`. A filing deadline is a civil date in
 * the filing jurisdiction, not an instant: "due March 31" is the same date for
 * a user in Seattle and one in Berlin, and the moment it becomes a `Date` it
 * acquires a timezone that will eventually shift it by a day.
 */
export type CalendarDate = string;

/** A month and day with no year, `MM-DD`. Used for fiscal year ends. */
export type MonthDay = string;

/**
 * A filing jurisdiction.
 *
 * `US` for federal, ISO 3166-2 for states (`US-WA`), and `US-WA/seattle` for a
 * municipality. Lowercase the municipality; the state part stays uppercase.
 */
export type Jurisdiction = string;

/**
 * Legal forms the rule packs distinguish between.
 *
 * `501c3` is a *tax* status layered on a state entity, not a state form — a
 * 501(c)(3) is almost always also a `nonprofit-corp`. Both are listed on an
 * entity that has both, because state and federal rules key off different ones:
 * Washington's annual report applies to the nonprofit corporation, and Form 990
 * applies to the exempt organisation.
 */
export const ENTITY_TYPES = [
  "501c3",
  "nonprofit-corp",
  "llc",
  "s-corp",
  "c-corp",
  "b-corp",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/**
 * Everything the engine knows about an entity.
 *
 * Optional fields are genuinely unknown rather than zero. A rule that needs one
 * and does not get it is reported as **indeterminate** rather than silently
 * skipped — see `evaluate`. Treating "revenue unknown" as "revenue is 0" is how
 * a system tells a large charity it can file the postcard return.
 */
export interface EntityFacts {
  /** Display name. Never used in evaluation; carried for output only. */
  name: string;

  /** Every legal form this entity holds. See `ENTITY_TYPES`. */
  entityTypes: EntityType[];

  /** Date of formation in the home jurisdiction. Anchors anniversary cadences. */
  formedOn: CalendarDate;

  /** The state the entity was formed in. */
  homeJurisdiction: Jurisdiction;

  /**
   * Every jurisdiction the entity is registered in, including `US` and the
   * home state. A rule only applies if its jurisdiction is in this list —
   * registering in a state is what creates the obligation to it.
   */
  jurisdictions: Jurisdiction[];

  /**
   * Fiscal year end as `MM-DD`. Defaults to `12-31` at the call site, never
   * here — a silent default in the model hides the difference between "calendar
   * year" and "nobody told us", and the federal return's due date depends on it.
   */
  fiscalYearEnd: MonthDay;

  /**
   * When the entity registered in each foreign jurisdiction, for rules anchored
   * to the registration anniversary rather than to formation. Keyed by
   * jurisdiction.
   */
  registeredOn?: Record<Jurisdiction, CalendarDate>;

  /** Gross annual revenue in **integer minor units** (cents). */
  grossRevenueMinorUnits?: number;

  /** Total assets in **integer minor units** (cents). */
  totalAssetsMinorUnits?: number;

  /**
   * Assets held for charitable purposes, in **integer minor units**.
   *
   * **Deliberately not the same as `totalAssetsMinorUnits`.** Several state
   * charity-registration thresholds are written against charitable assets
   * specifically, and an organisation can hold substantial non-charitable
   * assets — an endowment restricted to a non-charitable purpose, a trading
   * subsidiary — that do not count toward them. Reusing total assets would
   * over-trigger registration for exactly those organisations, and telling
   * someone to register when they need not is a real cost in fees and filings.
   */
  charitableAssetsMinorUnits?: number;

  /** Headcount, for rules with an employee threshold. */
  employeeCount?: number;

  /**
   * Whether the entity solicits charitable contributions. Drives state charity
   * registration, which is a separate obligation from the corporate annual
   * report and is the one people most often miss.
   */
  solicitsCharitableContributions?: boolean;
}

/** The fact names a rule condition is allowed to test. Enforced by the validator. */
export const CONDITIONABLE_FACTS = [
  "grossRevenueMinorUnits",
  "totalAssetsMinorUnits",
  "charitableAssetsMinorUnits",
  "employeeCount",
  "solicitsCharitableContributions",
] as const;
export type ConditionableFact = (typeof CONDITIONABLE_FACTS)[number];

export function isEntityType(value: unknown): value is EntityType {
  return ENTITY_TYPES.includes(value as EntityType);
}
