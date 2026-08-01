/**
 * The evaluator.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import {
  addDays,
  addMonths,
  compareDates,
  dateInMonth,
  isOnOrAfter,
  isOnOrBefore,
  parseDate,
  parseMonthDay,
  rollForwardOffWeekend,
} from "./calendar.js";
import type { CalendarDate, EntityFacts } from "./facts.js";
import type { Cadence, Rule, RuleCondition, RuleStatus } from "./rule.js";

/** One thing the entity owes, on one date. */
export interface Obligation {
  ruleId: string;
  title: string;
  agency: string;
  jurisdiction: string;
  dueOn: CalendarDate;
  feeMinorUnits?: number;
  currency?: "USD";
  form?: string;
  citation: string;
  citationUrl?: string;
  /**
   * Carried through from the rule so a consumer can label it. The engine
   * reports; it does not decide how an unverified rule should be presented.
   */
  status: RuleStatus;
  lastVerified: CalendarDate;
}

/**
 * A rule that might apply but cannot be decided, because the entity has not
 * supplied a fact the rule tests.
 *
 * Reported rather than silently dropped. "You may owe a Form 990 — tell us your
 * gross revenue" is useful; an incomplete calendar presented as complete is
 * exactly the failure this product cannot afford.
 */
export interface IndeterminateRule {
  ruleId: string;
  title: string;
  jurisdiction: string;
  /** Facts the entity would need to supply to decide it. */
  missingFacts: string[];
}

export interface EvaluateOptions {
  /**
   * The date to evaluate as of. **Required, with no default.** The engine never
   * reads the clock: a default here would make every result depend on when it
   * ran, which breaks caching, reproducibility, and any question about the past.
   */
  asOf: CalendarDate;
  /** How far ahead to project recurring obligations. Default 12. */
  horizonMonths?: number;
  /** Include rules still marked `draft`. Default false. */
  includeDraft?: boolean;
}

export interface EvaluationResult {
  obligations: Obligation[];
  indeterminate: IndeterminateRule[];
}

/**
 * What does this entity owe between `asOf` and the horizon?
 *
 * Pure and total: same inputs, same output, forever. No I/O, no clock, no
 * environment. That is what makes it testable against thousands of fixtures,
 * safe to run in a browser, and safe to expose as the B2B API.
 */
export function evaluate(
  entity: EntityFacts,
  rules: readonly Rule[],
  options: EvaluateOptions,
): EvaluationResult {
  const { asOf, horizonMonths = 12, includeDraft = false } = options;
  const horizonEnd = addMonths(asOf, horizonMonths);

  const obligations: Obligation[] = [];
  const indeterminate: IndeterminateRule[] = [];

  for (const rule of rules) {
    if (rule.status === "draft" && !includeDraft) continue;
    if (!appliesToJurisdiction(entity, rule)) continue;
    if (!appliesToEntityType(entity, rule)) continue;

    const missingFacts = missingConditionFacts(entity, rule);
    if (missingFacts.length > 0) {
      indeterminate.push({
        ruleId: rule.id,
        title: rule.title,
        jurisdiction: rule.jurisdiction,
        missingFacts,
      });
      continue;
    }
    if (!conditionsHold(entity, rule)) continue;

    for (const dueOn of dueDatesInWindow(entity, rule, asOf, horizonEnd)) {
      // The rule's own effective window is checked against the DUE date, not
      // against `asOf`. A rule that expires in June still governs a filing that
      // was due in March, which is what makes historical questions answerable.
      if (!ruleInForceOn(rule, dueOn)) continue;

      obligations.push({
        ruleId: rule.id,
        title: rule.title,
        agency: rule.agency,
        jurisdiction: rule.jurisdiction,
        dueOn,
        ...(rule.fee
          ? {
              feeMinorUnits: rule.fee.amountMinorUnits,
              currency: rule.fee.currency,
            }
          : {}),
        ...(rule.form ? { form: rule.form } : {}),
        citation: rule.citation,
        ...(rule.citationUrl ? { citationUrl: rule.citationUrl } : {}),
        status: rule.status,
        lastVerified: rule.lastVerified,
      });
    }
  }

  obligations.sort(
    (a, b) => compareDates(a.dueOn, b.dueOn) || a.ruleId.localeCompare(b.ruleId),
  );
  indeterminate.sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  return { obligations, indeterminate };
}

// ---------------------------------------------------------------------------
// Applicability
// ---------------------------------------------------------------------------

function appliesToJurisdiction(entity: EntityFacts, rule: Rule): boolean {
  return entity.jurisdictions.includes(rule.jurisdiction);
}

function appliesToEntityType(entity: EntityFacts, rule: Rule): boolean {
  // An entity holds several legal forms at once — a 501(c)(3) is also a
  // nonprofit corporation — and a rule applies if ANY of them matches. Testing
  // a single "primary" type would drop either the state report or the federal
  // return depending on which one was called primary.
  return rule.entityTypes.some((type) => entity.entityTypes.includes(type));
}

function ruleInForceOn(rule: Rule, date: CalendarDate): boolean {
  if (!isOnOrAfter(date, rule.effectiveFrom)) return false;
  if (rule.effectiveTo && !isOnOrBefore(date, rule.effectiveTo)) return false;
  return true;
}

function factValue(
  entity: EntityFacts,
  fact: RuleCondition["fact"],
): number | boolean | undefined {
  return entity[fact];
}

function missingConditionFacts(entity: EntityFacts, rule: Rule): string[] {
  const missing = (rule.conditions ?? [])
    .filter((condition) => factValue(entity, condition.fact) === undefined)
    .map((condition) => condition.fact);
  return [...new Set(missing)];
}

function conditionsHold(entity: EntityFacts, rule: Rule): boolean {
  return (rule.conditions ?? []).every((condition) => {
    const actual = factValue(entity, condition.fact);
    if (actual === undefined) return false;
    switch (condition.op) {
      case "eq":
        return actual === condition.value;
      case "lt":
        return actual < condition.value;
      case "lte":
        return actual <= condition.value;
      case "gt":
        return actual > condition.value;
      case "gte":
        return actual >= condition.value;
    }
  });
}

// ---------------------------------------------------------------------------
// Due dates
// ---------------------------------------------------------------------------

/**
 * Every due date this rule produces between `from` and `to`, inclusive.
 *
 * Walks forward from the rule's first occurrence rather than computing "the
 * next one" from `asOf`. Slower, and correct for biennial cadences: an
 * entity formed in an odd year files in odd years, and a from-now calculation
 * loses that parity.
 */
function dueDatesInWindow(
  entity: EntityFacts,
  rule: Rule,
  from: CalendarDate,
  to: CalendarDate,
): CalendarDate[] {
  const dates: CalendarDate[] = [];
  const step = rule.cadence.type === "biennial" ? 2 : 1;

  if (rule.cadence.type === "one-time") {
    const due = applyWeekendRule(
      rule,
      addDays(entity.formedOn, rule.cadence.offsetDays),
    );
    return isOnOrAfter(due, from) && isOnOrBefore(due, to) ? [due] : [];
  }

  const firstYear = parseDate(entity.formedOn).year;
  const lastYear = parseDate(to).year;

  for (let year = firstYear; year <= lastYear; year += step) {
    const raw = occurrenceInYear(entity, rule.cadence, year);
    if (raw === undefined) continue;
    // An obligation cannot predate the entity. A calendar-anchored rule would
    // otherwise emit a due date in the formation year that fell before the
    // entity existed.
    if (!isOnOrAfter(raw, entity.formedOn)) continue;

    const due = applyWeekendRule(rule, raw);
    if (isOnOrAfter(due, from) && isOnOrBefore(due, to)) dates.push(due);
  }

  return dates;
}

function occurrenceInYear(
  entity: EntityFacts,
  cadence: Cadence,
  year: number,
): CalendarDate | undefined {
  switch (cadence.anchor) {
    case "formation-month": {
      const { month } = parseDate(entity.formedOn);
      return dateInMonth(year, month, cadence.dayOfMonth);
    }
    case "calendar": {
      return dateInMonth(year, cadence.month, cadence.day);
    }
    case "fiscal-year-end": {
      // The year end that FALLS in this year, then offset forward. For a
      // calendar-year filer with a 5-month offset that is 31 Dec -> 31 May of
      // the following year, which is why the due date can land outside `year`.
      const { month, day } = parseMonthDay(entity.fiscalYearEnd);
      const yearEnd = dateInMonth(year, month, day);
      const shifted = addMonths(yearEnd, cadence.offsetMonths);
      const { year: dueYear, month: dueMonth } = parseDate(shifted);
      return dateInMonth(dueYear, dueMonth, cadence.dayOfMonth);
    }
    case "formation":
      return undefined;
  }
}

function applyWeekendRule(rule: Rule, date: CalendarDate): CalendarDate {
  return rule.weekendRule === "roll-forward"
    ? rollForwardOffWeekend(date)
    : date;
}
