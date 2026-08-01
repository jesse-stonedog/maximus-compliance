"use server";
/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/server";
import { parseEntityForm } from "@/lib/parse-entity";

export async function createEntity(form: FormData): Promise<void> {
  const parsed = parseEntityForm(form);

  if (!parsed.ok) {
    // Back to the form with the reason, rather than a generic failure. The
    // fields most likely to be wrong (jurisdiction codes, fiscal year end) are
    // exactly the ones a first-time user has never typed before.
    redirect(`/entities/new?error=${encodeURIComponent(parsed.error)}`);
  }

  getStore().create(parsed.facts, randomUUID());
  revalidatePath("/");
  redirect("/");
}
