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
        <label className={fieldClass}>
          <span className={labelClass}>File</span>
          <input className={inputClass} type="file" name="file" required />
          <span className={hintClass}>
            PDF, image, plain text, or Word document, up to{" "}
            {MAX_UPLOAD_BYTES / 1024 / 1024} MB.
          </span>
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>Title</span>
          <input
            className={inputClass}
            name="title"
            placeholder="WA SOS formation letter"
          />
          <span className={hintClass}>Defaults to the filename.</span>
        </label>

        {entities.length > 0 && (
          <label className={fieldClass}>
            <span className={labelClass}>Entity (optional)</span>
            <select className={inputClass} name="entityId" defaultValue="">
              <option value="">Not tied to an entity</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={fieldClass}>
          <span className={labelClass}>Reference numbers (optional)</span>
          <textarea
            className={inputClass}
            name="fields"
            rows={4}
            placeholder={"UBI Number: 604 123 456\nEIN: 91-1234567\nDUNS: 123456789"}
          />
          <span className={hintClass}>
            One per line, as <code>Label: value</code>. This is what makes a
            number findable later without opening the file — copy them straight
            off the letter.
          </span>
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>Notes (optional)</span>
          <textarea className={inputClass} name="notes" rows={2} />
        </label>

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

          <label className={fieldClass}>
            <span className={labelClass}>What needs doing</span>
            <input
              className={inputClass}
              name="actionTitle"
              list="action-suggestions"
              placeholder="File an Annual Report"
            />
            <ActionSuggestions />
          </label>

          <label className={fieldClass}>
            <span className={labelClass}>Due by</span>
            <input className={inputClass} type="date" name="dueOn" />
          </label>

          <label className={css({ display: "block", marginBottom: "3" })}>
            <input type="checkbox" name="repeatAnnually" value="true" /> Repeats
            every year
          </label>

          <label className={css({ display: "block" })}>
            <span className={labelClass}>Notes for the action (optional)</span>
            <textarea className={inputClass} name="actionDetail" rows={2} />
          </label>
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
