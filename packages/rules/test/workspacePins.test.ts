/**
 * Every consumer in this repo must resolve the WORKSPACE rule pack, never a
 * published copy of it.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * ## The trap this exists for, caught live on 2026-08-05
 *
 * `apps/web` and `apps/cli` pin `@optima-compliance/rules` to an **exact**
 * version. While that version equalled the workspace package's, npm satisfied
 * the pin from `packages/rules` and everything was linked locally. Bumping the
 * rule pack to publish four statutory corrections broke that equality — and npm
 * did not error. It quietly **downloaded the published tarball** into
 * `apps/web/node_modules/@optima-compliance/rules`, where it shadows the
 * workspace symlink.
 *
 * So the dashboard and the CLI would have built against the *uncorrected* rule
 * pack while the repo contained the fix. The observable symptom was a Delaware
 * LLC tax of $300 in the app and $400 in the source, with no build error, no
 * warning, and a green test suite — because the tests import from
 * `packages/rules` directly and never see the shadow.
 *
 * That is the worst shape a defect can take here: the correction is committed,
 * reviewed, and merged, and it does not reach the product.
 *
 * ## Why the pin is not simply removed
 *
 * An exact pin is the right call for a rule pack — a range means two builds of
 * identical code can produce different filing dates. The pin stays; this test
 * is what makes bumping it a two-line change instead of a silent regression.
 *
 * When it fails, the fix is to bump every consumer's pin to match
 * `packages/rules/package.json` in the same commit, then `npm install`.
 */

import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");

const readJson = (...segments: string[]): Record<string, never> =>
  JSON.parse(readFileSync(join(repoRoot, ...segments), "utf8"));

/**
 * Both published packages, not just the rule pack.
 *
 * `engine` was added after NEH-400 moved it to 0.2.0 for a new cadence anchor
 * and hit the identical trap the rule pack had — the guard covered one of the
 * two things that can drift, which is the shape of guard that reassures without
 * protecting.
 */
const PACKAGES = [
  { name: "@optima-compliance/rules", dir: "rules", pattern: /^\d{4}\.\d{1,2}\.\d+$/ },
  { name: "@optima-compliance/engine", dir: "engine", pattern: /^\d+\.\d+\.\d+$/ },
] as const;

/** Every workspace that depends on them. */
const CONSUMERS = ["apps/web", "apps/cli"] as const;

const CASES = PACKAGES.flatMap((pkg) =>
  CONSUMERS.map((dir) => ({ ...pkg, consumer: dir })),
);

describe("consumers pin the rule pack at the workspace version", () => {
  it.each(PACKAGES.map((p) => [p.dir, p] as const))(
    "reads a version for %s to compare against",
    (_label, pkg) => {
      // Guards the guard: a bad path here would make every assertion below
      // compare `undefined` to `undefined` and pass.
      expect(readJson("packages", pkg.dir, "package.json")["version"]).toMatch(
        pkg.pattern,
      );
    },
  );

  it.each(CASES.map((c) => [`${c.consumer} -> ${c.name}`, c] as const))(
    "%s pins the version the workspace actually builds",
    (_label, c) => {
    const packVersion: string = readJson("packages", c.dir, "package.json")["version"];
    const pinned = readJson(...c.consumer.split("/"), "package.json")["dependencies"][
      c.name
    ];

    // Exact, not a range — a caret would let two builds of identical code
    // produce different filing dates, which makes "which version said this was
    // due?" unanswerable from the lockfile.
    expect(pinned).not.toMatch(/^[\^~><=]/);

    // …and exactly the workspace's version, so npm resolves it to
    // `packages/<dir>` rather than fetching the published tarball.
    expect(pinned).toBe(packVersion);
  },
  );

  it("keeps the rule pack's engine pin on the workspace engine", () => {
    // The pack pins the engine EXACTLY, and a pack can require an engine
    // feature — NEH-400's `formation-anniversary` anchor is the first. An old
    // engine hits an unhandled switch case and the Oregon rules produce
    // NOTHING, which is a false negative: a clean calendar hiding three
    // filings. So the two versions move together or not at all.
    const engineVersion = readJson("packages", "engine", "package.json")["version"];
    const pinned = readJson("packages", "rules", "package.json")["dependencies"][
      "@optima-compliance/engine"
    ];
    expect(pinned).toBe(engineVersion);
  });

  it.each(CASES.map((c) => [`${c.consumer} -> ${c.name}`, c] as const))(
    "%s has no shadow copy installed under it",
    (_label, c) => {
    const dir = c.consumer;
    const pkgName = c.name.split("/")[1]!;
    // The direct observation, not an inference from the manifests. npm installs
    // a nested real directory only when the hoisted workspace link cannot
    // satisfy the pin — so its presence IS the bug, whatever the manifests say.
    //
    // Absent `node_modules` (a fresh clone before install) is not a failure:
    // this asserts nothing is shadowed, not that anything is installed.
    const shadow = join(repoRoot, dir, "node_modules", "@optima-compliance", pkgName);
    expect(existsSync(shadow)).toBe(false);
  },
  );
});
