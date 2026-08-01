"use server";
/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore, today } from "@/lib/server";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createStandaloneAction(form: FormData): Promise<void> {
  const title = String(form.get("title") ?? "").trim();
  const dueOn = String(form.get("dueOn") ?? "").trim();
  const detail = String(form.get("detail") ?? "").trim();
  const entityId = String(form.get("entityId") ?? "").trim();
  const documentId = String(form.get("documentId") ?? "").trim();

  if (!title) redirect("/actions/new?error=" + encodeURIComponent("Describe what needs doing."));
  if (!DATE.test(dueOn)) {
    redirect("/actions/new?error=" + encodeURIComponent("Give a due date."));
  }

  getStore().documents.createAction(
    {
      title,
      dueOn,
      repeatAnnually: form.get("repeatAnnually") === "true",
      ...(detail ? { detail } : {}),
      ...(entityId ? { entityId } : {}),
      ...(documentId ? { documentId } : {}),
    },
    randomUUID(),
  );
  revalidatePath("/");
  revalidatePath("/documents");
  redirect("/");
}

/**
 * Toggle completion.
 *
 * Reopening is supported on purpose: someone ticks off "filed the annual
 * report", then the agency rejects it. Without a way back the item disappears
 * from every reminder at exactly the moment it needs to be loudest.
 */
export async function toggleActionCompleted(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const completed = form.get("completed") === "true";
  getStore().documents.setActionCompleted(id, completed ? undefined : today());
  revalidatePath("/");
  revalidatePath("/documents");
}

export async function deleteAction(form: FormData): Promise<void> {
  getStore().documents.deleteAction(String(form.get("id") ?? ""));
  revalidatePath("/");
  revalidatePath("/documents");
}
