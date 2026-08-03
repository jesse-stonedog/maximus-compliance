/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Font Awesome Pro must never reach this repo.
 *
 * `stonedog-icons` vendors **actual Font Awesome Pro path data**. The licence is
 * perpetual for 7.2.0 but forbids redistribution, and this repo is public *and*
 * publishes a `docker run` image to the world. Vendoring it here is a licence
 * violation, not a style preference — stonedog-icons' own CLAUDE.md names
 * `optima-filings` as the case its permissive icon seam was built for.
 *
 * That rule was written down in three CLAUDE.md files and enforced by nothing.
 * A rule a reviewer has to remember is a rule that survives until the first
 * busy afternoon, and the cost of it failing is not a bug report — it is a
 * licence problem in an artifact already downloaded by strangers, which no
 * later commit can recall.
 *
 * So: assert it. The icons here come from Lucide through stonedog-style's
 * `createIconFromComponent` seam, which lands them in the same sized, themed,
 * accessible box.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Asked of git rather than derived from `import.meta.url`: jest transpiles this
// file to CommonJS, where `import.meta` is a syntax error, and a relative walk
// up from __dirname breaks the moment the file moves.
const REPO_ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

const FORBIDDEN = [
  "stonedog-icons",
  "hopper-icons", // the pre-rename name; a stale reference is the same leak
  "@fortawesome/",
  "@stonedog-icons/fa-duotone-subset",
  "@hopper-icons/fa-duotone-subset",
];

const readJson = (relative: string) =>
  JSON.parse(readFileSync(join(REPO_ROOT, relative), "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };

/** Every package.json this repo owns — the root plus each workspace. */
const MANIFESTS = [
  "package.json",
  "packages/engine/package.json",
  "packages/rules/package.json",
  "packages/db/package.json",
  "packages/ui/package.json",
  "apps/web/package.json",
  "apps/cli/package.json",
];

describe("no Font Awesome in a public, redistributed repo", () => {
  it.each(MANIFESTS)("%s declares no forbidden dependency", (manifest) => {
    const pkg = readJson(manifest);
    const declared = Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    });

    const violations = declared.filter((name) =>
      FORBIDDEN.some((bad) => name === bad || name.startsWith(bad)),
    );

    expect(violations).toEqual([]);
  });

  it("declares no forbidden submodule", () => {
    // stonedog-style is a submodule here and is Apache-2.0, so it is fine.
    // stonedog-icons never may be — and a submodule is the most likely way it
    // would arrive, since that is how stonedog-style got here.
    let gitmodules = "";
    try {
      gitmodules = readFileSync(join(REPO_ROOT, ".gitmodules"), "utf8");
    } catch {
      return; // no submodules at all is trivially fine
    }

    for (const bad of FORBIDDEN) {
      expect(gitmodules).not.toContain(bad);
    }
  });

  it("has no tracked file naming Font Awesome artwork", () => {
    // Catches the other route in: someone copies the vendored subset in as
    // plain files rather than adding a dependency. Searches tracked files only
    // — node_modules is not redistributed, the git tree is.
    const tracked = execFileSync(
      "git",
      ["-C", REPO_ROOT, "ls-files", "-z"],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    )
      .split("\0")
      .filter(Boolean)
      // The submodule's own contents are not this repo's tracked files, and
      // this test file necessarily names every forbidden string itself.
      .filter((f) => !f.startsWith("packages/stonedog-style/"))
      .filter((f) => !f.endsWith("no-font-awesome.test.ts"));

    const suspicious = tracked.filter((f) =>
      /fontawesome|font-awesome|fa-duotone|fa-solid|fa-regular/i.test(f),
    );

    expect(suspicious).toEqual([]);
  });
});

describe("icons come from the permissive seam instead", () => {
  const icons = readFileSync(
    join(REPO_ROOT, "packages/ui/src/icons.tsx"),
    "utf8",
  );

  it("builds them from Lucide", () => {
    expect(icons).toContain("lucide-react");
  });

  it("routes them through stonedog-style rather than rendering raw SVG", () => {
    // The seam is what makes a Lucide glyph land in the same sized, themed,
    // accessible box as the Pro set does in the SaaS. A raw <svg> here would
    // render, look approximately right, and silently opt out of all of it.
    expect(icons).toMatch(/createIcon(FromComponent)?/);
    expect(icons).toContain("stonedog-style");
  });
});
