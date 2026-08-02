/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { css } from "styled-system/css";
import { getStore } from "@/lib/server";
import { deleteDocument } from "../../actions";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function DeleteDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = getStore();
  const document = store.documents.getDocument(id);
  if (!document) notFound();

  const attachedActions = store.documents.listActionsForDocument(id);

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Delete {document.title}?</h1>

      <div
        className={css({ padding: "4", borderRadius: "md", marginBottom: "4" })}
        style={{
          background: "var(--optima-box-info-bg)",
          borderLeft: "4px solid var(--optima-text-error-text)",
        }}
      >
        <p className={css({ marginTop: "0" })}>
          <strong>This deletes the file itself, and cannot be undone.</strong>
        </p>
        <ul>
          <li>
            {document.originalFilename} will be removed from storage permanently.
          </li>
          {document.fields.length > 0 && (
            <li>
              {document.fields.length} reference number
              {document.fields.length === 1 ? "" : "s"} recorded on it will be
              lost — {document.fields.map((f) => f.label).join(", ")}.
            </li>
          )}
          <li>
            {attachedActions.length === 0
              ? "No actions are attached."
              : `${attachedActions.length} action${attachedActions.length === 1 ? "" : "s"} will be KEPT — deleting the paperwork does not mean the filing stopped being due. They simply lose their attachment.`}
          </li>
        </ul>
      </div>

      <form action={deleteDocument}>
        <input type="hidden" name="id" value={document.id} />
        <SubmitButton tone="danger">Delete this document</SubmitButton>{" "}
        <Link href="/documents">Cancel</Link>
      </form>
    </main>
  );
}
