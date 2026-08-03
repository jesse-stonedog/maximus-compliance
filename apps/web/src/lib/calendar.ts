import "server-only";
/**
 * The merged calendar: rule-derived obligations plus user-authored actions.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { IndeterminateRule } from "@optima/engine";
import type { DatedItem } from "@optima/reminders";
import { bucket, type Bucketed } from "@optima/reminders";
import { allCalendars, getStore, today } from "./server";

/**
 * Everything with a due date, from both sources.
 *
 * The merge is the point of the feature. Someone who does not trust the rule
 * packs still needs one list, and someone who does still needs the deadlines the
 * engine cannot know about. Keeping two separate screens would mean neither
 * list is the answer to "what is coming up".
 *
 * `source` travels with every item so the UI can say which is which — a
 * deadline derived from a cited statute and one a person typed are different
 * kinds of claim, and rendering them identically overstates one of them.
 */
export function allDatedItems(asOf: string = today()): DatedItem[] {
  const fromRules: DatedItem[] = allCalendars(asOf, 36).flatMap(({ entity, result }) =>
    result.obligations.map((o) => ({
      id: `${o.ruleId}-${o.dueOn}`,
      title: o.title,
      dueOn: o.dueOn,
      source: "rule" as const,
      citation: o.citation,
      status: o.status,
      entityId: entity.id,
    })),
  );

  const fromUser: DatedItem[] = getStore()
    .documents.listActions()
    .map((a) => ({
      id: a.id,
      title: a.title,
      dueOn: a.dueOn,
      source: "user" as const,
      ...(a.detail === undefined ? {} : { detail: a.detail }),
      ...(a.completedOn === undefined ? {} : { completedOn: a.completedOn }),
      ...(a.entityId === undefined ? {} : { entityId: a.entityId }),
      ...(a.documentId === undefined ? {} : { documentId: a.documentId }),
      ...(a.repeatAnnually ? { repeatAnnually: true } : {}),
    }));

  return [...fromRules, ...fromUser];
}

export interface MergedCalendar {
  bucketed: Bucketed;
  /**
   * Rules that cannot be decided because the entity is missing a fact.
   *
   * Carried alongside the buckets rather than folded into them: an
   * indeterminate rule has NO due date, so it cannot sit in a window — and
   * dropping it for that reason is exactly how a calendar comes to look
   * complete when it is not. This was lost when the dashboard moved to
   * reminder windows and had to be put back.
   */
  indeterminate: (IndeterminateRule & { entityName: string })[];
}

export function mergedCalendar(asOf: string = today()): MergedCalendar {
  const indeterminate = allCalendars(asOf, 36).flatMap(({ entity, result }) =>
    result.indeterminate.map((rule) => ({ ...rule, entityName: entity.name })),
  );
  return { bucketed: bucket(allDatedItems(asOf), asOf), indeterminate };
}
