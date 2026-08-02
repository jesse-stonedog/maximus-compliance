/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { css } from "styled-system/css";
import { getStore } from "@/lib/server";
import { deleteEntity } from "../../actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function DeleteEntityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const entity = store.get(id);
  if (!entity) notFound();

  /*
   * Count what goes with it, and say so.
   *
   * The two behave differently and a user cannot be expected to know which:
   * actions cascade because an action about an entity is meaningless without
   * it, while documents merely detach because the paperwork still exists and
   * still holds reference numbers worth keeping.
   */
  const doomedActions = store.documents
    .listActions()
    .filter((a) => a.entityId === entity.id);
  const detachingDocuments = store.documents
    .listDocuments()
    .filter((d) => d.entityId === entity.id);

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Delete {entity.name}?</h1>

      <div
        className={css({ padding: "4", borderRadius: "md", marginBottom: "4" })}
        style={{
          background: "var(--maximus-box-info-bg)",
          borderLeft: "4px solid var(--maximus-text-error-text)",
        }}
      >
        <p className={css({ marginTop: "0" })}>
          <strong>This cannot be undone.</strong>
        </p>
        <ul>
          <li>
            {doomedActions.length === 0
              ? "No actions are attached, so none will be deleted."
              : `${doomedActions.length} action${doomedActions.length === 1 ? "" : "s"} attached to this entity will also be deleted.`}
          </li>
          <li>
            {detachingDocuments.length === 0
              ? "No documents are attached."
              : `${detachingDocuments.length} document${detachingDocuments.length === 1 ? "" : "s"} will be KEPT — they are only detached from this entity, and their files and reference numbers stay.`}
          </li>
        </ul>
        {doomedActions.length > 0 && (
          <ul className={css({ fontSize: "sm" })}>
            {doomedActions.map((a) => (
              <li key={a.id}>
                {a.title} — due {a.dueOn}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={deleteEntity}>
        <input type="hidden" name="id" value={entity.id} />
        <SubmitButton tone="danger">Delete {entity.name}</SubmitButton>{" "}
        <Link href={`/entities/${entity.id}/edit`}>Cancel</Link>
      </form>
    </main>
  );
}
