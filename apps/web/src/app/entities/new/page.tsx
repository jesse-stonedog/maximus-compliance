/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { createEntity } from "./actions";
import { EntityFormFields } from "@/components/entity-form";
import { SubmitButton } from "@/components/submit-button";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

export default async function NewEntityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Add an entity</h1>

      {error && (
        <p
          role="alert"
          className={css({ padding: "3", borderRadius: "sm" })}
          style={{
            background: "var(--optima-box-info-bg)",
            color: "var(--optima-text-error-text)",
          }}
        >
          {error}
        </p>
      )}

      <form action={createEntity}>
        {/* Same component as the edit page, so a field cannot exist on one and
            not the other — and the ones most likely to be missed are the
            optional ones, which is where "I cannot clear this" bugs live. */}
        <EntityFormFields />
        <SubmitButton>Add entity</SubmitButton> <Link href="/">Cancel</Link>
      </form>

      <Disclaimer />
    </main>
  );
}
