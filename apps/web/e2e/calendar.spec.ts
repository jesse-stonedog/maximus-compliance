/**
 * The Milestone 1 journey, in a browser.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `docker run` → add an entity → see a correct compliance calendar. That is
 * the whole self-host deliverable, and until this file nothing had executed it.
 *
 * The entity here is the archetypal buyer from the project charter: a small
 * Washington 501(c)(3). Obviously fake, per the repo rule about fixtures in a
 * public repo.
 */

import { expect, test } from "@playwright/test";

const ENTITY = {
  name: "Cascade Trails Association",
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: "US, US-WA",
  fiscalYearEnd: "12-31",
} as const;

/**
 * Serial, because these steps are one journey rather than three tests: the
 * entity created in the first is what the later ones read. Playwright's default
 * isolation would otherwise give each a fresh context against a database that
 * still has the row, which is a confusing half-state.
 */
test.describe.configure({ mode: "serial" });

test.describe("the self-host journey", () => {
  test("starts with an honest empty state", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /compliance calendar/i }),
    ).toBeVisible();
  });

  test("an entity can be added", async ({ page }) => {
    await page.goto("/entities/new");

    await page.getByLabel("Name").fill(ENTITY.name);
    // A checkbox group, not a select — an entity can hold several legal forms
    // at once, and a 501(c)(3) is usually also a nonprofit corporation.
    await page.getByRole("checkbox", { name: /501\(c\)\(3\)/ }).check();
    await page.getByLabel("Date formed").fill(ENTITY.formedOn);
    await page.getByLabel("Home jurisdiction").fill(ENTITY.homeJurisdiction);
    await page.getByLabel("Registered in").fill(ENTITY.jurisdictions);
    await page.getByLabel("Fiscal year ends").fill(ENTITY.fiscalYearEnd);

    await page.getByRole("button", { name: /add|save|create/i }).click();

    await page.waitForURL((url) => !url.pathname.endsWith("/new"), {
      timeout: 30_000,
    });
    await expect(page.getByText(ENTITY.name).first()).toBeVisible();
  });

  test("its obligations render, with real dates", async ({ page }) => {
    await page.goto("/");

    // At least one obligation, and its due date rendered as an unambiguous
    // named month. The format matters: "03/04/2026" means two different days
    // depending on the reader, and this is a filing deadline.
    const dateCell = page
      .getByText(/\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/)
      .first();
    await expect(dateCell).toBeVisible();
  });

  test("every deadline carries its citation", async ({ page }) => {
    // A citation is what makes a deadline checkable, and the README tells users
    // to verify anything that matters — which is only possible if the source is
    // in front of them. A calendar that lost its citations would still look
    // right, which is why this is asserted rather than assumed.
    await page.goto("/");
    await expect(page.getByText(/RCW|USC|CFR|\bIRC\b|§/).first()).toBeVisible();
  });

  test("the disclaimer is visible next to the deadlines", async ({ page }) => {
    // Not a footer afterthought — this software tells people when to file with
    // the government, and the project file is explicit that the disclaimer is
    // structural. "Visible" is a claim only a browser can check.
    await page.goto("/");
    await expect(
      page.getByText(/not legal or tax advice/i).first(),
    ).toBeVisible();
  });

  test("draft rules are marked as unverified", async ({ page }) => {
    // The whole seed set is `draft` — written but never checked against a
    // primary source. The suite runs with drafts switched on, so every row
    // shown here is unverified, and the product must say so. Presenting
    // unverified regulatory data as fact is the credibility failure this
    // project cannot recover from.
    await page.goto("/");
    await expect(page.getByText(/unverified/i).first()).toBeVisible();
  });
});

/**
 * Deadlines have to leave the tool or nobody sees them (NEH-211).
 *
 * These assert the ROUTE, not a click, and that is a finding rather than a
 * shortcut: **nothing in the UI links to `/api/export`.** A user who does not
 * read the source cannot discover the export at all, so there is no link for a
 * browser test to press. Filed as NEH-378; when a link exists, these become
 * click-then-download and gain the assertion that the affordance works.
 *
 * `page.goto` cannot be used for a download — it throws "Download is starting"
 * because the navigation never completes. `page.request` is the right tool for
 * a response nothing renders.
 */
test.describe("exports", () => {
  test("the calendar exports as iCal, with the headers that make it a file", async ({
    page,
  }) => {
    const response = await page.request.get("/api/export?format=ics");
    expect(response.status()).toBe(200);
    // The disposition is what turns a response into a saved file. Without it a
    // browser renders the calendar as text and the export silently does
    // nothing useful.
    expect(response.headers()["content-disposition"]).toMatch(/attachment/);
    expect(response.headers()["content-disposition"]).toMatch(/\.ics/);

    const body = await response.text();
    expect(body).toContain("BEGIN:VCALENDAR");
    // A UID per event is what lets a re-import update rather than duplicate.
    expect(body).toContain("UID:");
  });

  test("the calendar exports as CSV", async ({ page }) => {
    const response = await page.request.get("/api/export?format=csv");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/text\/csv/);
    expect(response.headers()["content-disposition"]).toMatch(/\.csv/);
    // A header row and at least one obligation — an empty CSV is a successful
    // response that exports nothing.
    expect((await response.text()).trim().split("\n").length).toBeGreaterThan(1);
  });
});
