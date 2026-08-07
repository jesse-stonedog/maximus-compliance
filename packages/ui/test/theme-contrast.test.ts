/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Is the Optima theme legible?
 *
 * `theme.test.ts` already asserts the theme is *complete* — that every custom
 * property the preset reads is defined, in both modes. Complete is not the same
 * as readable: a theme can define all 44 properties and still paint near-black
 * text on a deep-blue surface, which is exactly what this file found in light
 * mode and what NEH-275 then fixed.
 *
 * The pairs come from `RECIPE_CONTRAST_PAIRS` in @stonedogcode/theme, which encodes
 * which foreground a recipe actually paints on which surface — **including
 * cross-group pairs**. That matters: comparing each token's own `bg` to its own
 * `text` looks like the obvious check and is the wrong one. It reports failures
 * for icon and arrow tokens, which paint no text at all, and it misses
 * `textPrimary` landing on `boxBgAccent` — which was the pair that actually
 * failed, and is the one a regression here would land on again.
 *
 * @stonedogcode/theme is an Apache-2.0, zero-runtime-dependency package and enters
 * only as a devDependency, so nothing it brings reaches the published image.
 */

import {
  RECIPE_CONTRAST_PAIRS,
  getContrastRatio,
  semanticTokenToCssVar,
} from "@stonedogcode/theme";

import { CSS_VAR_PREFIX, DARK_THEME, LIGHT_THEME } from "../src/theme.js";

/** WCAG 2.2 AA for body text. */
const AA = 4.5;

const MODES = { light: LIGHT_THEME, dark: DARK_THEME };

/**
 * Known-failing pairs, pinned rather than hidden.
 *
 * **Empty, and worth keeping empty.** It held three entries — the light-mode
 * `inputText/solid`, `inputText/glass` and `form/solid` pairs, where a deep
 * blue `boxAccent.bg` (#0b4f78) took the ordinary body colour at 1.98:1. That
 * was fixed at the source in NEH-275 by making the light accent surface an
 * actual light surface (#dbeafe) and moving its own text to the blue, so the
 * entries came out with it.
 *
 * Adding one back is a deliberate act: it exempts a pair from the build, and
 * "keeps the pinned exceptions honest" below makes sure it cannot outlive the
 * problem it names.
 */
const KNOWN_BELOW_AA = new Set<string>([]);

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
    // The failure this file was written for was a *cross-group* pair, and the
    // tempting fix — recolour the surface until the body colour reads on it —
    // silently breaks the surface's own pairing instead. Both halves have to
    // hold at once, which is why they are asserted separately.
    for (const [mode, tokens] of Object.entries(MODES)) {
      const ratio = getContrastRatio(
        tokens["box-accent-text"]!,
        tokens["box-accent-bg"]!,
      );
      expect({ mode, ok: ratio >= AA }).toEqual({ mode, ok: true });
    }
  });

  it("keeps its border usable as a focus ring", () => {
    // `apps/web/src/styles.css` draws `:focus-visible` in `box-accent-border`,
    // so that token is a non-text indicator: WCAG 2.2 SC 1.4.11 wants 3:1
    // against what it sits on, which is the page background. It was drawn in
    // `box-accent-bg` until NEH-275 lightened that to a tint — at which point
    // the outline fell to 1.22:1 and all but vanished. Pinning the border here
    // means the next person to retune the accent cannot quietly repeat it.
    const NON_TEXT = 3;
    for (const [mode, tokens] of Object.entries(MODES)) {
      const ratio = getContrastRatio(
        tokens["box-accent-border"]!,
        tokens["box-main-bg"]!,
      );
      expect({ mode, ok: ratio >= NON_TEXT }).toEqual({ mode, ok: true });
    }
  });
});
