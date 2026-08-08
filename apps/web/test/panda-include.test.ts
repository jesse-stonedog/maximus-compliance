/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Panda's cross-package `include` globs must reach real files on disk.
 *
 * Panda finds styles by statically parsing source files, so a package it never
 * parses contributes no CSS. **A glob that matches nothing fails silently** —
 * no build error, no warning, no console message. Codegen succeeds, the class
 * names are still emitted into the DOM, and there is simply no CSS behind
 * them. The only symptom is pixels, and only for a component carrying an
 * inline `styled(…, { base: … })`: everything driven by the preset's recipes
 * keeps working, because Panda emits those from config without reading a
 * single source file. optima-cloud-saas ran for months with a broken glob and
 * nobody noticed, for exactly that reason.
 *
 * Two ways it breaks here, both real rather than theoretical:
 *
 * - **A package moves between the submodule and npm.** The glob must name
 *   wherever the package actually lives — `../../packages/stonedog-style/src`
 *   as a submodule, `node_modules/@stonedogcode/style/src` from the registry.
 *   Moving a consumer from one to the other means moving this line, and
 *   forgetting is silent.
 * - **A scope rename rewrites a checkout directory.** `@stonedogcode/style` is
 *   the package NAME; `packages/stonedog-style` is a DIRECTORY, and a
 *   directory does not move when the package is renamed (NEH-482). A
 *   find-and-replace producing `packages/@stonedogcode/style/src/**` points at
 *   nothing — that exact mistake was caught three times across the sibling
 *   consumer repos during this rename, twice by a guard like this one.
 *
 * The globs are READ FROM `panda.config.ts` rather than restated here. A test
 * that restates them is a test of the filesystem and not of the config:
 * renaming the path in the config alone would leave it passing while Panda
 * parsed nothing. Written once, they cannot drift.
 */
import { readdirSync, existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";

import pandaConfig from "../panda.config";

/**
 * Globs in `panda.config.ts` are relative to `apps/web`, which is where `panda
 * codegen` runs. Jest's `rootDir` is the repository root, so the base has to be
 * spelled out rather than taken from cwd. Tests compile to CommonJS (see
 * `tsconfig.test.json`), so `__dirname` exists.
 */
const APP_ROOT = resolve(__dirname, "..");

const includes = (pandaConfig as { include?: string[] }).include ?? [];

/** The globs reaching outside this app — the silent ones. */
const crossPackage = includes.filter((g) => g.startsWith("../") || g.includes("node_modules"));

/**
 * Which package a glob reaches for, so the assertion can be per PACKAGE.
 *
 * A package may legitimately be listed at more than one location — an
 * app-local and a hoisted `node_modules` path, because npm workspaces hoist
 * depending on version conflicts elsewhere in the tree. When that happens one
 * of the paths is *expected* to match nothing, and requiring every glob to
 * match would fail a config that is correct. The tempting way to quiet such a
 * failure is deleting whichever path is empty today — precisely the one that
 * starts matching the moment a dependency change moves the package.
 */
function packageOf(glob: string): string {
  const m = glob.match(/(?:node_modules|packages)\/(@[^/]+\/[^/]+|[^/]+)\//);
  return m ? m[1] : glob;
}

const byPackage = crossPackage.reduce<Record<string, string[]>>((acc, glob) => {
  (acc[packageOf(glob)] ??= []).push(glob);
  return acc;
}, {});

/** The fixed directory prefix of a glob — everything before the first wildcard. */
function globBase(glob: string): string {
  const star = glob.indexOf("*");
  const upToStar = star === -1 ? glob : glob.slice(0, star);
  return upToStar.slice(0, upToStar.lastIndexOf("/") + 1);
}

/**
 * The extensions a glob accepts, from its `*.tsx` or `*.{ts,tsx}` tail.
 *
 * This is deliberately not a general glob implementation — no dependency here
 * provides one, and a hand-rolled one would be its own source of wrong
 * answers. It covers the two shapes this config actually uses, and the
 * question being asked is only "does this reach real source files", not "which
 * exact set".
 */
function globExtensions(glob: string): string[] {
  const braces = glob.match(/\*\.\{([^}]+)\}$/);
  if (braces) return braces[1].split(",").map((e) => `.${e.trim()}`);
  const single = glob.match(/\*\.([A-Za-z]+)$/);
  return single ? [`.${single[1]}`] : [];
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Files under the glob's base directory carrying one of its extensions. */
function filesFor(glob: string): string[] {
  const base = resolve(APP_ROOT, globBase(glob));
  if (!existsSync(base)) return [];
  const exts = globExtensions(glob);
  return walk(base).filter((f) => exts.some((e) => f.endsWith(e)));
}

describe("Panda include globs resolve to real files (NEH-482)", () => {
  it("has cross-package globs to check", () => {
    // Guards the guard. If the config stopped including package source at all,
    // every case below would silently vanish and this file would report green
    // while checking nothing — the same failure mode it exists to catch.
    expect(crossPackage.length).toBeGreaterThan(0);
    expect(Object.keys(byPackage).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(byPackage))("%s is reachable by at least one of its globs", (pkg, globs) => {
    const perGlob = globs.map((g) => ({ glob: g, files: filesFor(g).length }));
    const total = perGlob.reduce((n, p) => n + p.files, 0);
    if (total === 0) {
      // Name every candidate path: "expected > 0" alone does not say which
      // locations were searched, and that is the whole question.
      throw new Error(
        `No file matched any Panda include glob for "${pkg}":\n` +
          perGlob.map((p) => `  ${p.glob} -> ${p.files} files`).join("\n"),
      );
    }
    expect(total).toBeGreaterThan(0);
  });

  it("reaches the style components themselves, not merely the directory", () => {
    // A glob can match stray files while missing the components that are the
    // entire reason it is here. Name one explicitly.
    const styleGlobs = byPackage["stonedog-style"] ?? [];
    expect(styleGlobs.length).toBeGreaterThan(0);
    const matched = styleGlobs.flatMap((g) => filesFor(g));
    expect(matched.some((f) => f.endsWith(`${sep}StyledBox.tsx`))).toBe(true);
  });

  it("names the checkout directory, never the scoped package name", () => {
    // `packages/@stonedogcode/style/src/**` is the rewrite that looks correct
    // after a scope rename and resolves to nothing.
    for (const glob of crossPackage) {
      expect(glob).not.toContain("packages/@stonedogcode");
    }
  });
});
