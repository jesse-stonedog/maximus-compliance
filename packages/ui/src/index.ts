/**
 * @maximus/ui — Maximus presentation layer over hopper-style.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Holds the three things hopper-style deliberately does not: the colours, the
 * artwork, and the app-wide sizing choice. Everything else comes from the
 * design system itself.
 */

export { MaximusStyleProvider } from "./provider.js";
export type { MaximusStyleProviderProps } from "./provider.js";
export {
  CSS_VAR_PREFIX,
  DARK_THEME,
  FONT_SIZE_SCALE,
  LIGHT_THEME,
  themeCss,
} from "./theme.js";
export type { ThemeTokens } from "./theme.js";
export * from "./icons.js";
