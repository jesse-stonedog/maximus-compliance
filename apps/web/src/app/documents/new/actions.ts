"use server";
/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/server";
import { checkUpload, newStorageKey, saveFile } from "@/lib/files";
import { parseFields } from "@/lib/parse-fields";

function fail(message: string): never {
  redirect(`/documents/new?error=${encodeURIComponent(message)}`);
}

export async function uploadDocument(form: FormData): Promise<void> {
  const file = form.get("file");
  if (!(file instanceof File)) fail("Choose a file to upload.");

  const check = checkUpload(file);
  if (!check.ok) fail(check.error!);

  const title = String(form.get("title") ?? "").trim() || file.name;
  const entityId = String(form.get("entityId") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  const dueOn = String(form.get("dueOn") ?? "").trim();
  const actionTitle = String(form.get("actionTitle") ?? "").trim();
  const actionDetail = String(form.get("actionDetail") ?? "").trim();

  // An action needs both halves or neither. A title with no date would never
  // surface in a reminder, and a date with no title is not actionable — either
  // silently does nothing, which is the worst outcome for a tracking tool.
  if (Boolean(actionTitle) !== Boolean(dueOn)) {
    fail("An action needs both a description and a date, or neither.");
  }

  const storageKey = newStorageKey(file.type);
  // Write the file BEFORE the row. A row pointing at a missing file is a broken
  // download; an orphaned file is invisible and harmless.
  await saveFile(storageKey, new Uint8Array(await file.arrayBuffer()));

  const documentId = randomUUID();
  const store = getStore();
  store.documents.createDocument(
    {
      title,
      originalFilename: file.name,
      contentType: file.type,
      byteSize: file.size,
      storageKey,
      ...(entityId ? { entityId } : {}),
      ...(notes ? { notes } : {}),
      fields: parseFields(String(form.get("fields") ?? "")),
    },
    documentId,
  );

  if (actionTitle && dueOn) {
    store.documents.createAction(
      {
        title: actionTitle,
        dueOn,
        repeatAnnually: form.get("repeatAnnually") === "true",
        documentId,
        ...(entityId ? { entityId } : {}),
        ...(actionDetail ? { detail: actionDetail } : {}),
      },
      randomUUID(),
    );
  }

  revalidatePath("/");
  revalidatePath("/documents");
  redirect("/documents");
}
