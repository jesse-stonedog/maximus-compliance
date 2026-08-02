/**
 * iCalendar (RFC 5545) generation.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Pure and clock-free, for the same reasons the engine is. `dtstamp` is
 * supplied by the caller rather than read from the clock: otherwise the same
 * calendar serialises differently every second, which makes the output
 * impossible to diff, cache, or assert on in a test.
 */

import type { Obligation } from "@maximus/engine";

/**
 * The UID domain.
 *
 * Part of the UID, so it must stay stable forever — changing it makes every
 * previously exported event look like a different event, and a re-import then
 * duplicates the user's entire calendar instead of updating it.
 */
const UID_DOMAIN = "optimafilings.com";

export interface ICalendarOptions {
  /**
   * `DTSTAMP` for every event, as `YYYYMMDDTHHMMSSZ`.
   *
   * Required, with no default. See the module note: a clock here would make
   * every export differ from the last one.
   */
  dtstamp: string;
  /** Calendar name shown by clients that support it. */
  calendarName?: string;
  /**
   * Days before the due date to fire an alarm. Omit for no alarms.
   *
   * A filing deadline you learn about on the day is nearly useless — most
   * filings take longer than that to prepare — so a caller that wants
   * reminders should ask for real notice, not one day.
   */
  reminderDaysBefore?: readonly number[];
}

/**
 * A stable, unique UID for one obligation occurrence.
 *
 * Keyed on rule id **and** due date, because a rule recurs: each occurrence is
 * its own event. Deliberately NOT derived from the title or the fee — those
 * change when a rule is corrected, and a UID that changed with them would
 * duplicate the event rather than update it, which is exactly the failure a
 * user notices and never forgives.
 */
export function obligationUid(obligation: Obligation): string {
  return `${obligation.ruleId}-${obligation.dueOn}@${UID_DOMAIN}`;
}

/** `YYYY-MM-DD` → `YYYYMMDD`, the iCalendar DATE form. */
function toIcalDate(date: string): string {
  return date.replaceAll("-", "");
}

/**
 * Escape a TEXT value per RFC 5545 §3.3.11.
 *
 * Backslash first, or the escapes we add would themselves be escaped. Commas
 * and semicolons are structural in iCalendar and appear in almost every
 * citation we emit ("RCW 19.09.075; RCW 19.09.097"), so this is load-bearing
 * rather than defensive.
 */
function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll(/\r?\n/g, "\\n");
}

/**
 * Fold a content line to 75 octets, per RFC 5545 §3.1.
 *
 * Counted in **octets, not characters**: the limit is on bytes, and our output
 * contains em dashes and other multi-byte characters in rule titles. Folding on
 * character count would emit lines that are legal by that measure and too long
 * by the real one — and would also risk splitting a character mid-sequence,
 * producing mojibake in the importing client.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  // First line takes 75 octets; continuation lines begin with a space that
  // counts toward their own 75.
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += size;
  }
  if (current) parts.push(current);

  return parts.join("\r\n ");
}

function describe(obligation: Obligation): string {
  const lines = [
    `${obligation.agency}`,
    obligation.form ? `Form: ${obligation.form}` : undefined,
    obligation.feeMinorUnits !== undefined
      ? `Fee: $${(obligation.feeMinorUnits / 100).toFixed(2)}`
      : undefined,
    `Source: ${obligation.citation}`,
    obligation.citationUrl,
    `Last verified: ${obligation.lastVerified}`,
    // The caveat travels with the deadline. Someone reading this event six
    // months from now in their phone calendar has no other way to know the
    // date was never checked against a statute.
    obligation.status === "draft"
      ? "UNVERIFIED: this rule has not been checked against its statute by a person. Confirm before relying on it."
      : undefined,
    "",
    "Not legal or tax advice.",
  ];
  return lines.filter((line) => line !== undefined).join("\n");
}

function alarms(daysBefore: readonly number[]): string[] {
  return daysBefore.flatMap((days) => [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `TRIGGER:-P${days}D`,
    `DESCRIPTION:${escapeText(`Due in ${days} day${days === 1 ? "" : "s"}`)}`,
    "END:VALARM",
  ]);
}

export function toICalendar(
  obligations: readonly Obligation[],
  options: ICalendarOptions,
): string {
  const { dtstamp, calendarName = "Compliance", reminderDaysBefore } = options;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StoneDogCode LLC//Optima Filings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const obligation of obligations) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${obligationUid(obligation)}`,
      `DTSTAMP:${dtstamp}`,
      // All-day, because a filing deadline is a civil date in the filing
      // jurisdiction rather than an instant. A timed event would land on the
      // wrong day for anyone whose calendar is in another timezone.
      `DTSTART;VALUE=DATE:${toIcalDate(obligation.dueOn)}`,
      // DTEND is exclusive in iCalendar, so a one-day event ends the next day.
      // Setting it equal to DTSTART produces a zero-length event that several
      // clients silently refuse to display.
      `DTEND;VALUE=DATE:${toIcalDate(nextDay(obligation.dueOn))}`,
      `SUMMARY:${escapeText(summarise(obligation))}`,
      `DESCRIPTION:${escapeText(describe(obligation))}`,
      "TRANSP:TRANSPARENT",
      ...(reminderDaysBefore ? alarms(reminderDaysBefore) : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  // CRLF throughout, per RFC 5545 §3.1. Some clients reject LF-only files
  // outright, and the ones that accept them do so as a kindness.
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

function summarise(obligation: Obligation): string {
  const marker = obligation.status === "draft" ? " [unverified]" : "";
  return `${obligation.jurisdiction}: ${obligation.title}${marker}`;
}

/**
 * The day after a `YYYY-MM-DD` date.
 *
 * Duplicated rather than imported from the engine's calendar module: that one
 * is internal, and this package holds a single small need. If a third caller
 * appears, promote the engine's version to its public API instead of copying
 * it again.
 */
function nextDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + 1));
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  return `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}
