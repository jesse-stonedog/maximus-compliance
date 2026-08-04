/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Shipped copy must not assert a trademark that has not been cleared.
 *
 * "Optima" has never had a clearance search (NEH-199, still open), and the
 * project CLAUDE.md says so in as many words: **"No ™ is claimed yet."** The
 * previous product name was abandoned *because* of a real conflict — Maximus
 * Inc. (NYSE: MMS) operates close enough to compliance software to matter — and
 * the rename to "Optima" resolved that known conflict without answering the
 * question, "Optima" being a common word carrying its own unresearched risk.
 *
 * So the assertion is not merely unsupported, it is unsupported in the one
 * direction the project already knows it can be wrong.
 *
 * ## Why this is a test rather than a note in review
 *
 * The claim shipped once already (optima-filings#30, NEH-371) and reached
 * `main`. It is one sentence in a footer nobody re-reads, added in a PR whose
 * subject was the brand mark — exactly the kind of line that arrives as a
 * plausible-looking flourish and then sits there. A convention written in
 * CLAUDE.md and enforced by nothing survives until the first busy afternoon.
 *
 * The cost of it failing is also asymmetric. This repo is public and AGPL-3.0,
 * and its distribution model is self-hosters running and redistributing the
 * app, so the claim propagates to every deployment and no later commit recalls
 * the copies. That is the same shape as the Font Awesome rule next door, and it
 * gets the same treatment: assert it.
 *
 * ## Scope
 *
 * Deliberately limited to **shipped user-facing source**. Docs, issue
 * templates, and CLAUDE.md files must stay free to *discuss* trademarks — the
 * project file's own "No ™ is claimed yet" contains a ™ and is the sentence
 * this test exists to enforce. A test that cannot tell naming a thing from
 * claiming it would be deleted the first time it blocked a docs PR.
 *
 * ## When NEH-199 clears
 *
 * Delete this file rather than exempting a line. Restoring the claim is then a
 * deliberate act with a decision behind it — ™ for an unregistered claim, ® for
 * a registered one — instead of an assertion that slipped back in.
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

/**
 * Source that renders into the product a user actually sees. Not `docs/`, not
 * `*.md`, not the rule JSON — see the scope note above.
 */
const SHIPPED_SOURCE_DIRS = [
  "apps/web/src",
  "apps/cli/src",
  "packages/ui/src",
];

/**
 * Assertions of ownership, not mentions of the concept.
 *
 * `™` and `®` are claims wherever they appear in rendered copy. The phrase
 * forms catch the spelled-out version the footer actually used, which no
 * symbol-only check would have caught.
 */
const CLAIM_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /™/u, label: "™ symbol" },
  { pattern: /®/u, label: "® symbol" },
  { pattern: /\bis a (registered )?trademark\b/iu, label: "“is a trademark”" },
  { pattern: /\btrademarks? of\b/iu, label: "“trademark of”" },
  { pattern: /\ba (registered )?trademark\b/iu, label: "“a trademark”" },
];

/** Tracked files under the shipped-source dirs, minus this test itself. */
function shippedSourceFiles(): string[] {
  const tracked = execFileSync(
    "git",
    ["-C", REPO_ROOT, "ls-files", "-z", "--", ...SHIPPED_SOURCE_DIRS],
    { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  )
    .split("\0")
    .filter(Boolean);

  // This file necessarily contains every pattern it forbids. It lives under
  // apps/web/test, not apps/web/src, so it is already outside the globs above —
  // the filter is belt and braces against someone widening SHIPPED_SOURCE_DIRS.
  return tracked.filter((f) => !f.endsWith("no-trademark-claim.test.ts"));
}

describe("no uncleared trademark claim in shipped copy", () => {
  const files = shippedSourceFiles();

  it("finds shipped source to check", () => {
    // A glob that matches nothing is silent, and a silent policy test reads
    // exactly like a passing one. Fail loudly if the paths ever move.
    expect(files.length).toBeGreaterThan(0);
  });

  it("asserts no trademark anywhere a user can read it", () => {
    const violations: string[] = [];

    for (const file of files) {
      const contents = readFileSync(join(REPO_ROOT, file), "utf8");
      const lines = contents.split("\n");

      lines.forEach((line, index) => {
        for (const { pattern, label } of CLAIM_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(`${file}:${index + 1} — ${label}: ${line.trim()}`);
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });
});

describe("the footer still carries the notices that are true", () => {
  // The fix is a deletion, and a deletion is the easy thing to overshoot. These
  // three are load-bearing for a different reason than the trademark line was:
  // AGPL §5 requires a work carrying the licence to keep its notices intact, and
  // for a network-facing app the practical form of that is a visible statement
  // of authorship and licence with a route to the source.
  const footer = readFileSync(
    join(REPO_ROOT, "apps/web/src/components/site-footer.tsx"),
    "utf8",
  );

  it("names StoneDogCode L.L.C. as the copyright holder", () => {
    expect(footer).toContain("StoneDogCode L.L.C.");
  });

  it("names the licence", () => {
    expect(footer).toContain("AGPL-3.0-only");
  });

  it("links to the source", () => {
    expect(footer).toContain("github.com/stonedog-code/optima-filings");
  });
});
