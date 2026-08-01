/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { parseFields } from "../src/lib/parse-fields.js";

describe("parseFields", () => {
  it("reads one Label: value per line", () => {
    expect(parseFields("UBI Number: 604123456\nEIN: 91-1234567")).toEqual([
      { label: "UBI Number", value: "604123456" },
      { label: "EIN", value: "91-1234567" },
    ]);
  });

  it("splits on the FIRST colon only", () => {
    // A value can legitimately contain one — a URL, a time. Splitting on every
    // colon would truncate exactly the values people paste from a letter.
    expect(parseFields("Portal: https://sos.wa.gov/corps")).toEqual([
      { label: "Portal", value: "https://sos.wa.gov/corps" },
    ]);
  });

  it("keeps a value's internal spacing as written", () => {
    // "604 123 456" is how it appears on the letter, and how the user will
    // recognise it. Normalising it would make it harder to match by eye.
    expect(parseFields("UBI Number: 604 123 456")[0]!.value).toBe("604 123 456");
  });

  it("ignores blank lines and trims", () => {
    expect(parseFields("\n  UBI: 123  \n\n")).toEqual([{ label: "UBI", value: "123" }]);
  });

  it("keeps a line with no colon as an unlabelled note", () => {
    // Better than discarding it. Someone pasting a bare number still gets it
    // stored and searchable, which is the point.
    expect(parseFields("604123456")).toEqual([{ label: "Note", value: "604123456" }]);
  });

  it("drops a line with a label but no value", () => {
    expect(parseFields("UBI Number:")).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(parseFields("")).toEqual([]);
    expect(parseFields("   \n  ")).toEqual([]);
  });
});
