/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { css } from "styled-system/css";
import { getStore } from "@/lib/server";
import { deleteActionById, updateActionById } from "../../actions";
import {
  ActionSuggestions,
  fieldClass,
  hintClass,
  inputClass,
  labelClass,
} from "@/components/action-fields";
import { SubmitButton } from "@/components/submit-button";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

export default async function EditActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const store = getStore();
  const action = store.documents.getAction(id);
  if (!action) notFound();
  const entities = store.list();

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Edit action</h1>

      {error && (
        <p role="alert" style={{ color: "var(--maximus-text-error-text)" }}>
          {error}
        </p>
      )}

      <form action={updateActionById}>
        <input type="hidden" name="id" value={action.id} />

        <label className={fieldClass}>
          <span className={labelClass}>What needs doing</span>
          <input
            className={inputClass}
            name="title"
            list="action-suggestions"
            required
            defaultValue={action.title}
          />
          <ActionSuggestions />
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>Due by</span>
          <input
            className={inputClass}
            type="date"
            name="dueOn"
            required
            defaultValue={action.dueOn}
          />
        </label>

        <label className={css({ display: "block", marginBottom: "4" })}>
          <input
            type="checkbox"
            name="repeatAnnually"
            value="true"
            defaultChecked={action.repeatAnnually}
          />{" "}
          Repeats every year
          <span className={hintClass}>
            {action.successorSpawned
              ? "Next year's has already been created — turning this off will not remove it."
              : "When you mark this done, next year's is created for you."}
          </span>
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>Notes (optional)</span>
          <textarea
            className={inputClass}
            name="detail"
            rows={3}
            defaultValue={action.detail ?? ""}
          />
        </label>

        {entities.length > 0 && (
          <label className={fieldClass}>
            <span className={labelClass}>Entity (optional)</span>
            <select className={inputClass} name="entityId" defaultValue={action.entityId ?? ""}>
              <option value="">Not tied to an entity</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <SubmitButton>Save changes</SubmitButton> <Link href="/">Cancel</Link>
      </form>

      {/* Separate form: a delete button inside the edit form would submit the
          edit's fields, and one stray Enter keypress in a text input would
          destroy the record instead of saving it. */}
      <form action={deleteActionById} className={css({ marginTop: "8" })}>
        <input type="hidden" name="id" value={action.id} />
        <SubmitButton tone="danger">Delete this action</SubmitButton>
        <span className={hintClass}>
          Only this occurrence. {action.successorSpawned && "Next year's stays."}
        </span>
      </form>

      <Disclaimer />
    </main>
  );
}
