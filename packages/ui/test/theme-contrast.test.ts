/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Is the Optima theme legible?
 *
 * `theme.test.ts` already asserts the theme is *complete* — that every custom
 * property the preset reads is defined, in both modes. Complete is not the same
 * as readable: a theme can define all 44 properties and still paint near-black
 * text on a deep-blue surface, which is what this file found.
 *
 * The pairs come from `RECIPE_CONTRAST_PAIRS` in stonedog-theme, which encodes
 * which foreground a recipe actually paints on which surface — **including
 * cross-group pairs**. That matters: comparing each token's own `bg` to its own
 * `text` looks like the obvious check and is the wrong one. It reports failures
 * for icon and arrow tokens, which paint no text at all, and it misses
 * `textPrimary` landing on `boxBgAccent`, which is the pair that actually
 * fails here.
 *
 * stonedog-theme is an Apache-2.0, zero-runtime-dependency package and enters
 * only as a devDependency, so nothing it brings reaches the published image.
 */

import {
  RECIPE_CONTRAST_PAIRS,
  getContrastRatio,
  semanticTokenToCssVar,
} from "stonedog-theme";

import { CSS_VAR_PREFIX, DARK_THEME, LIGHT_THEME } from "../src/theme.js";

/** WCAG 2.2 AA for body text. */
const AA = 4.5;

const MODES = { light: LIGHT_THEME, dark: DARK_THEME };

/**
 * Known-failing pairs, pinned rather than hidden.
 *
 * All three are one root cause: in **light** mode `boxAccent.bg` (#0b4f78) is a
 * deep blue while every other light surface is near-white, so `textPrimary`
 * (#161b22) lands on it at 1.98:1. The accent surface carries its own white
 * text (`box-accent-text`) and reads fine that way — the failure is the
 * cross-group pair, where a recipe paints the ordinary body colour onto it.
 *
 * Not fixed here on purpose. The fix is a design decision about whether
 * Optima's accent surface is dark-on-light or light-on-dark, it changes a live
 * product's brand colour, and it is not a call to make inside a test PR. Filed
 * separately; this list is the thing that stops it being forgotten, and any
 * pair NOT on it still fails the build.
 */
const KNOWN_BELOW_AA = new Set([
  "light:inputText/solid:textPrimary:boxBgAccent",
  "light:inputText/glass:textPrimary:boxBgAccent",
  "light:form/solid:textPrimary:boxBgAccent",
]);

/** The theme is keyed by property suffix; the registry speaks `--hopper-*`. */
function colour(tokens: Record<string, string>, semanticToken: string) {
  const property = semanticTokenToCssVar(semanticToken);
  if (!property) return null;
  const value = tokens[property.replace("--hopper-", "")];
  // Shadows are rgba() and `buttonPlain` is literally "transparent"; neither is
  // a text/background pair the contrast maths applies to.
  if (!value || value === "transparent" || value.startsWith("rgba")) return null;
  return value;
}

interface Measured {
  key: string;
  label: string;
  ratio: number;
}

function measure(mode: keyof typeof MODES): Measured[] {
  const tokens = MODES[mode];
  return RECIPE_CONTRAST_PAIRS.flatMap((pair) => {
    const fg = colour(tokens, pair.fgToken);
    const bg = colour(tokens, pair.bgToken);
    if (!fg || !bg) return [];
    return [
      {
        key: `${mode}:${pair.recipe}/${pair.variant}:${pair.fgToken}:${pair.bgToken}`,
        label: `${pair.recipe}/${pair.variant} — ${pair.fgToken} on ${pair.bgToken}`,
        ratio: getContrastRatio(fg, bg),
      },
    ];
  });
}

describe("the Optima namespace still owns these colours", () => {
  it("is optima, not hopper", () => {
    expect(CSS_VAR_PREFIX).toBe("optima");
  });
});

describe("recipe contrast", () => {
  it("measures a meaningful number of pairs", () => {
    // Guards every assertion below against passing vacuously — a mapping change
    // that silently resolved nothing would otherwise read as a clean sweep.
    expect(measure("light").length).toBeGreaterThanOrEqual(15);
  });

  it.each(Object.keys(MODES) as (keyof typeof MODES)[])(
    "%s keeps every unpinned pair above AA",
    (mode) => {
      const failing = measure(mode)
        .filter((m) => m.ratio < AA && !KNOWN_BELOW_AA.has(m.key))
        .map((m) => `${m.label} = ${m.ratio.toFixed(2)}:1`);

      // Named, not counted — the names are the whole content of the failure.
      expect(failing).toEqual([]);
    },
  );

  it("keeps the pinned exceptions honest", () => {
    // The counterpart to the allowlist. If someone fixes the accent surface,
    // this fails and tells them to delete the entry — otherwise the list
    // outlives the problem and quietly exempts a pair that has since regressed
    // for an entirely different reason.
    const all = [...measure("light"), ...measure("dark")];
    const stillFailing = new Set(
      all.filter((m) => m.ratio < AA).map((m) => m.key),
    );

    const fixed = [...KNOWN_BELOW_AA].filter((key) => !stillFailing.has(key));
    expect(fixed).toEqual([]);
  });

  it("has no pinned exceptions in dark mode", () => {
    // Dark mode passes AA outright today. Stating it separately means a
    // regression there cannot be absorbed by the light-mode allowlist.
    expect([...KNOWN_BELOW_AA].filter((k) => k.startsWith("dark:"))).toEqual([]);
  });
});

describe("the accent surface, specifically", () => {
  it("reads correctly with its own text colour", () => {
    // The pinned failures are about a *cross-group* pair. The accent surface's
    // intended pairing — its own white text — must stay well clear, or the
    // exception above would be masking a much bigger problem.
    for (const [mode, tokens] of Object.entries(MODES)) {
      const ratio = getContrastRatio(
        tokens["box-accent-text"]!,
        tokens["box-accent-bg"]!,
      );
      expect({ mode, ok: ratio >= AA }).toEqual({ mode, ok: true });
    }
  });
});
