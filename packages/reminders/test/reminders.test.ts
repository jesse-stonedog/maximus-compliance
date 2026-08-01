/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  bucket,
  hasContent,
  narrowestWindow,
  windowEnd,
  WINDOWS,
  type DatedItem,
} from "../src/index.js";

const ASOF = "2026-08-01";

const item = (over: Partial<DatedItem> & { id: string; dueOn: string }): DatedItem => ({
  title: `Item ${over.id}`,
  source: "user",
  ...over,
});

describe("windowEnd", () => {
  it.each([
    ["day-before", "2026-08-02"],
    ["weekly", "2026-08-08"],
    ["monthly", "2026-08-31"],
    ["quarterly", "2026-11-01"],
  ] as const)("%s ends %s", (window, expected) => {
    expect(windowEnd(ASOF, window)).toBe(expected);
  });

  it("keeps the windows ordered", () => {
    const ends = WINDOWS.map((w) => windowEnd(ASOF, w));
    expect([...ends].sort()).toEqual(ends);
  });
});

describe("bucket", () => {
  const items = [
    item({ id: "overdue", dueOn: "2026-07-20" }),
    item({ id: "today", dueOn: "2026-08-01" }),
    item({ id: "tomorrow", dueOn: "2026-08-02" }),
    item({ id: "week", dueOn: "2026-08-07" }),
    item({ id: "month", dueOn: "2026-08-25" }),
    item({ id: "quarter", dueOn: "2026-10-15" }),
    item({ id: "later", dueOn: "2027-03-31" }),
  ];

  it("separates overdue from everything else", () => {
    // An overdue filing is the one thing this product exists to prevent.
    // Folding it into "this week" buries the only item already late.
    const { overdue } = bucket(items, ASOF);
    expect(overdue.map((i) => i.id)).toEqual(["overdue"]);
  });

  it("treats something due today as upcoming, not overdue", () => {
    // It is still filable today. Calling it overdue would be wrong and
    // needlessly alarming.
    const { overdue, windows } = bucket(items, ASOF);
    expect(overdue.map((i) => i.id)).not.toContain("today");
    expect(windows["day-before"].map((i) => i.id)).toContain("today");
  });

  it("nests windows rather than partitioning them", () => {
    // Each digest is a standalone message answering "what is coming in this
    // period". A monthly digest that omitted next week because the weekly one
    // covered it would be actively misleading.
    const { windows } = bucket(items, ASOF);
    expect(windows["day-before"].map((i) => i.id)).toEqual(["today", "tomorrow"]);
    expect(windows.weekly.map((i) => i.id)).toEqual(["today", "tomorrow", "week"]);
    expect(windows.monthly.map((i) => i.id)).toEqual([
      "today",
      "tomorrow",
      "week",
      "month",
    ]);
    expect(windows.quarterly.map((i) => i.id)).toEqual([
      "today",
      "tomorrow",
      "week",
      "month",
      "quarter",
    ]);
  });

  it("puts anything past the quarter in later, and in no window", () => {
    const { later, windows } = bucket(items, ASOF);
    expect(later.map((i) => i.id)).toEqual(["later"]);
    for (const w of WINDOWS) {
      expect(windows[w].map((i) => i.id)).not.toContain("later");
    }
  });

  it("sorts by due date, then title, for a stable order", () => {
    const same = [
      item({ id: "b", dueOn: "2026-08-10", title: "Beta" }),
      item({ id: "a", dueOn: "2026-08-10", title: "Alpha" }),
    ];
    expect(bucket(same, ASOF).windows.monthly.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("keeps completed items out of every other bucket", () => {
    const done = [
      item({ id: "done", dueOn: "2026-07-01", completedOn: "2026-06-30" }),
      item({ id: "open", dueOn: "2026-07-01" }),
    ];
    const result = bucket(done, ASOF);
    expect(result.completed.map((i) => i.id)).toEqual(["done"]);
    // A completed item that is past its date must NOT read as overdue — that is
    // the whole reason someone ticks it off.
    expect(result.overdue.map((i) => i.id)).toEqual(["open"]);
  });

  it("buckets user items and rule items alike", () => {
    // A user who does not trust the rule packs still needs their own dates to
    // arrive on time, so source must not affect placement.
    const mixed = [
      item({ id: "u", dueOn: "2026-08-05", source: "user" }),
      item({ id: "r", dueOn: "2026-08-05", source: "rule", citation: "RCW 1.2.3" }),
    ];
    expect(bucket(mixed, ASOF).windows.weekly).toHaveLength(2);
  });

  it("does not mutate its input", () => {
    const original = [...items];
    bucket(items, ASOF);
    expect(items).toEqual(original);
  });
});

describe("narrowestWindow", () => {
  it.each([
    ["2026-08-02", "day-before"],
    ["2026-08-07", "weekly"],
    ["2026-08-25", "monthly"],
    ["2026-10-15", "quarterly"],
  ] as const)("puts %s in %s", (dueOn, expected) => {
    expect(narrowestWindow(item({ id: "x", dueOn }), ASOF)).toBe(expected);
  });

  it("returns undefined for overdue and for far-future items", () => {
    expect(narrowestWindow(item({ id: "x", dueOn: "2026-07-01" }), ASOF)).toBeUndefined();
    expect(narrowestWindow(item({ id: "x", dueOn: "2028-01-01" }), ASOF)).toBeUndefined();
  });
});

describe("hasContent", () => {
  it("is false when a window is empty and nothing is overdue", () => {
    // An empty recurring digest trains people to ignore the message, and then
    // the one that matters is ignored too.
    const empty = bucket([item({ id: "far", dueOn: "2027-01-01" })], ASOF);
    expect(hasContent(empty, "weekly")).toBe(false);
  });

  it("is true when something is overdue even if the window is empty", () => {
    const late = bucket([item({ id: "late", dueOn: "2026-01-01" })], ASOF);
    expect(hasContent(late, "weekly")).toBe(true);
  });

  it("is true when the window has items", () => {
    const soon = bucket([item({ id: "soon", dueOn: "2026-08-03" })], ASOF);
    expect(hasContent(soon, "weekly")).toBe(true);
  });
});

describe("a calendar with nothing outstanding", () => {
  it("still reports its completed items", () => {
    // The UI must be able to distinguish "you have nothing to do" from "you
    // have nothing at all". Ticking off your only action and watching it vanish
    // reads as deletion, not completion.
    const done = bucket(
      [item({ id: "a", dueOn: "2026-08-20", completedOn: "2026-08-01" })],
      ASOF,
    );
    expect(done.overdue).toHaveLength(0);
    expect(done.windows.monthly).toHaveLength(0);
    expect(done.later).toHaveLength(0);
    expect(done.completed).toHaveLength(1);
  });
});
