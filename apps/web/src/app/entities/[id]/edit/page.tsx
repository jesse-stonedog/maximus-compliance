/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { css } from "styled-system/css";
import { getStore } from "@/lib/server";
import { updateEntity } from "../../actions";
import { EntityFormFields } from "@/components/entity-form";
import { SubmitButton } from "@/components/submit-button";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

export default async function EditEntityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const entity = getStore().get(id);
  if (!entity) notFound();

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Edit {entity.name}</h1>

      {error && (
        <p role="alert" style={{ color: "var(--maximus-text-error-text)" }}>
          {error}
        </p>
      )}

      <form action={updateEntity}>
        <input type="hidden" name="id" value={entity.id} />
        <EntityFormFields entity={entity} />
        <SubmitButton>Save changes</SubmitButton> <Link href="/">Cancel</Link>
      </form>

      <p className={css({ marginTop: "8", fontSize: "sm" })}>
        <Link href={`/entities/${entity.id}/delete`}>Delete this entity</Link>
      </p>

      <Disclaimer />
    </main>
  );
}
