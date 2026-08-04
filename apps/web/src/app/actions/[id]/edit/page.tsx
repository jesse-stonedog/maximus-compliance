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
} from "@/components/action-fields";
import {
  StyledFormLabel,
  StyledInputText,
  StyledInputTextArea,
  StyledInputBool,
  StyledInputSelect,
} from "@optima/ui";
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
        <p role="alert" style={{ color: "var(--optima-text-error-text)" }}>
          {error}
        </p>
      )}

      <form action={updateActionById}>
        <input type="hidden" name="id" value={action.id} />

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="action-title" required>
            What needs doing
          </StyledFormLabel>
          <StyledInputText
            id="action-title"
            name="title"
            list="action-suggestions"
            required
            defaultValue={action.title}
          />
          <ActionSuggestions />
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="action-due-on" required>
            Due by
          </StyledFormLabel>
          <StyledInputText
            id="action-due-on"
            type="date"
            name="dueOn"
            required
            defaultValue={action.dueOn}
          />
        </div>

        <div className={css({ marginBottom: "4" })}>
          <StyledInputBool
            name="repeatAnnually"
            value="true"
            defaultChecked={action.repeatAnnually}
            label="Repeats every year"
            aria-describedby="action-repeat-hint"
          />
          <span className={hintClass} id="action-repeat-hint">
            {action.successorSpawned
              ? "Next year's has already been created — turning this off will not remove it."
              : "When you mark this done, next year's is created for you."}
          </span>
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="action-detail" optional>
            Notes
          </StyledFormLabel>
          <StyledInputTextArea
            id="action-detail"
            name="detail"
            rows={3}
            defaultValue={action.detail ?? ""}
          />
        </div>

        {entities.length > 0 && (
          <div className={fieldClass}>
            <StyledFormLabel htmlFor="action-entity" optional>
              Entity
            </StyledFormLabel>
            <StyledInputSelect
              id="action-entity"
              name="entityId"
              defaultValue={action.entityId ?? ""}
              placeholder="Not tied to an entity"
              options={entities.map((entity) => ({
                value: entity.id,
                label: entity.name,
              }))}
            />
          </div>
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
