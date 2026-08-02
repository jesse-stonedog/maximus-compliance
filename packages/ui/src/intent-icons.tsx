/**
 * Which Lucide glyph Optima draws for each intent.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `hopper-style` ships the intent buttons — Save, Delete, Edit and the rest —
 * but no artwork. That is what lets it stay Apache-2.0 and public while
 * HopperGuard uses a per-seat licensed icon set: the buttons are shared, the
 * glyphs are not.
 *
 * This is the Optima half. Registered once on `OptimaStyleProvider`, it is
 * the only place in this product that decides what a delete button looks like,
 * and it is why the same `<StyledDeleteButton />` can render a Font Awesome
 * trash can over there and a Lucide one here.
 *
 * **Lucide, deliberately.** This repo is AGPLv3 and ships a public `docker run`
 * image, so the artwork inside it has to be redistributable. Font Awesome Pro
 * is not. See the icon seam note in `icons.tsx`.
 *
 * No size is named here: every glyph inherits the app-wide `iconSize` from the
 * provider, so the whole set retunes from one place.
 */
import type { IntentIcons } from "hopper-style";
import {
  ArrowLeft,
  ArrowRight,
  ChartLine,
  ChevronRight,
  Copy,
  ExternalLink,
  House,
  Menu,
  Pencil,
  Play,
  Plus,
  Save,
  Settings,
  SmilePlus,
  SquarePen,
  Trash2,
  Upload,
  X,
} from "lucide-react";

export const OPTIMA_INTENT_ICONS: IntentIcons = {
  add: <Plus />,
  analytics: <ChartLine />,
  back: <ArrowLeft />,
  cancel: <X />,
  clone: <Copy />,
  delete: <Trash2 />,
  edit: <Pencil />,
  emoji: <SmilePlus />,
  home: <House />,
  load: <Upload />,
  menu: <Menu />,
  new: <SquarePen />,
  next: <ChevronRight />,
  play: <Play />,
  rename: <SquarePen />,
  resume: <ArrowRight />,
  save: <Save />,
  settings: <Settings />,
  url: <ExternalLink />,
};
