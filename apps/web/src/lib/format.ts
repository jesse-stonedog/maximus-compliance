/**
 * Presentation helpers. Pure, so they are testable without rendering.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Obligation } from "@optima/engine";

/**
 * Money, from integer minor units.
 *
 * Integer arithmetic to the last step: dividing by 100 early reintroduces
 * exactly the float error the minor-units convention exists to prevent.
 */
export function formatMoney(minorUnits: number, currency = "USD"): string {
  const sign = minorUnits < 0 ? "-" : "";
  const abs = Math.abs(minorUnits);
  const major = Math.trunc(abs / 100).toLocaleString("en-US");
  const minor = String(abs % 100).padStart(2, "0");
  return `${sign}${currency === "USD" ? "$" : `${currency} `}${major}.${minor}`;
}

/**
 * The fee cell.
 *
 * An em dash, never "$0.00". Reporting zero claims the filing is free; what we
 * actually know is that nobody recorded a fee.
 */
export function formatFee(obligation: Obligation): string {
  return obligation.feeMinorUnits === undefined
    ? "—"
    : formatMoney(obligation.feeMinorUnits, obligation.currency);
}

/** `2026-03-31` → `31 Mar 2026`. Unambiguous across US and non-US readers. */
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysUntil(from: string, to: string): number {
  const parse = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y!, m! - 1, day!);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

export type Urgency = "overdue" | "due-soon" | "upcoming";

/**
 * How loudly to present a deadline.
 *
 * Thresholds are generous on purpose. Most filings take more than a few days to
 * prepare — gathering figures, getting a board signature — so "due soon" at 30
 * days is a useful prompt, while a 3-day warning is just an apology.
 */
export function urgency(asOf: string, dueOn: string): Urgency {
  const days = daysUntil(asOf, dueOn);
  if (days < 0) return "overdue";
  if (days <= 30) return "due-soon";
  return "upcoming";
}

/** Human phrasing for the countdown. */
export function relativeDue(asOf: string, dueOn: string): string {
  const days = daysUntil(asOf, dueOn);
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  if (days < 0) {
    const overdue = Math.abs(days);
    return `${overdue} day${overdue === 1 ? "" : "s"} overdue`;
  }
  if (days < 45) return `in ${days} days`;
  const months = Math.round(days / 30);
  return `in about ${months} month${months === 1 ? "" : "s"}`;
}

/** Entity-type codes to something a person would say. */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  "501c3": "501(c)(3)",
  "nonprofit-corp": "Nonprofit corporation",
  llc: "LLC",
  "s-corp": "S-Corp",
  "c-corp": "C-Corp",
  "b-corp": "B-Corp",
};

export function entityTypeLabel(type: string): string {
  return ENTITY_TYPE_LABELS[type] ?? type;
}

/** `US-WA` → `Washington`; `US` → `Federal`. */
const JURISDICTION_LABELS: Record<string, string> = {
  US: "Federal",
  "US-WA": "Washington",
  "US-OR": "Oregon",
  "US-DE": "Delaware",
};

export function jurisdictionLabel(jurisdiction: string): string {
  return JURISDICTION_LABELS[jurisdiction] ?? jurisdiction;
}
