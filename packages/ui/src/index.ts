/**
 * @maximus/ui — Maximus presentation layer over hopper-style.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Holds the three things hopper-style deliberately does not: the colours, the
 * artwork, and the app-wide sizing choice. Everything else comes from the
 * design system itself.
 *
 * Imports here are EXTENSIONLESS, matching hopper-style. This package ships
 * TypeScript source for Panda to parse, so the consumer's bundler resolves
 * these — and webpack will not map a ".js" specifier back onto a ".tsx" file.
 */

export { MaximusStyleProvider } from "./provider";
export type { MaximusStyleProviderProps } from "./provider";
export {
  CSS_VAR_PREFIX,
  DARK_THEME,
  FONT_SIZE_SCALE,
  LIGHT_THEME,
  themeCss,
} from "./theme";
export type { ThemeTokens } from "./theme";
export * from "./icons";
