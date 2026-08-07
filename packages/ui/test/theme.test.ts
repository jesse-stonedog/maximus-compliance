/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { requiredCssCustomProperties } from "@stonedogcode/style/preset";
import {
  CSS_VAR_PREFIX,
  DARK_THEME,
  FONT_SIZE_SCALE,
  LIGHT_THEME,
  themeCss,
} from "../src/theme.js";

const required = requiredCssCustomProperties(CSS_VAR_PREFIX);
const defined = (tokens: Record<string, string>) =>
  Object.keys(tokens).map((suffix) => `--${CSS_VAR_PREFIX}-${suffix}`);

describe("theme completeness", () => {
  it("has properties to check", () => {
    // Guards the guard. If the preset's export ever returned an empty list,
    // every assertion below would pass vacuously.
    expect(required.length).toBeGreaterThan(20);
  });

  it.each(["light", "dark"])("%s defines every property the preset requires", (name) => {
    // A token with no matching custom property renders as NOTHING — no error,
    // no warning, just an invisible element. This test is the only thing that
    // turns an upstream token addition into a build failure here rather than a
    // blank box someone notices in production.
    const tokens = name === "light" ? LIGHT_THEME : DARK_THEME;
    const missing = required.filter((prop) => !defined(tokens).includes(prop));
    expect(missing).toEqual([]);
  });

  it.each(["light", "dark"])("%s defines nothing the preset does not read", (name) => {
    // A property nobody reads is dead weight that later reads as meaningful.
    const tokens = name === "light" ? LIGHT_THEME : DARK_THEME;
    const extra = defined(tokens).filter((prop) => !required.includes(prop));
    expect(extra).toEqual([]);
  });

  it("defines the same property set in both modes", () => {
    // A property present in one mode only produces an element that is visible
    // in light and invisible in dark, which is the kind of bug that ships.
    expect(Object.keys(LIGHT_THEME).sort()).toEqual(Object.keys(DARK_THEME).sort());
  });
});

describe("the Optima namespace", () => {
  it("is optima, not hopper", () => {
    // NEH-170. Shipping a compliance product whose stylesheet is branded for an
    // unrelated eldercare product only gets harder to unpick later.
    expect(CSS_VAR_PREFIX).toBe("optima");
    expect(themeCss()).not.toContain("--hopper-");
  });
});

describe("the font scale", () => {
  it("is standard, not HopperGuard's enlarged scale", () => {
    expect(FONT_SIZE_SCALE.md).toBe("1rem");
  });

  it("is rem throughout, never px", () => {
    // px would override the browser's own font-size setting, which is the
    // affordance users with low vision actually reach for.
    for (const value of Object.values(FONT_SIZE_SCALE)) {
      expect(value).toMatch(/rem$/);
    }
  });

  it("increases monotonically", () => {
    const values = Object.values(FONT_SIZE_SCALE).map(parseFloat);
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThan(values[i - 1]!);
    }
  });
});

describe("themeCss", () => {
  it("emits every property under the optima prefix", () => {
    const css = themeCss();
    for (const prop of required) expect(css).toContain(prop);
  });

  it("lets an explicit choice win over the OS preference", () => {
    // A user who picks a theme in the app must beat prefers-color-scheme, or
    // the toggle appears not to work for anyone whose system is set the other
    // way — which reads as a broken feature rather than a precedence rule.
    const css = themeCss();
    expect(css).toContain("prefers-color-scheme: dark");
    expect(css).toContain(":root[data-theme='dark']");
    expect(css).toContain(":root:not([data-theme='light'])");
    // The explicit override must come last to win at equal specificity.
    expect(css.lastIndexOf(":root[data-theme='dark']")).toBeGreaterThan(
      css.indexOf("prefers-color-scheme: dark"),
    );
  });

  it("emits the font scale", () => {
    expect(themeCss()).toContain("--font-sizes-md: 1rem;");
  });
});
