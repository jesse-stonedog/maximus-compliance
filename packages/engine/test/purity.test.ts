/**
 * Guards the two constraints that make this package what it is.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Both are trivially easy to break with one convenient-looking line, and
 * neither breaks anything visible when it happens — the tests pass, the build
 * is green, and the damage shows up later as results that cannot be reproduced
 * or a package that will not run in a browser.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const srcRoot = join(__dirname, "..", "src");

function sourceFiles(dir: string = srcRoot): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return name.endsWith(".ts") ? [full] : [];
  });
}

const files = sourceFiles().map((path) => ({
  path,
  relative: path.slice(srcRoot.length + 1),
  source: readFileSync(path, "utf8"),
}));

describe("the engine is clock-free", () => {
  it("has source files to check", () => {
    // Guards the guard: a glob that silently matched nothing would make every
    // assertion below vacuously true.
    expect(files.length).toBeGreaterThan(3);
  });

  it.each(files.map((f) => f.relative))(
    "%s does not read the clock",
    (relative) => {
      const { source } = files.find((f) => f.relative === relative)!;
      const offenders = [
        /\bDate\.now\s*\(/,
        /\bnew\s+Date\s*\(\s*\)/,
        /\bperformance\.now\s*\(/,
      ].filter((pattern) => pattern.test(stripComments(source)));

      // A default `asOf` would make every result depend on when it ran: not
      // cacheable, not reproducible in a bug report, and unable to answer "what
      // was due in 2024" — which real users need for late filings.
      expect(offenders).toEqual([]);
    },
  );
});

describe("the engine is pure", () => {
  it.each(files.map((f) => f.relative))("%s does no I/O", (relative) => {
    const { source } = files.find((f) => f.relative === relative)!;
    const offenders = [
      /from\s+["']node:/,
      /require\s*\(\s*["']node:/,
      /\bprocess\.env\b/,
      /\bfetch\s*\(/,
      /\blocalStorage\b/,
    ].filter((pattern) => pattern.test(stripComments(source)));

    // Purity is what lets this run in a browser, be tested against thousands of
    // fixtures, and be exposed directly as the B2B API.
    expect(offenders).toEqual([]);
  });
});

/**
 * Strips comments so prose describing a banned pattern does not trip the check.
 *
 * The whole point of these files is to explain why `Date.now()` is forbidden,
 * and a guard that punished saying so would push the explanation out of the
 * code — which is where it is most useful.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}
