/**
 * The self-host schema and its migrations.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * SQLite via **`node:sqlite`**, which ships with Node — so the self-host tier
 * has zero runtime dependencies and no native module to compile. That matters
 * more than it looks: the image is published multi-arch for people running it
 * on ARM boxes and Pis, and a native build is the usual reason such an image
 * works on one architecture and not the other.
 */

/**
 * Migrations, applied in order and recorded so they run once.
 *
 * **Append only. Never edit a migration that has shipped** — a self-hoster's
 * database has already run it, so an edit changes what new installs get without
 * changing existing ones, and the two silently diverge. Correct a mistake with
 * a new migration.
 */
export const MIGRATIONS: readonly { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "entities",
    sql: `
      CREATE TABLE entities (
        id                 TEXT PRIMARY KEY,
        name               TEXT NOT NULL,
        entity_types       TEXT NOT NULL,
        formed_on          TEXT NOT NULL,
        home_jurisdiction  TEXT NOT NULL,
        jurisdictions      TEXT NOT NULL,
        fiscal_year_end    TEXT NOT NULL,
        registered_on      TEXT,

        -- NULLABLE ON PURPOSE, all four. The engine distinguishes "we do not
        -- know" from a real value and reports the rule as indeterminate rather
        -- than guessing. A NOT NULL DEFAULT 0 here would destroy that
        -- distinction at the storage layer and quietly tell a large charity it
        -- qualifies for the postcard return.
        gross_revenue_minor_units  INTEGER,
        total_assets_minor_units   INTEGER,
        employee_count             INTEGER,
        solicits_charitable_contributions INTEGER,

        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX idx_entities_name ON entities (name);
    `,
  },
];
