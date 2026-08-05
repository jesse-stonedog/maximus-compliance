/**
 * Rendering. Pure, so it can be tested without running a process.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { EvaluationResult, Obligation } from "@optima-compliance/engine";

/**
 * The disclaimer.
 *
 * Printed on every human-readable run, not hidden behind `--help`. This tool
 * tells people when to file with a government, and a missed deadline costs real
 * money — so the caveat belongs where the answer is, every time, not in a
 * document nobody opens twice.
 *
 * Omitted from `--json` on purpose: that output is consumed by a program, and
 * the obligation to inform the human sits with whatever renders it.
 */
export const DISCLAIMER = [
  "This is not legal or tax advice. Deadlines and fees change, and your",
  "circumstances may be unusual. Every line above cites its source — check",
  "anything that matters. You remain responsible for your own filings.",
].join("\n");

export function formatMoney(minorUnits: number, currency = "USD"): string {
  // Integer arithmetic to the last step. Dividing by 100 early would introduce
  // exactly the float error the minor-units convention exists to prevent.
  const sign = minorUnits < 0 ? "-" : "";
  const absolute = Math.abs(minorUnits);
  const major = Math.trunc(absolute / 100);
  const minor = String(absolute % 100).padStart(2, "0");
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${sign}${symbol}${major.toLocaleString("en-US")}.${minor}`;
}

function feeColumn(obligation: Obligation): string {
  // A rule with no stated fee shows "—", never "$0.00". Reporting zero would
  // claim the filing is free when what we actually know is that the fee was
  // never recorded.
  return obligation.feeMinorUnits === undefined
    ? "—"
    : formatMoney(obligation.feeMinorUnits, obligation.currency);
}

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

export interface RenderOptions {
  entityName: string;
  asOf: string;
  horizonMonths: number;
}

export function renderResult(
  result: EvaluationResult,
  options: RenderOptions,
): string {
  const lines: string[] = [];
  const { obligations, indeterminate } = result;

  lines.push(
    `${options.entityName} — obligations from ${options.asOf}, next ${options.horizonMonths} months`,
    "",
  );

  if (obligations.length === 0) {
    lines.push("  Nothing due in this window.");
  } else {
    const rows = obligations.map((o) => ({
      due: o.dueOn,
      where: o.jurisdiction,
      what: o.status === "draft" ? `${o.title}  [DRAFT]` : o.title,
      fee: feeColumn(o),
      agency: o.agency,
      citation: o.citation,
    }));

    const w = {
      due: Math.max(3, ...rows.map((r) => r.due.length)),
      where: Math.max(5, ...rows.map((r) => r.where.length)),
      what: Math.max(6, ...rows.map((r) => r.what.length)),
      fee: Math.max(3, ...rows.map((r) => r.fee.length)),
    };

    lines.push(
      `  ${pad("DUE", w.due)}  ${pad("WHERE", w.where)}  ${pad("WHAT", w.what)}  ${pad("FEE", w.fee)}`,
    );
    for (const row of rows) {
      lines.push(
        `  ${pad(row.due, w.due)}  ${pad(row.where, w.where)}  ${pad(row.what, w.what)}  ${pad(row.fee, w.fee)}`,
      );
      lines.push(`  ${" ".repeat(w.due)}  ${row.agency} · ${row.citation}`);
    }
  }

  if (indeterminate.length > 0) {
    // Reported prominently rather than tucked away: an incomplete calendar
    // presented as complete is this product's worst failure, and the user can
    // usually resolve it in seconds by supplying one number.
    lines.push("", "  Cannot tell yet — these depend on facts not supplied:");
    for (const rule of indeterminate) {
      lines.push(
        `    ${rule.jurisdiction}  ${rule.title}  (needs: ${rule.missingFacts.join(", ")})`,
      );
    }
  }

  const drafts = obligations.filter((o) => o.status === "draft").length;
  if (drafts > 0) {
    lines.push(
      "",
      `  ${drafts} line(s) marked [DRAFT] come from rules NOT yet checked against`,
      "  the statute by a human. Treat them as a prompt to verify, not as fact.",
    );
  }

  lines.push("", DISCLAIMER);
  return lines.join("\n");
}
