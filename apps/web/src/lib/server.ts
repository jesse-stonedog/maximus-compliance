import "server-only";
/**
 * The server boundary.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * **This is the only file in the app that reads the clock, touches the
 * filesystem, or opens the database.** Everything below it — the engine, the
 * export package, the store's own logic — is pure and takes what it needs as an
 * argument. Keeping the impure surface to one file is what makes the rest
 * testable, and `import "server-only"` makes it a build error to pull any of it
 * into a client component.
 */

import { EntityStore, type StoredEntity } from "@maximus/db";
import { evaluate, type EvaluationResult } from "@maximus/engine";
import { ALL_RULES } from "@maximus/rules";

/**
 * Where the SQLite file lives.
 *
 * Defaults inside `/data`, which is the documented volume mount. A self-hoster
 * who forgets `-v` gets a database inside the container that vanishes on the
 * next `docker run` — so the startup log says the path out loud rather than
 * letting the loss be discovered later.
 */
const DB_PATH = process.env.MAXIMUS_DB_PATH ?? "/data/maximus.sqlite";

/**
 * One store for the process.
 *
 * Cached on `globalThis` rather than in a module-level `let`, because Next's
 * dev server re-evaluates modules on every hot reload — a plain module variable
 * leaks a new SQLite handle per edit until the process runs out of them.
 */
const globalForStore = globalThis as unknown as { maximusStore?: EntityStore };

export function getStore(): EntityStore {
  if (!globalForStore.maximusStore) {
    globalForStore.maximusStore = new EntityStore({
      path: DB_PATH,
      now: () => new Date().toISOString(),
    });
    if (process.env.NODE_ENV !== "test") {
      console.info(`[maximus] database: ${DB_PATH}`);
      // Registered here rather than at module load: this is the moment a
      // database handle actually exists to be checkpointed.
      void import("./shutdown").then((m) => m.wireShutdown());
    }
  }
  return globalForStore.maximusStore;
}

/** Today, UTC, as `YYYY-MM-DD`. The app's single clock read. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Whether to show rules a human has not verified against their statute.
 *
 * **Defaults to off**, matching the engine. The entire seed set is currently
 * `draft`, so a self-hoster who has not opted in sees an empty calendar — which
 * is the honest answer, not a bug. Turning it on is a deliberate act, and every
 * such row is marked in the UI.
 */
export function includeDraft(): boolean {
  return process.env.MAXIMUS_INCLUDE_DRAFT === "true";
}

export interface EntityCalendar {
  entity: StoredEntity;
  result: EvaluationResult;
}

export function calendarFor(
  entity: StoredEntity,
  asOf: string,
  horizonMonths = 12,
): EntityCalendar {
  return {
    entity,
    result: evaluate(entity, ALL_RULES, {
      asOf,
      horizonMonths,
      includeDraft: includeDraft(),
    }),
  };
}

/** Every entity's calendar, for the overview. */
export function allCalendars(asOf: string, horizonMonths = 12): EntityCalendar[] {
  return getStore()
    .list()
    .map((entity) => calendarFor(entity, asOf, horizonMonths));
}
