/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { getStore } from "@/lib/server";
import { createStandaloneAction } from "../actions";
import {
  ActionSuggestions,
  fieldClass,
  hintClass,
  inputClass,
  labelClass,
} from "@/components/action-fields";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

export default async function NewActionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; documentId?: string }>;
}) {
  const { error, documentId } = await searchParams;
  const store = getStore();
  const entities = store.list();
  const document = documentId ? store.documents.getDocument(documentId) : undefined;

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Add an action</h1>
      <p className={css({ color: "boxTextSecondary" })}>
        Anything you need to do by a date. Use this for whatever the rules do not
        cover — or for everything, if you would rather keep your own dates.
      </p>

      {error && (
        <p role="alert" style={{ color: "var(--maximus-text-error-text)" }}>
          {error}
        </p>
      )}

      <form action={createStandaloneAction}>
        {document && <input type="hidden" name="documentId" value={document.id} />}
        {document && (
          <p className={hintClass}>
            Attached to <strong>{document.title}</strong>.
          </p>
        )}

        <label className={fieldClass}>
          <span className={labelClass}>What needs doing</span>
          <input
            className={inputClass}
            name="title"
            list="action-suggestions"
            placeholder="File an Annual Report"
            required
            autoFocus
          />
          <ActionSuggestions />
          <span className={hintClass}>
            Suggestions are a starting point — type anything.
          </span>
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>Due by</span>
          <input className={inputClass} type="date" name="dueOn" required />
        </label>

        <label className={fieldClass}>
          <span className={labelClass}>Notes (optional)</span>
          <textarea className={inputClass} name="detail" rows={3} />
          <span className={hintClass}>
            Where to file, a login, a reference number — whatever you will want in
            front of you on the day.
          </span>
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
          Add action
        </button>{" "}
        <Link href="/">Cancel</Link>
      </form>
      <Disclaimer />
    </main>
  );
}
