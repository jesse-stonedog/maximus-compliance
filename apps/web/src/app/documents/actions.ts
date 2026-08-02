"use server";
/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/server";
import { deleteStoredFile } from "@/lib/files";

export async function deleteDocument(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const store = getStore();
  const document = store.documents.getDocument(id);

  if (document) {
    // Row first, then the file. If the unlink fails we have at worst an
    // orphaned blob; deleting the file first and then failing to delete the row
    // would leave a listing entry whose download 410s forever.
    store.documents.deleteDocument(id);
    await deleteStoredFile(document.storageKey);
  }

  revalidatePath("/");
  revalidatePath("/documents");
  redirect("/documents");
}
