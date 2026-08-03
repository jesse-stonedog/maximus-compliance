/**
 * Documents, their reference fields, and user-authored actions.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { addYears } from "@optima/engine";
import type { DatabaseSync } from "node:sqlite";

export interface DocumentField {
  id: string;
  label: string;
  value: string;
}

export interface StoredDocument {
  id: string;
  entityId?: string;
  title: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  /** Opaque key. The only value used to build a filesystem path. */
  storageKey: string;
  notes?: string;
  fields: DocumentField[];
  createdAt: string;
  updatedAt: string;
}

export interface NewDocument {
  entityId?: string;
  title: string;
  originalFilename: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  notes?: string;
  fields?: { label: string; value: string }[];
}

export interface StoredAction {
  id: string;
  entityId?: string;
  documentId?: string;
  title: string;
  detail?: string;
  dueOn: string;
  completedOn?: string;
  /** Whether completing this spawns next year's occurrence. */
  repeatAnnually: boolean;
  /** Whether it already has. Guards reopen-then-recomplete. */
  successorSpawned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewAction {
  entityId?: string;
  documentId?: string;
  title: string;
  detail?: string;
  dueOn: string;
  repeatAnnually?: boolean;
}

/**
 * Strip everything a human might or might not type.
 *
 * Reference numbers are printed with separators the agency chose — "604 123
 * 456", "91-1234567" — and recalled without them. Matching on both forms is
 * what makes the number findable by whoever is looking, however they remember
 * it.
 */
export function normalizeReference(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** `null` → absent key, so an unset value never reads as an empty string. */
function optional<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

export class DocumentStore {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => string,
    private readonly newId: () => string,
  ) {}

  // -------------------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------------------

  createDocument(input: NewDocument, id: string): StoredDocument {
    const timestamp = this.now();
    this.db.exec("BEGIN");
    try {
      this.db
        .prepare(
          `INSERT INTO documents (id, entity_id, title, original_filename,
             content_type, byte_size, storage_key, notes, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          id,
          input.entityId ?? null,
          input.title,
          input.originalFilename,
          input.contentType,
          input.byteSize,
          input.storageKey,
          input.notes ?? null,
          timestamp,
          timestamp,
        );
      for (const field of input.fields ?? []) {
        this.db
          .prepare(
            `INSERT INTO document_fields (id, document_id, label, value, value_normalized)
             VALUES (?,?,?,?,?)`,
          )
          .run(
            this.newId(),
            id,
            field.label,
            field.value,
            normalizeReference(field.value),
          );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      // Without the rollback a failed field insert would leave a document row
      // with no fields and no indication anything was lost.
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.getDocument(id)!;
  }

  getDocument(id: string): StoredDocument | undefined {
    const row = this.db
      .prepare("SELECT * FROM documents WHERE id = ?")
      .get(id) as unknown as Record<string, string | number | null> | undefined;
    if (!row) return undefined;

    const fields = (
      this.db
        .prepare(
          "SELECT id, label, value FROM document_fields WHERE document_id = ? ORDER BY label",
        )
        .all(id) as unknown as DocumentField[]
    ).map((f) => ({ ...f }));

    return {
      id: row.id as string,
      ...(row.entity_id === null ? {} : { entityId: row.entity_id as string }),
      title: row.title as string,
      originalFilename: row.original_filename as string,
      contentType: row.content_type as string,
      byteSize: row.byte_size as number,
      storageKey: row.storage_key as string,
      ...(row.notes === null ? {} : { notes: row.notes as string }),
      fields,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  listDocuments(): StoredDocument[] {
    return (
      this.db
        .prepare("SELECT id FROM documents ORDER BY created_at DESC")
        .all() as unknown as { id: string }[]
    ).map((row) => this.getDocument(row.id)!);
  }

  /**
   * Find documents by title, notes, filename, or any reference field value.
   *
   * The field search is why this exists: someone filing an annual report needs
   * to look up a UBI number they know is "in the formation letter somewhere",
   * and a title-only search would not find it.
   */
  searchDocuments(query: string): StoredDocument[] {
    const term = `%${query.trim().toLowerCase()}%`;
    // The same stripping applied to the query, so "604123456", "604 123 456"
    // and "604-123-456" all find the same document.
    const normalized = normalizeReference(query);
    if (query.trim() === "") return this.listDocuments();
    return (
      this.db
        .prepare(
          `SELECT DISTINCT d.id, d.created_at FROM documents d
             LEFT JOIN document_fields f ON f.document_id = d.id
           WHERE lower(d.title) LIKE ?
              OR lower(coalesce(d.notes, '')) LIKE ?
              OR lower(d.original_filename) LIKE ?
              OR lower(f.value) LIKE ?
              OR lower(f.label) LIKE ?
              OR (? <> '' AND f.value_normalized LIKE ?)
           ORDER BY d.created_at DESC`,
        )
        .all(term, term, term, term, term, normalized, `%${normalized}%`) as unknown as {
        id: string;
      }[]
    ).map((row) => this.getDocument(row.id)!);
  }

  deleteDocument(id: string): boolean {
    // Fields cascade. Actions do NOT — an action keeps its due date and simply
    // loses its attachment, because deleting the paperwork does not mean the
    // filing stopped being due.
    return this.db.prepare("DELETE FROM documents WHERE id = ?").run(id).changes > 0;
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  createAction(input: NewAction, id: string): StoredAction {
    const timestamp = this.now();
    this.db
      .prepare(
        `INSERT INTO actions (id, entity_id, document_id, title, detail, due_on,
           completed_on, repeat_annually, successor_spawned, created_at, updated_at)
         VALUES (?,?,?,?,?,?,NULL,?,0,?,?)`,
      )
      .run(
        id,
        input.entityId ?? null,
        input.documentId ?? null,
        input.title,
        input.detail ?? null,
        input.dueOn,
        input.repeatAnnually ? 1 : 0,
        timestamp,
        timestamp,
      );
    return this.getAction(id)!;
  }

  getAction(id: string): StoredAction | undefined {
    const row = this.db
      .prepare("SELECT * FROM actions WHERE id = ?")
      .get(id) as unknown as Record<string, string | null> | undefined;
    if (!row) return undefined;
    return {
      id: row.id as string,
      ...(row.entity_id === null ? {} : { entityId: row.entity_id as string }),
      ...(row.document_id === null ? {} : { documentId: row.document_id as string }),
      title: row.title as string,
      ...(row.detail === null ? {} : { detail: row.detail as string }),
      dueOn: row.due_on as string,
      ...(optional(row.completed_on) === undefined
        ? {}
        : { completedOn: row.completed_on as string }),
      repeatAnnually: Number(row.repeat_annually) === 1,
      successorSpawned: Number(row.successor_spawned) === 1,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  listActions(): StoredAction[] {
    return (
      this.db
        .prepare("SELECT id FROM actions ORDER BY due_on")
        .all() as unknown as { id: string }[]
    ).map((row) => this.getAction(row.id)!);
  }

  listActionsForDocument(documentId: string): StoredAction[] {
    return (
      this.db
        .prepare("SELECT id FROM actions WHERE document_id = ? ORDER BY due_on")
        .all(documentId) as unknown as { id: string }[]
    ).map((row) => this.getAction(row.id)!);
  }

  /**
   * Mark done, or reopen with `undefined`.
   *
   * Reopening matters: someone ticks off "filed the annual report", then finds
   * the agency rejected it. Without a way back the item is gone from every
   * reminder at exactly the moment it needs to be loudest.
   */
  setActionCompleted(id: string, completedOn: string | undefined): StoredAction | undefined {
    const existing = this.getAction(id);
    if (!existing) return undefined;

    this.db
      .prepare("UPDATE actions SET completed_on = ?, updated_at = ? WHERE id = ?")
      .run(completedOn ?? null, this.now(), id);

    // Completing a repeating action creates next year's occurrence, ONCE.
    //
    // `successorSpawned` is recorded rather than inferred because
    // reopen-then-recomplete is a normal path — an agency rejects a filing, the
    // user reopens it, files again, ticks it off again — and inferring would
    // mean guessing whether some similar-looking future action was ours or
    // theirs. Guessing wrong duplicates a deadline, which erodes trust in every
    // other row on the page.
    if (completedOn !== undefined && existing.repeatAnnually && !existing.successorSpawned) {
      this.db
        .prepare("UPDATE actions SET successor_spawned = 1 WHERE id = ?")
        .run(id);
      this.createAction(
        {
          title: existing.title,
          // addYears clamps, so a 29 February deadline becomes 28 February
          // rather than sliding into March.
          dueOn: addYears(existing.dueOn, 1),
          repeatAnnually: true,
          ...(existing.detail === undefined ? {} : { detail: existing.detail }),
          ...(existing.entityId === undefined ? {} : { entityId: existing.entityId }),
          ...(existing.documentId === undefined ? {} : { documentId: existing.documentId }),
        },
        this.newId(),
      );
    }

    return this.getAction(id);
  }

  updateAction(id: string, input: NewAction): StoredAction | undefined {
    if (!this.getAction(id)) return undefined;
    this.db
      .prepare(
        `UPDATE actions SET entity_id = ?, document_id = ?, title = ?, detail = ?,
           due_on = ?, repeat_annually = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        input.entityId ?? null,
        input.documentId ?? null,
        input.title,
        input.detail ?? null,
        input.dueOn,
        input.repeatAnnually ? 1 : 0,
        this.now(),
        id,
      );
    return this.getAction(id);
  }

  deleteAction(id: string): boolean {
    return this.db.prepare("DELETE FROM actions WHERE id = ?").run(id).changes > 0;
  }
}
