"use server";
/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/server";
import { parseEntityForm } from "@/lib/parse-entity";

export async function updateEntity(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  const parsed = parseEntityForm(form);

  if (!parsed.ok) {
    redirect(`/entities/${id}/edit?error=${encodeURIComponent(parsed.error)}`);
  }

  if (!getStore().update(id, parsed.facts)) {
    redirect(`/?error=${encodeURIComponent("That entity no longer exists.")}`);
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteEntity(form: FormData): Promise<void> {
  getStore().delete(String(form.get("id") ?? ""));
  revalidatePath("/");
  revalidatePath("/documents");
  redirect("/");
}
