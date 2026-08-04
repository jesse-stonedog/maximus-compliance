/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * How long ago a rule was last checked against its primary source.
 *
 * Crowdsourced regulatory data does not fail loudly — it rots quietly. A rule
 * stays schema-valid forever while the fee it names changed two legislative
 * sessions ago. `lastVerified` is the only thing that distinguishes a rule a
 * human read last week from one nobody has read since it was written, and until
 * now it was reported by `npm run rules:staleness` to a maintainer and shown to
 * the person actually relying on the deadline nowhere at all.
 *
 * ## Why this lives in the engine
 *
 * It is date arithmetic over `CalendarDate`, which is the engine's job and
 * nobody else's. Putting it in the web app would mean the CLI and the hosted
 * tier each grow their own copy, and three implementations of "is this twelve
 * months old" will disagree at the boundary — which is the only place it
 * matters.
 *
 * It is also the honest basis for what the cloud tier sells. "We re-verify" is
 * a service rather than a feature, and a staleness indicator is the proof it is
 * real, so the same computation has to be available to both tiers.
 *
 * ## Clock-free, like everything else here
 *
 * Every function takes an explicit `asOf`. Nothing calls `Date.now()`. That is
 * what makes "how stale was this rule in 2024" answerable and the tests
 * deterministic — see the engine purity test, which enforces it.
 */

import { addMonths, compareDates, parseDate } from "./calendar.js";
import type { CalendarDate } from "./facts.js";

/**
 * The age at which a rule is called out as stale.
 *
 * Twelve months, matching `npm run rules:staleness --months 12` and the
 * convention in CONTRIBUTING. The two must agree: a dashboard that flags a rule
 * the CI report considers fine (or the reverse) teaches people to trust
 * neither.
 *
 * It is a legislative-session heuristic rather than a precise one. Most states
 * meet annually, so a rule unread for a year has had at least one opportunity
 * to become wrong.
 */
export const STALE_AFTER_MONTHS = 12;

/**
 * Whole months from `lastVerified` up to `asOf`.
 *
 * Whole months, not days-divided-by-30: the threshold is expressed in months
 * and the two must not disagree at the boundary. Counting by advancing months
 * from the anchor also gets the irregular cases right for free — the 31st of a
 * month, and February 29th — because `addMonths` already clamps to the last day
 * of a short target month.
 *
 * Returns 0 when `lastVerified` is in the future. That is a data error rather
 * than a state to render, and reporting it as a negative age would put "-3
 * months" in front of a user; `isStale` treats it as fresh and the rule
 * validator is the right place to reject it.
 */
export function monthsSinceVerified(
  lastVerified: CalendarDate,
  asOf: CalendarDate,
): number {
  if (compareDates(lastVerified, asOf) >= 0) return 0;

  const from = parseDate(lastVerified);
  const to = parseDate(asOf);

  // An upper bound on the answer, then walk back to the largest n where
  // lastVerified + n months is still on or before asOf. Bounded by construction,
  // so there is no unbounded loop over a far-future date.
  let months = (to.year - from.year) * 12 + (to.month - from.month);
  while (months > 0 && compareDates(addMonths(lastVerified, months), asOf) > 0) {
    months -= 1;
  }
  return months;
}

/**
 * Whether a rule has gone unverified longer than the threshold.
 *
 * `months` is a parameter so a caller can ask a stricter question (the hosted
 * tier may well want six), but it defaults to the one number the repo agrees
 * on.
 */
export function isStale(
  lastVerified: CalendarDate,
  asOf: CalendarDate,
  months: number = STALE_AFTER_MONTHS,
): boolean {
  return monthsSinceVerified(lastVerified, asOf) >= months;
}
