/**
 * Reference fields from a textarea. Pure, so the parsing is testable.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export interface ParsedField {
  label: string;
  value: string;
}

/**
 * One `Label: value` per line.
 *
 * A textarea rather than a repeating field widget, because the input is copied
 * straight off a letter — "UBI Number: 604 123 456" — and retyping it into
 * separate boxes is the friction that stops people recording it at all.
 *
 * Splits on the FIRST colon only, so a value containing one (a URL, a time)
 * survives intact.
 */
export function parseFields(input: string): ParsedField[] {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      if (colon === -1) return { label: "Note", value: line };
      return {
        label: line.slice(0, colon).trim(),
        value: line.slice(colon + 1).trim(),
      };
    })
    .filter((field) => field.label !== "" && field.value !== "");
}
