/**
 * @maximus/db — SQLite persistence for the self-hosted tier.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Uses `node:sqlite`, which ships with Node, so this package has **zero runtime
 * dependencies and no native module to build**. That constraint is what keeps
 * the self-host promise honest: one container, one file on a volume, nothing
 * else to install — and a multi-arch image that cannot fail to compile on ARM.
 */

export { EntityStore } from "./store.js";
export type { OpenOptions, StoredEntity } from "./store.js";
export { MIGRATIONS } from "./schema.js";
