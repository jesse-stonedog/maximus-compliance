/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { getStore } from "@/lib/server";
import { uploadDocument } from "./actions";
import { MAX_UPLOAD_BYTES } from "@/lib/files";
import {
  ActionSuggestions,
  fieldClass,
  hintClass,
  inputClass,
  labelClass,
} from "@/components/action-fields";
import {
  StyledFormLabel,
  StyledInputText,
  StyledInputTextArea,
  StyledInputBool,
} from "@maximus/ui";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const entities = getStore().list();

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Upload a document</h1>

      {error && (
        <p role="alert" style={{ color: "var(--maximus-text-error-text)" }}>
          {error}
        </p>
      )}

      <form action={uploadDocument}>
        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-file" required>
            File
          </StyledFormLabel>
          {/* A native file input, deliberately. hopper-style has no file
              control, and styling one to look like a text field is how you get
              a picker that does not behave like either. */}
          <input
            id="doc-file"
            className={inputClass}
            type="file"
            name="file"
            required
            aria-describedby="doc-file-hint"
          />
          <span className={hintClass} id="doc-file-hint">
            PDF, image, plain text, or Word document, up to{" "}
            {MAX_UPLOAD_BYTES / 1024 / 1024} MB.
          </span>
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-title">Title</StyledFormLabel>
          <StyledInputText
            id="doc-title"
            name="title"
            placeholder="WA SOS formation letter"
            aria-describedby="doc-title-hint"
          />
          <span className={hintClass} id="doc-title-hint">Defaults to the filename.</span>
        </div>

        {entities.length > 0 && (
          <div className={fieldClass}>
            <StyledFormLabel htmlFor="doc-entity" optional>
              Entity
            </StyledFormLabel>
            <select id="doc-entity" className={inputClass} name="entityId" defaultValue="">
              <option value="">Not tied to an entity</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-fields" optional>
            Reference numbers
          </StyledFormLabel>
          <StyledInputTextArea
            id="doc-fields"
            name="fields"
            rows={4}
            placeholder={"UBI Number: 604 123 456\nEIN: 91-1234567\nDUNS: 123456789"}
            aria-describedby="doc-fields-hint"
          />
          <span className={hintClass} id="doc-fields-hint">
            One per line, as <code>Label: value</code>. This is what makes a
            number findable later without opening the file — copy them straight
            off the letter.
          </span>
        </div>

        <div className={fieldClass}>
          <StyledFormLabel htmlFor="doc-notes" optional>
            Notes
          </StyledFormLabel>
          <StyledInputTextArea id="doc-notes" name="notes" rows={2} />
        </div>

        <fieldset
          className={css({
            border: "1px solid",
            borderColor: "boxBorderPrimary",
            borderRadius: "md",
            padding: "4",
            marginBottom: "4",
          })}
        >
          <legend className={labelClass}>Does this need an action? (optional)</legend>
          <p className={hintClass}>
            Leave blank to just file the document away. Storing something so you
            can find it later is a perfectly good reason to upload it.
          </p>

          <div className={fieldClass}>
            <StyledFormLabel htmlFor="doc-action-title">What needs doing</StyledFormLabel>
            <StyledInputText
              id="doc-action-title"
              name="actionTitle"
              list="action-suggestions"
              placeholder="File an Annual Report"
            />
            <ActionSuggestions />
          </div>

          <div className={fieldClass}>
            <StyledFormLabel htmlFor="doc-action-due-on">Due by</StyledFormLabel>
            <StyledInputText id="doc-action-due-on" type="date" name="dueOn" />
          </div>

          <div className={css({ marginBottom: "3" })}>
            <StyledInputBool
              name="repeatAnnually"
              value="true"
              label="Repeats every year"
            />
          </div>

          <div>
            <StyledFormLabel htmlFor="doc-action-detail" optional>
              Notes for the action
            </StyledFormLabel>
            <StyledInputTextArea id="doc-action-detail" name="actionDetail" rows={2} />
          </div>
        </fieldset>

        <button
          type="submit"
          className={css({
            padding: "3",
            paddingInline: "5",
            borderRadius: "sm",
            border: "none",
            fontSize: "md",
            cursor: "pointer",
            minHeight: "44px",
          })}
          style={{
            background: "var(--maximus-button-primary-bg)",
            color: "var(--maximus-button-primary-text)",
          }}
        >
          Upload
        </button>{" "}
        <Link href="/documents">Cancel</Link>
      </form>
      <Disclaimer />
    </main>
  );
}
