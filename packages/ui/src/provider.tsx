"use client";
/**
 * The one place Maximus configures hopper-style.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import React from "react";
import { HopperStyleProvider } from "hopper-style";
import { MAXIMUS_INTENT_ICONS } from "./intent-icons";

export interface MaximusStyleProviderProps {
  children: React.ReactNode;
}

/**
 * Sizing is set here and **nowhere else**.
 *
 * HopperGuard runs deliberately large — `iconSize` defaults to `2x` (32px) and
 * its font scale starts at ~22px — because it serves an often-elderly,
 * sometimes cognitively-impaired audience. Maximus is a business tool for a
 * general audience and runs a conventional scale: `iconSize="md"` (20px) plus
 * the `--font-sizes-*` properties from `theme.ts`.
 *
 * **Never pass `size` at an icon call site to compensate.** A call site that
 * names its own size opts that icon out of ever being retuned, which is how an
 * app grows three icon scales and no single place to fix them.
 */
export function MaximusStyleProvider({ children }: MaximusStyleProviderProps) {
  return (
    <HopperStyleProvider
      fontSizeProfile="md"
      iconSize="md"
      variant="solid"
      // The only place this product decides what a delete button looks like.
      // hopper-style ships the buttons and no artwork; these are the Lucide
      // glyphs. HopperGuard registers Font Awesome against the same keys.
      icons={MAXIMUS_INTENT_ICONS}
    >
      {children}
    </HopperStyleProvider>
  );
}
