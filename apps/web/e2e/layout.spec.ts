/**
 * The questions jsdom structurally cannot answer.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * jsdom reports every element as a zero-sized box, so a test there will agree
 * that a 400px table fits a 375px screen, that nothing overflows, and that a
 * tap target is any size you like. These run at real viewports in a real
 * engine, which is the only place those claims mean anything.
 *
 * Both projects in the config run this file — `desktop` and a 375px `mobile` —
 * so the same assertions are made at both widths rather than at whichever one
 * happened to be convenient.
 */

import { expect, test } from "@playwright/test";

/**
 * A horizontal scrollbar on the document is the classic small-screen defect:
 * one wide table or one un-wrapped string, and the whole page slides sideways.
 * It is invisible in a unit test and immediately obvious to a person.
 *
 * The obligation table is *allowed* to scroll — it has `overflowX: auto` for
 * exactly that reason — but the page body is not.
 */
async function expectNoHorizontalPageScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    // A pixel of tolerance: sub-pixel layout rounding is not a defect, and an
    // exact comparison would make this fail on nothing.
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

for (const path of ["/", "/entities/new", "/documents", "/documents/new"]) {
  test(`${path} does not scroll sideways`, async ({ page }) => {
    await page.goto(path);
    await expectNoHorizontalPageScroll(page);
  });
}

test("the primary heading is visible without scrolling", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeInViewport();
});

test("the first tab reaches an interactive control", async ({ page }) => {
  // The weaker claim, which does hold: focus goes somewhere real rather than
  // being lost. Focus order is unobservable in jsdom, so even this had never
  // been checked.
  await page.goto("/");
  await page.keyboard.press("Tab");
  const tag = await page.evaluate(() => document.activeElement?.tagName ?? "");
  expect(["A", "BUTTON", "INPUT", "SELECT"]).toContain(tag);
});

test.fixme(
  "a skip link is the first thing keyboard focus reaches",
  async ({ page }) => {
    // FAILS TODAY, and the failure is the point — this is NEH-379.
    //
    // The self-host app has no skip link at all. The hosted app does
    // (`apps/web/src/app/layout.tsx`, "Skip to content"), so the two products
    // differ on a WCAG 2.4.1 basic. A keyboard user here tabs through the whole
    // navigation on every page load to reach the calendar.
    //
    // `fixme` rather than deletion: the assertion is correct and should start
    // passing the moment the link lands, and a deleted test is one nobody
    // re-adds. It shows in the report as expected-to-fail rather than silently
    // green.
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return { tag: el?.tagName ?? "", text: el?.textContent?.trim() ?? "" };
    });
    expect(focused.tag).toBe("A");
    expect(focused.text).toMatch(/skip/i);
  },
);

test("the entity form can be completed with the keyboard alone", async ({
  page,
}) => {
  // Not a mouse click anywhere. A form that only works with a pointer is one a
  // screen-reader user cannot file with, and this product's whole job is
  // helping people meet deadlines.
  await page.goto("/entities/new");
  const name = page.getByLabel("Name");
  await name.focus();
  await page.keyboard.type("Keyboard Only Association");
  await expect(name).toHaveValue("Keyboard Only Association");
});

test.fixme("interactive controls are large enough to tap", async ({ page }) => {
  // FAILS TODAY at 21px against a 24px floor — this is NEH-380.
  //
  // WCAG 2.2 Target Size (Minimum), 2.5.8, is 24×24 CSS pixels. Measured, not
  // assumed: this is precisely the assertion a zero-sized jsdom box passes
  // while the real control is too small, which is why it went unnoticed.
  //
  // Three pixels is not a rounding error on a phone. It is also a shared
  // design-system question rather than a page one — the button comes from
  // `stonedog-style`, so the fix belongs upstream and affects HopperGuard too,
  // which is exactly why this is filed rather than patched here.
  await page.goto("/entities/new");
  const submit = page.getByRole("button", { name: /add|save|create/i }).first();
  const box = await submit.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(24);
  expect(box!.width).toBeGreaterThanOrEqual(24);
});
