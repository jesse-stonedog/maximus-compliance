/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Obligation } from "@optima/engine";
import { foldLine, obligationUid, toICalendar } from "../src/ical.js";
import { toCsv } from "../src/csv.js";

const DTSTAMP = "20260801T000000Z";

const obligation: Obligation = {
  ruleId: "us-wa-sos-nonprofit-annual-report",
  title: "Nonprofit Corporation Annual Report",
  agency: "Washington Secretary of State",
  jurisdiction: "US-WA",
  dueOn: "2026-03-31",
  feeMinorUnits: 6000,
  currency: "USD",
  citation: "RCW 24.03A.1010",
  status: "active",
  lastVerified: "2026-08-01",
};

const draft: Obligation = {
  ...obligation,
  ruleId: "us-wa-charitable-solicitation-registration",
  title: "Charitable Organization Registration Renewal",
  citation: "RCW 19.09.075; RCW 19.09.097",
  status: "draft",
  dueOn: "2026-11-30",
};

const ics = (obligations: Obligation[], options = {}) =>
  toICalendar(obligations, { dtstamp: DTSTAMP, ...options });

/**
 * Undo RFC 5545 line folding.
 *
 * Content assertions must run against the unfolded text: a citation can be
 * split across a fold boundary, so searching the raw output for it fails even
 * when the escaping is perfectly correct. Asserting on raw output is how a test
 * ends up encoding the current line lengths rather than the behaviour.
 */
const unfold = (output: string) => output.replaceAll("\r\n ", "");

describe("toICalendar", () => {
  it("emits a well-formed calendar wrapper", () => {
    const output = ics([obligation]);
    expect(output.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(output.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(output).toContain("VERSION:2.0");
  });

  it("uses CRLF everywhere, never a bare LF", () => {
    // RFC 5545 §3.1. Some clients reject LF-only files outright; the ones that
    // accept them do so as a kindness.
    const output = ics([obligation, draft]);
    expect(output.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("is clock-free — identical inputs give byte-identical output", () => {
    // The reason dtstamp is a parameter. A clock here would make every export
    // differ from the last, so the file could not be diffed, cached, or
    // asserted on.
    expect(ics([obligation])).toBe(ics([obligation]));
  });

  it("writes deadlines as all-day events", () => {
    // A filing deadline is a civil date in the filing jurisdiction, not an
    // instant. A timed event lands on the wrong day for anyone whose calendar
    // is in another timezone.
    const output = ics([obligation]);
    expect(output).toContain("DTSTART;VALUE=DATE:20260331");
  });

  it("ends the event on the following day, because DTEND is exclusive", () => {
    // DTEND equal to DTSTART is a zero-length event, which several clients
    // silently refuse to display.
    expect(ics([obligation])).toContain("DTEND;VALUE=DATE:20260401");
  });

  it("rolls DTEND over a month boundary correctly", () => {
    expect(ics([draft])).toContain("DTEND;VALUE=DATE:20261201");
  });

  it("rolls DTEND over a leap day correctly", () => {
    const leap = { ...obligation, dueOn: "2024-02-29" };
    expect(ics([leap])).toContain("DTEND;VALUE=DATE:20240301");
  });
});

describe("UID stability", () => {
  it("keys on the rule and the occurrence, so recurrences are separate events", () => {
    expect(obligationUid(obligation)).toBe(
      "us-wa-sos-nonprofit-annual-report-2026-03-31@optimafilings.com",
    );
    expect(obligationUid({ ...obligation, dueOn: "2027-03-31" })).not.toBe(
      obligationUid(obligation),
    );
  });

  it("does NOT change when the rule's title, fee or status change", () => {
    // The property that makes re-import an update rather than a duplication.
    // Rules get corrected — that is the whole point of the project — and a UID
    // derived from mutable fields would duplicate the user's entire calendar
    // every time one did.
    const corrected: Obligation = {
      ...obligation,
      title: "Nonprofit Corporation Annual Report (renamed)",
      feeMinorUnits: 7500,
      status: "draft",
      lastVerified: "2027-01-01",
      citation: "RCW 24.03A.1010 (2027 amendment)",
    };
    expect(obligationUid(corrected)).toBe(obligationUid(obligation));
  });
});

describe("TEXT escaping", () => {
  it("escapes the semicolons and commas that appear in real citations", () => {
    // "RCW 19.09.075; RCW 19.09.097" — both characters are structural in
    // iCalendar, so this is load-bearing rather than defensive.
    expect(unfold(ics([draft]))).toContain("RCW 19.09.075\\; RCW 19.09.097");
  });

  it("escapes backslashes before anything else", () => {
    expect(unfold(ics([{ ...obligation, title: "A\\B" }]))).toContain("A\\\\B");
  });

  it("escapes newlines rather than breaking the content line", () => {
    const output = unfold(ics([{ ...obligation, title: "Line one\nLine two" }]));
    expect(output).toContain("Line one\\nLine two");
    expect(output).not.toContain("Line one\r\nLine two");
  });
});

describe("foldLine", () => {
  it("leaves a short line alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds at 75 octets with CRLF and a leading space", () => {
    const folded = foldLine(`SUMMARY:${"x".repeat(200)}`);
    expect(folded).toContain("\r\n ");
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("counts octets, not characters", () => {
    // Rule titles carry em dashes — 3 octets each in UTF-8. Folding on
    // character count emits lines that are legal by that measure and too long
    // by the real one.
    const folded = foldLine(`SUMMARY:${"—".repeat(40)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("never splits a multi-byte character", () => {
    // A split mid-sequence produces mojibake in the importing client.
    const folded = foldLine(`SUMMARY:${"é".repeat(80)}`);
    expect(folded.replaceAll("\r\n ", "")).toBe(`SUMMARY:${"é".repeat(80)}`);
  });
});

describe("draft obligations carry their caveat into the calendar", () => {
  it("marks the summary", () => {
    expect(unfold(ics([draft]))).toContain("[unverified]");
  });

  it("explains it in the description", () => {
    // Someone reading this event in six months on their phone has no other way
    // to know the date was never checked against a statute.
    expect(unfold(ics([draft]))).toContain("UNVERIFIED");
  });

  it("says so on every event, and the disclaimer too", () => {
    expect(unfold(ics([obligation]))).toContain("Not legal or tax advice.");
  });

  it("does not mark a verified obligation", () => {
    expect(unfold(ics([obligation]))).not.toContain("[unverified]");
  });
});

describe("alarms", () => {
  it("are absent unless asked for", () => {
    expect(ics([obligation])).not.toContain("BEGIN:VALARM");
  });

  it("emit one VALARM per requested lead time", () => {
    const output = ics([obligation], { reminderDaysBefore: [30, 7] });
    expect(output).toContain("TRIGGER:-P30D");
    expect(output).toContain("TRIGGER:-P7D");
    expect(output.match(/BEGIN:VALARM/g)).toHaveLength(2);
  });
});

describe("toCsv", () => {
  it("writes a header row", () => {
    expect(toCsv([]).split("\r\n")[0]).toContain("due_on,jurisdiction,title");
  });

  it("names the fee unit in the header so nobody misreads 6000", () => {
    const output = toCsv([obligation]);
    expect(output).toContain("fee_minor_units");
    expect(output).toContain("6000");
  });

  it("quotes a field containing a comma", () => {
    const output = toCsv([
      { ...obligation, agency: "Secretary of State, Charities Program" },
    ]);
    expect(output).toContain('"Secretary of State, Charities Program"');
  });

  it("doubles an embedded quote", () => {
    const output = toCsv([{ ...obligation, title: 'The "Annual" Report' }]);
    expect(output).toContain('"The ""Annual"" Report"');
  });

  it("does not quote a field that does not need it", () => {
    // The output is read by humans in spreadsheets as often as by programs, and
    // a file where every cell is quoted is much harder to scan.
    expect(toCsv([obligation])).toContain(",US-WA,");
  });

  it("neutralises a leading character a spreadsheet would treat as a formula", () => {
    // Not hypothetical: citations legitimately begin with a hyphen in some
    // jurisdictions, and a spreadsheet reads that as the start of an expression.
    const output = toCsv([{ ...obligation, citation: "=SUM(A1:A9)" }]);
    expect(output).toContain(`"'=SUM(A1:A9)"`);
  });

  it("leaves an absent fee empty rather than writing 0", () => {
    // Zero would claim the filing is free; empty says nobody recorded a fee.
    const noFee = { ...obligation };
    delete noFee.feeMinorUnits;
    const dataRow = toCsv([noFee]).split("\r\n")[1]!;
    expect(dataRow).toContain(",,");
    expect(dataRow).not.toContain(",0,");
  });
});
