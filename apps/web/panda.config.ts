/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { defineConfig } from "@pandacss/dev";
import { stonedogStylePreset } from "stonedog-style/preset";

export default defineConfig({
  preflight: true,
  /**
   * The base presets are listed EXPLICITLY, and that is load-bearing.
   *
   * Supplying a `presets` array REPLACES Panda's defaults instead of adding to
   * them. Omit these two and the recipes lose every token they lean on —
   * `gray.*`, `radii.xl`, the spacing scale — and Panda drops those
   * declarations SILENTLY: no build error, no console error, just wrong pixels.
   */
  presets: [
    "@pandacss/preset-base",
    "@pandacss/preset-panda",
    // NEH-170: our own --optima-* namespace, not the default --hopper-*.
    stonedogStylePreset({ cssVarPrefix: "optima" }),
  ],
  /**
   * stonedog-style and @optima/ui ship TypeScript SOURCE, and Panda finds styles
   * by statically parsing files. A package it never parses contributes no CSS,
   * and its components then render with class names that have no rules behind
   * them — which looks like a broken stylesheet, not a missing glob.
   */
  include: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/stonedog-style/src/**/*.tsx",
  ],
  exclude: [],
  outdir: "styled-system",
  jsxFramework: "react",
});
