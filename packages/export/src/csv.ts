/**
 * CSV generation (RFC 4180).
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Obligation } from "@maximus/engine";

const HEADERS = [
  "due_on",
  "jurisdiction",
  "title",
  "agency",
  "form",
  "fee_minor_units",
  "currency",
  "citation",
  "citation_url",
  "status",
  "last_verified",
  "rule_id",
] as const;

/**
 * Quote a field per RFC 4180.
 *
 * Always quoting would be simpler, but the output is read by humans in
 * spreadsheets as often as by programs, and a file where every cell is quoted
 * is markedly harder to scan. Quote only what needs it.
 *
 * A leading `=`, `+`, `-` or `@` is also quoted AND prefixed with a single
 * quote: spreadsheet applications interpret those as the start of a formula,
 * which turns a citation into a broken cell at best and a formula-injection
 * vector at worst. Rule citations legitimately begin with `-` in some
 * jurisdictions, so this is not hypothetical.
 */
function field(value: string | number | undefined): string {
  if (value === undefined) return "";
  let text = String(value);

  const neutralised = /^[=+\-@\t\r]/.test(text);
  if (neutralised) text = `'${text}`;

  // A neutralised field is quoted as well. The apostrophe alone satisfies the
  // spreadsheet, but quoting makes it unambiguous to a human reading the raw
  // file that this is a text literal and the apostrophe was added deliberately
  // — unquoted, it just looks like corrupt data.
  return neutralised || /[",\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

export function toCsv(obligations: readonly Obligation[]): string {
  const rows = [
    HEADERS.join(","),
    ...obligations.map((o) =>
      [
        o.dueOn,
        o.jurisdiction,
        o.title,
        o.agency,
        o.form,
        // Minor units, not dollars. A spreadsheet reading "60.00" may reformat
        // or round it; an integer count of cents survives every round trip, and
        // the header names the unit so nobody misreads 6000 as six thousand
        // dollars.
        o.feeMinorUnits,
        o.currency,
        o.citation,
        o.citationUrl,
        o.status,
        o.lastVerified,
        o.ruleId,
      ]
        .map(field)
        .join(","),
    ),
  ];
  return `${rows.join("\r\n")}\r\n`;
}
