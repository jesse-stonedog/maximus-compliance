/**
 * Reports rules nobody has re-verified lately.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Crowdsourced regulatory data does not fail loudly — it rots quietly. A rule
 * stays schema-valid forever while the fee it names changed two legislative
 * sessions ago. This turns that silent decay into a work queue.
 *
 * **It reports; it does not fail the build.** A stale rule is not broken, and a
 * gate that goes red on the calendar rather than on a change would be
 * disabled within a month — at which point the signal is gone entirely.
 *
 *   node scripts/staleness.mjs [--months 12] [--as-of YYYY-MM-DD]
 */

import { loadRules } from "./build-barrel.mjs";

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : process.argv[index + 1];
}

const months = Number(arg("months", "12"));
// Defaults to today, but overridable so the report is reproducible in a test
// or a CI run being re-examined later.
const asOf = arg("as-of", new Date().toISOString().slice(0, 10));

const cutoffDate = new Date(`${asOf}T00:00:00Z`);
cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - months);
const cutoff = cutoffDate.toISOString().slice(0, 10);

const rules = await loadRules();
const stale = rules
  .filter(({ rule }) => rule.lastVerified < cutoff)
  .sort((a, b) => a.rule.lastVerified.localeCompare(b.rule.lastVerified));
const drafts = rules.filter(({ rule }) => rule.status === "draft");

console.log(`Rule verification report — as of ${asOf}\n`);

if (drafts.length > 0) {
  console.log(
    `${drafts.length} rule(s) are status "draft" — written but never checked against the primary source:`,
  );
  for (const { rule } of drafts) {
    console.log(`  ${rule.id.padEnd(46)} ${rule.citation}`);
  }
  console.log();
}

if (stale.length === 0) {
  console.log(`No rule has gone unverified for more than ${months} months.`);
} else {
  console.log(
    `${stale.length} rule(s) unverified for more than ${months} months (before ${cutoff}):`,
  );
  for (const { rule } of stale) {
    console.log(`  ${rule.lastVerified}  ${rule.id.padEnd(46)} ${rule.citation}`);
  }
  console.log(
    `\nRe-read the primary source before bumping lastVerified. Bumping it without` +
      `\nre-reading converts an honest "unknown" into a false "checked", which is worse` +
      `\nthan leaving it stale.`,
  );
}
