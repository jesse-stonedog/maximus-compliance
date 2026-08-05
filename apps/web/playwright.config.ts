/**
 * The E2E harness — NEH-373.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## Why this tier exists
 *
 * The dashboard IS the self-host deliverable. Milestone 1 is literally
 * `docker run` → add an entity → see a correct compliance calendar, and until
 * now **no part of that journey had ever been executed in a browser**. The unit
 * suite covers date arithmetic and parsing thoroughly; it cannot tell you the
 * entity form submits, the obligation table renders, or the disclaimer is
 * actually visible next to a deadline.
 *
 * **jsdom has no layout engine**, so every element reports a zero-sized box and
 * a test there will happily agree that a panel fits a viewport it overflows.
 * Anything about pixels, overflow, focus order or tap targets is structurally
 * unanswerable at the tier this repo had. NEH-275 — a WCAG contrast failure
 * caught only because someone wrote a bespoke contrast test against theme
 * tokens — was a unit test standing in for this one.
 *
 * ## This one runs the PRODUCTION build
 *
 * Unlike the hosted tier's harness (NEH-368), which is pinned to `next dev`
 * because the emailed verification link is deliberately not printed in
 * production. There is no email here at all, so `next build` + `next start` is
 * available — and it is what the suite uses, so what runs under test is the
 * artefact rather than a dev server that resembles it.
 *
 * ## Drafts are switched ON, on purpose
 *
 * The entire seed rule set is `status: "draft"` and `evaluate()` excludes
 * drafts by default, so a stock launch shows an empty calendar. That is the
 * honest default and NOT something to change — but it means the suite must opt
 * in, or "obligations render" is untestable. Opting in also makes the draft
 * banner and the per-row "unverified" badge assertable, and those honesty
 * features had never been seen in a browser either.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * A throwaway database per run, created at config load so the server can be
 * told where it is.
 *
 * Never the default `/data/optima.sqlite`: that is the path a self-hoster's
 * volume is mounted at, and a suite that writes entities into somebody's real
 * database is a suite that gets run exactly once. A fresh file also means every
 * run starts from a known-empty state, so "no entities yet" is a fact rather
 * than a hope.
 */
const dataDir = mkdtempSync(join(tmpdir(), "optima-e2e-"));
const DB_PATH = join(dataDir, "optima.sqlite");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts/test-results",

  // Serial, sharing one database. Parallel workers would race on the entity
  // list, and that flake reads as a product bug rather than a harness one.
  workers: 1,
  fullyParallel: false,

  // No retries: on a suite this size a retry hides the intermittent failure
  // worth knowing about, and "it passed the second time" is how a real race
  // gets closed as flaky.
  retries: 0,

  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      // The viewport question jsdom cannot answer. A self-hoster checking a
      // deadline on their phone is the common case, and 375px is the narrow
      // end of what real people carry.
      //
      // Chromium is forced. `devices["iPhone SE"]` sets `defaultBrowserType:
      // "webkit"`, which is more faithful to a real iPhone and costs a second
      // browser download in every CI run and on every contributor's machine —
      // for assertions that are about LAYOUT AT 375px, where the engines agree.
      // The trade is deliberate; revisit it if a Safari-specific defect ever
      // gets through.
      name: "mobile",
      use: { ...devices["iPhone SE"], browserName: "chromium" },
    },
  ],

  webServer: {
    // `build` then `start`, not `dev`. Slower to boot and worth it: this is the
    // only tier that can tell you the thing users actually run works, and a dev
    // server differs from it in exactly the ways that bite — compilation,
    // minification, and server/client component boundaries.
    command: `npm run build --workspace=@optima/web && npm run start --workspace=@optima/web -- --port ${PORT}`,
    url: BASE_URL,
    // Never reuse: a server already running has unknown configuration, quite
    // possibly pointed at a real database.
    reuseExistingServer: false,
    // Generous — a cold Next build with Panda codegen is minutes, not seconds.
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      OPTIMA_DB_PATH: DB_PATH,
      // See the header: without this the seed set is invisible and there is
      // nothing to assert.
      OPTIMA_INCLUDE_DRAFT: "true",
    },
  },
});
