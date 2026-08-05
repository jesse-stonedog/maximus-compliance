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

const packVersion: string = readJson("packages", "rules", "package.json")["version"];

/** Every workspace that depends on the rule pack. */
const CONSUMERS = ["apps/web", "apps/cli"] as const;

describe("consumers pin the rule pack at the workspace version", () => {
  it("reads a version to compare against", () => {
    // Guards the guard: a bad path here would make every assertion below
    // compare `undefined` to `undefined` and pass.
    expect(packVersion).toMatch(/^\d{4}\.\d{1,2}\.\d+$/);
  });

  it.each(CONSUMERS)("%s pins the version the workspace actually builds", (dir) => {
    const pinned = readJson(...dir.split("/"), "package.json")["dependencies"][
      "@optima-compliance/rules"
    ];

    // Exact, not a range — a caret would let two builds of identical code
    // produce different filing dates, which makes "which version said this was
    // due?" unanswerable from the lockfile.
    expect(pinned).not.toMatch(/^[\^~><=]/);

    // …and exactly the workspace's version, so npm resolves it to
    // `packages/rules` rather than fetching the published tarball.
    expect(pinned).toBe(packVersion);
  });

  it.each(CONSUMERS)("%s has no shadow copy installed under it", (dir) => {
    // The direct observation, not an inference from the manifests. npm installs
    // a nested real directory only when the hoisted workspace link cannot
    // satisfy the pin — so its presence IS the bug, whatever the manifests say.
    //
    // Absent `node_modules` (a fresh clone before install) is not a failure:
    // this asserts nothing is shadowed, not that anything is installed.
    const shadow = join(repoRoot, dir, "node_modules", "@optima-compliance", "rules");
    expect(existsSync(shadow)).toBe(false);
  });
});
