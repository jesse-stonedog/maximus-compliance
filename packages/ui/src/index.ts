/**
 * @optima-compliance/ui — Optima presentation layer over stonedog-style.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Holds the three things stonedog-style deliberately does not: the colours, the
 * artwork, and the app-wide sizing choice. Everything else comes from the
 * design system itself.
 *
 * Imports here are EXTENSIONLESS, matching stonedog-style. This package ships
 * TypeScript source for Panda to parse, so the consumer's bundler resolves
 * these — and webpack will not map a ".js" specifier back onto a ".tsx" file.
 */

export { OptimaStyleProvider } from "./provider";
export { OPTIMA_INTENT_ICONS } from "./intent-icons";
export type { OptimaStyleProviderProps } from "./provider";
export {
  CSS_VAR_PREFIX,
  DARK_THEME,
  FONT_SIZE_SCALE,
  LIGHT_THEME,
  themeCss,
} from "./theme";
export type { ThemeTokens } from "./theme";
export * from "./icons";

/**
 * Form controls, re-exported from stonedog-style.
 *
 * Through this package rather than imported directly, for the same reason the
 * icons are: `@optima-compliance/ui` is the one door the app knocks on, so swapping an
 * implementation or wrapping one in product behaviour is a change here rather
 * than a sweep across every screen.
 *
 * These replaced hand-rolled `labelClass` / `inputClass` markup. The local
 * classes were not bad — but they were a second, parallel definition of what a
 * field looks like, and two definitions drift. The shared ones also carry
 * things the local markup did not: the app-wide text-size profile, the theme
 * variant, and a checkbox whose label is part of its tap target.
 */
export {
  StyledFormLabel,
  StyledInputText,
  StyledInputTextArea,
  StyledInputBool,
  StyledInputSelect,
} from "stonedog-style";
export type {
  StyledFormLabelProps,
  StyledInputTextProps,
  StyledInputTextAreaProps,
  StyledInputBoolProps,
  StyledInputSelectProps,
  SelectOption,
} from "stonedog-style";
