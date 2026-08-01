/**
 * The rule type. Mirrors `packages/rules/schema/rule.v1.json`.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The JSON Schema is the contract for *data*; this is the contract for *code*.
 * They are kept in step by a test that validates every fixture against both, so
 * a field added to one and forgotten in the other fails rather than drifting.
 */

import type {
  CalendarDate,
  ConditionableFact,
  EntityType,
  Jurisdiction,
} from "./facts.js";

/**
 * How often the obligation recurs and what its due date is anchored to.
 *
 * These four anchors cover every rule in the seed set, and each exists because
 * a real filing uses it — they are not a generic date DSL. Resist adding a
 * fifth until a rule needs it: an anchor nothing uses is an untested branch
 * that will be wrong the first time someone reaches for it.
 */
export type Cadence =
  /** Due in the anniversary month of formation. Most state annual reports. */
  | {
      type: "annual" | "biennial";
      anchor: "formation-month";
      /** Day within that month; `"last"` is the common case. */
      dayOfMonth: number | "last";
    }
  /** Due on a fixed calendar date every year. Delaware franchise tax. */
  | {
      type: "annual" | "biennial";
      anchor: "calendar";
      month: number;
      day: number;
    }
  /**
   * Due a number of months after the fiscal year ends. The federal returns:
   * Form 990 is due the 15th day of the 5th month after year end, which is
   * 15 May for a calendar-year filer and a different date for everyone else.
   */
  | {
      type: "annual";
      anchor: "fiscal-year-end";
      offsetMonths: number;
      dayOfMonth: number | "last";
    }
  /** Due once, a fixed number of days after formation. Initial reports. */
  | {
      type: "one-time";
      anchor: "formation";
      offsetDays: number;
    };

export interface Fee {
  /** **Integer minor units.** `6000` is $60.00. Never a float — see CLAUDE.md. */
  amountMinorUnits: number;
  currency: "USD";
}

export type ConditionOperator = "lt" | "lte" | "gt" | "gte" | "eq";

/**
 * A predicate over one entity fact.
 *
 * A rule with conditions applies only when **all** of them hold. When a
 * condition tests a fact the entity has not supplied, the rule is neither
 * applied nor dropped — it is reported as indeterminate, so the user is told
 * what they need to answer rather than quietly given an incomplete calendar.
 */
export interface RuleCondition {
  fact: ConditionableFact;
  op: ConditionOperator;
  value: number | boolean;
}

/**
 * Whether a rule has been checked against its primary source by a human.
 *
 * `draft` is not a lesser form of `active` to be tidied up later — it is the
 * honest state for a rule written from general knowledge, and it exists so that
 * contributing a rule you are unsure about is possible without asserting
 * something false. Promotion to `active` means a person read the statute.
 */
export type RuleStatus = "draft" | "active";

export interface Rule {
  /** Stable, kebab-case, jurisdiction-prefixed. A permanent public identifier. */
  id: string;
  jurisdiction: Jurisdiction;
  /** What the filer sees. "Annual Report", not "us-wa-sos-annual-report". */
  title: string;
  /** The body it is filed with. "Washington Secretary of State". */
  agency: string;
  entityTypes: EntityType[];
  cadence: Cadence;
  fee?: Fee;
  conditions?: RuleCondition[];
  /** Form number or name, where the agency uses one. */
  form?: string;
  /** The statute, regulation, or agency page this came from. Required. */
  citation: string;
  citationUrl?: string;
  /** Date a human last confirmed this against the primary source. */
  lastVerified: CalendarDate;
  status: RuleStatus;
  effectiveFrom: CalendarDate;
  /** Absent means still in force. */
  effectiveTo?: CalendarDate;
  /** The rule that replaced this one, for a superseded rule. */
  supersededBy?: string;
  /** Opt-in weekend rolling. See `rollForwardOffWeekend` for why it is opt-in. */
  weekendRule?: "roll-forward";
  notes?: string;
}
