/**
 * Sibling npm scripts are namespaced with `:`, not `-`.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The repo already has `rules:barrel`, `rules:validate`, `rules:staleness`,
 * `test:e2e`. Two scripts shipped as `publish-engine` / `publish-rules` and read
 * as a different family of thing, when they are the same shape as the rest:
 * one namespace, two actions.
 *
 * ## Why the rule is "shared prefix", not "no hyphens"
 *
 * `type-check` is a single hyphenated action with no siblings, and it is right
 * as it is — a blanket hyphen ban would force `type:check`, which namespaces
 * nothing. The distinction that actually matters is whether a script has
 * *siblings*: `publish-engine` and `publish-rules` are two members of a
 * `publish` family, and a family is what `:` is for.
 *
 * So this fails only when two or more scripts share a prefix joined by `-`,
 * which is exactly the case that should have been a namespace and is exactly
 * the mistake that was made.
 *
 * Cheap to run, and it fires at the moment someone adds the third one.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");

const scripts: Record<string, string> = JSON.parse(
  readFileSync(resolve(repoRoot, "package.json"), "utf8"),
).scripts;

/** `//`-prefixed keys are documentation, not runnable scripts. */
const names = Object.keys(scripts).filter((name) => !name.startsWith("//"));

describe("npm script naming", () => {
  it("found scripts to check", () => {
    // Without this, a shape change in package.json would empty the list and
    // every assertion below would pass against nothing.
    expect(names.length).toBeGreaterThan(5);
  });

  it("uses : for a namespace, so no hyphenated family exists", () => {
    // Group by the segment before the first hyphen. A group with more than one
    // member is a namespace spelled the wrong way.
    const families = new Map<string, string[]>();
    for (const name of names) {
      const hyphen = name.indexOf("-");
      if (hyphen === -1) continue;
      const prefix = name.slice(0, hyphen);
      families.set(prefix, [...(families.get(prefix) ?? []), name]);
    }

    const wrong = [...families.entries()].filter(([, members]) => members.length > 1);

    expect(wrong).toEqual([]);
  });

  it("keeps the publish scripts namespaced", () => {
    // The specific pair this test was written for. Named explicitly as well as
    // covered by the rule above, so a failure says which scripts to rename
    // rather than only that the convention broke.
    expect(names).toContain("publish:engine");
    expect(names).toContain("publish:rules");
    expect(names).not.toContain("publish-engine");
    expect(names).not.toContain("publish-rules");
  });

  it("keeps the docs in step with the scripts they name", () => {
    // A renamed script leaves its old name in the runbook, where it fails for
    // whoever follows the instructions — and publishing is exactly the task a
    // person does rarely, from a written procedure, under 2FA.
    const helper = readFileSync(
      resolve(repoRoot, "scripts", "publish-package.sh"),
      "utf8",
    );
    expect(helper).not.toMatch(/npm run publish-(engine|rules)/);
    expect(helper).toMatch(/npm run publish:engine/);
  });
});
