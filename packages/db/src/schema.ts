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
  {
    id: 2,
    name: "documents_and_actions",
    sql: `
      -- A document may belong to no entity. Someone filing their first
      -- paperwork often has the letter before they have modelled the entity,
      -- and refusing the upload until they do would lose the document.
      CREATE TABLE documents (
        id           TEXT PRIMARY KEY,
        entity_id    TEXT REFERENCES entities(id) ON DELETE SET NULL,
        title        TEXT NOT NULL,
        -- The name the user's file had. NOT a path: see storage_key.
        original_filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        byte_size    INTEGER NOT NULL,
        -- Opaque, generated, and the ONLY thing used to build a filesystem
        -- path. A user-supplied filename reaching the filesystem is how
        -- "../../etc/passwd" becomes a write primitive.
        storage_key  TEXT NOT NULL UNIQUE,
        notes        TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );

      CREATE INDEX idx_documents_entity ON documents (entity_id);
      CREATE INDEX idx_documents_title  ON documents (title);

      -- Reference numbers pulled out of a document so they are searchable
      -- rather than buried in a PDF: UBI, DUNS, EIN, account numbers.
      CREATE TABLE document_fields (
        id          TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        label       TEXT NOT NULL,
        -- As written on the document, so it can be matched by eye against the
        -- paper: "604 123 456".
        value       TEXT NOT NULL,
        -- Lowercased, alphanumeric only. Exists because people type reference
        -- numbers from memory WITHOUT the separators the agency printed —
        -- searching "604123456" must find "604 123 456", or the whole
        -- find-my-UBI use case fails at the first attempt.
        value_normalized TEXT NOT NULL
      );

      CREATE INDEX idx_document_fields_document   ON document_fields (document_id);
      CREATE INDEX idx_document_fields_value      ON document_fields (value);
      CREATE INDEX idx_document_fields_normalized ON document_fields (value_normalized);

      -- A user-authored obligation. Deliberately NOT derived from a rule:
      -- this is the escape hatch for everything the engine does not cover,
      -- and for users who would rather keep their own dates.
      CREATE TABLE actions (
        id           TEXT PRIMARY KEY,
        entity_id    TEXT REFERENCES entities(id) ON DELETE CASCADE,
        document_id  TEXT REFERENCES documents(id) ON DELETE SET NULL,
        title        TEXT NOT NULL,
        detail       TEXT,
        due_on       TEXT NOT NULL,
        -- NULL means outstanding. A date, not a boolean, because "when did we
        -- file it" is the question asked afterwards.
        completed_on TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );

      CREATE INDEX idx_actions_due       ON actions (due_on);
      CREATE INDEX idx_actions_entity    ON actions (entity_id);
      CREATE INDEX idx_actions_document  ON actions (document_id);
    `,
  },
  {
    id: 3,
    name: "recurring_actions",
    sql: `
      -- Nearly every compliance obligation is annual. Without this, someone
      -- tracking their own dates must re-add each filing every year, and the
      -- year they forget is the year they miss it.
      ALTER TABLE actions ADD COLUMN repeat_annually INTEGER NOT NULL DEFAULT 0;

      -- Records that the successor has been created, so reopen-then-recomplete
      -- — a normal path, when an agency rejects a filing — does not spawn a
      -- second copy. Inferring this from the data would mean guessing whether a
      -- similar-looking future action was ours or the user's.
      ALTER TABLE actions ADD COLUMN successor_spawned INTEGER NOT NULL DEFAULT 0;
    `,
  },
];
