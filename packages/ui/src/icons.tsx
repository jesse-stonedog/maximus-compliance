"use client";
/**
 * The Maximus icon set.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * **Lucide, not Font Awesome — and that is a licence constraint, not taste.**
 * `hopper-icons` vendors Font Awesome Pro path data. This repo is public and
 * publishes a `docker run` image to the world, so shipping that artwork here
 * would be redistribution the licence does not permit. hopper-style's icon seam
 * exists precisely for this case: same sizing, theming and accessibility, from
 * a permissive set, one line per glyph.
 *
 * **Keep these names identical to maximus-cloud-saas's set.** The SaaS builds
 * the same names on Font Awesome, so a screen ported between the repos needs no
 * icon edits. A name that exists in one and not the other is what makes porting
 * a rewrite.
 *
 * No size is named here. Every wrapper inherits the app-wide `iconSize` from
 * the provider, so the whole set retunes from one place.
 */

import { createIconFromComponent } from "hopper-style";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  ExternalLink,
  FileText,
  Info,
  Landmark,
  Pencil,
  Plus,
  Scale,
  Search,
  Settings,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

export const StyledAdd = createIconFromComponent("StyledAdd", Plus);
export const StyledCalendar = createIconFromComponent("StyledCalendar", CalendarClock);
export const StyledCalendarAdd = createIconFromComponent("StyledCalendarAdd", CalendarPlus);
export const StyledCheck = createIconFromComponent("StyledCheck", Check);
export const StyledChevronDown = createIconFromComponent("StyledChevronDown", ChevronDown);
export const StyledChevronRight = createIconFromComponent("StyledChevronRight", ChevronRight);
export const StyledClose = createIconFromComponent("StyledClose", X);
export const StyledDownload = createIconFromComponent("StyledDownload", Download);
export const StyledEdit = createIconFromComponent("StyledEdit", Pencil);
export const StyledEntity = createIconFromComponent("StyledEntity", Building2);
export const StyledExternal = createIconFromComponent("StyledExternal", ExternalLink);
export const StyledForm = createIconFromComponent("StyledForm", FileText);
export const StyledHelp = createIconFromComponent("StyledHelp", CircleHelp);
export const StyledInfo = createIconFromComponent("StyledInfo", Info);
export const StyledJurisdiction = createIconFromComponent("StyledJurisdiction", Landmark);
export const StyledSearch = createIconFromComponent("StyledSearch", Search);
export const StyledSettings = createIconFromComponent("StyledSettings", Settings);
export const StyledStatute = createIconFromComponent("StyledStatute", Scale);
export const StyledTrash = createIconFromComponent("StyledTrash", Trash2);
export const StyledUnverified = createIconFromComponent("StyledUnverified", AlertTriangle);
export const StyledWarning = createIconFromComponent("StyledWarning", TriangleAlert);
