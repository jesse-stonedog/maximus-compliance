/**
 * @optima/rules — the rule packs.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Data, not behaviour. Everything here is the JSON under `us/`, inlined at
 * build time by `scripts/build-barrel.mjs` so that a browser consumer works
 * without a filesystem.
 *
 * Versioned `YYYY.M.PATCH`, separately from the engine's semver: this package
 * changes whenever a legislature does, and semver says nothing useful about
 * "Oregon raised a fee".
 */

import type { Rule } from "@optima/engine";
import { ALL_RULES } from "./generated.js";

export { ALL_RULES };

/** Only rules a human has checked against the primary source. */
export const ACTIVE_RULES: readonly Rule[] = ALL_RULES.filter(
  (rule) => rule.status === "active",
);

/** Rules for one jurisdiction. Does not include federal unless asked for `"US"`. */
export function rulesForJurisdiction(
  jurisdiction: string,
  rules: readonly Rule[] = ALL_RULES,
): readonly Rule[] {
  return rules.filter((rule) => rule.jurisdiction === jurisdiction);
}
