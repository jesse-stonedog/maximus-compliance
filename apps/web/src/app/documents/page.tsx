/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_INFO,
  isDocumentType,
} from "@optima/engine";
import { StyledCalendarAdd, StyledForm } from "@optima/ui";
import { getStore } from "@/lib/server";
import { formatDate } from "@/lib/format";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Preserves the search term across a filter change, and vice versa. */
function hrefFor(query: string, type?: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type) params.set("type", type);
  const search = params.toString();
  return search ? `/documents?${search}` : "/documents";
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      // `aria-current` is what tells a screen reader which filter is applied.
      // The visual weight below says it to everyone else; neither alone is
      // enough, and colour alone would be WCAG 1.4.1.
      aria-current={active ? "true" : undefined}
      className={css({
        padding: "1",
        paddingInline: "3",
        borderRadius: "sm",
        border: "1px solid",
        borderColor: "boxBorderSecondary",
        textDecoration: "none",
        _currentPage: { fontWeight: "700", borderColor: "boxBorderAccent" },
      })}
    >
      {label}
    </Link>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type: rawType } = await searchParams;
  // An unrecognised `?type=` in the URL shows everything rather than nothing.
  // A hand-edited or stale link returning an empty list reads as "you have no
  // documents", which is a far worse answer than ignoring the filter.
  const type = isDocumentType(rawType) ? rawType : undefined;
  const store = getStore();
  const documents = store.documents.searchDocuments(q, type);
  const counts = store.documents.countDocumentsByType();

  return (
    <main className={css({ maxWidth: "5xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>
        <StyledForm /> Documents
      </h1>
      <p className={css({ color: "boxTextSecondary" })}>
        Your paperwork in one place. A document does not need an action — storing
        it so you can find a reference number later is reason enough.
      </p>

      <form className={css({ marginBlock: "4" })}>
        <label>
          <span className={css({ srOnly: true })}>Search documents</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Search titles, notes, or reference numbers (UBI, DUNS, EIN)…"
            className={css({
              width: "full",
              padding: "2",
              fontSize: "md",
              borderRadius: "sm",
              border: "1px solid",
              borderColor: "boxBorderSecondary",
            })}
          />
        </label>
        {/*
          The type carries through the search as a hidden field, so searching
          inside a filtered view keeps the filter. Without it, typing in the box
          would silently widen the results back to everything.
        */}
        {type && <input type="hidden" name="type" value={type} />}
      </form>

      {/*
        Links rather than a <select>: the filter belongs in the URL so a
        filtered view is linkable and survives a refresh, and links work with
        JavaScript off, which the self-hosted tier cannot assume.

        `nav` with a label so a screen reader can skip the list or find it by
        name — six sibling links are noise otherwise.
      */}
      <nav
        aria-label="Filter by document type"
        className={css({
          display: "flex",
          flexWrap: "wrap",
          gap: "2",
          marginBlock: "3",
          fontSize: "sm",
        })}
      >
        <FilterLink label="All" href={hrefFor(q)} active={type === undefined} />
        {DOCUMENT_TYPES.map((value) => (
          <FilterLink
            key={value}
            label={`${DOCUMENT_TYPE_INFO[value].label} (${counts[value]})`}
            href={hrefFor(q, value)}
            active={type === value}
          />
        ))}
      </nav>

      <p>
        <Link href="/documents/new">Upload a document</Link> ·{" "}
        <Link href="/actions/new">Add an action without a document</Link>
      </p>

      {documents.length === 0 ? (
        <p className={css({ padding: "6", color: "boxTextSecondary" })}>
          {/*
            The filter has to be named in the empty state. "No documents yet"
            under an active filter is simply false, and it is the message most
            likely to make someone think they lost their paperwork.
          */}
          {q && type ? (
            <>
              Nothing in {DOCUMENT_TYPE_INFO[type].label} matches{" "}
              <strong>{q}</strong>. <Link href={hrefFor(q)}>Search all types</Link>.
            </>
          ) : q ? (
            <>
              Nothing matches <strong>{q}</strong>.
            </>
          ) : type ? (
            <>
              No documents filed as {DOCUMENT_TYPE_INFO[type].label} yet.{" "}
              <Link href="/documents">Show all documents</Link>.
            </>
          ) : (
            "No documents yet."
          )}
        </p>
      ) : (
        <ul className={css({ listStyle: "none", padding: "0" })}>
          {documents.map((document) => {
            const actions = store.documents.listActionsForDocument(document.id);
            return (
              <li
                key={document.id}
                className={css({
                  padding: "4",
                  marginBottom: "3",
                  borderRadius: "md",
                  border: "1px solid",
                  borderColor: "boxBorderPrimary",
                })}
              >
                <div className={css({ fontWeight: "600", fontSize: "lg" })}>
                  <a href={`/documents/${document.id}`}>{document.title}</a>
                </div>
                <div className={css({ fontSize: "sm", color: "boxTextSecondary" })}>
                  {DOCUMENT_TYPE_INFO[document.type].label} ·{" "}
                  {document.originalFilename} · {formatBytes(document.byteSize)} ·{" "}
                  {/*
                    Says WHICH date it is showing. "Newest first" means the
                    meeting for minutes and the upload for a determination
                    letter, and a bare date in a mixed list would silently mean
                    two different things.
                  */}
                  {document.documentDate
                    ? `dated ${formatDate(document.documentDate)}`
                    : `added ${formatDate(document.createdAt.slice(0, 10))}`}
                </div>
                {document.notes && (
                  <p className={css({ fontSize: "sm", marginTop: "2" })}>{document.notes}</p>
                )}

                {document.fields.length > 0 && (
                  <dl
                    className={css({
                      fontSize: "sm",
                      marginTop: "2",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "1",
                    })}
                  >
                    {document.fields.map((f) => (
                      <div key={f.id} style={{ display: "contents" }}>
                        <dt className={css({ fontWeight: "600", paddingRight: "3" })}>
                          {f.label}
                        </dt>
                        {/* Selectable and monospaced: these get copied into
                            government forms, where a transcription error is
                            expensive. */}
                        <dd className={css({ margin: "0", fontFamily: "mono" })}>
                          {f.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {actions.length > 0 && (
                  <ul className={css({ fontSize: "sm", marginTop: "2" })}>
                    {actions.map((a) => (
                      <li key={a.id}>
                        <StyledCalendarAdd /> {a.title} — due {formatDate(a.dueOn)}
                        {a.completedOn ? ` (done ${formatDate(a.completedOn)})` : ""}
                      </li>
                    ))}
                  </ul>
                )}

                <p className={css({ fontSize: "sm", marginTop: "2" })}>
                  <Link href={`/actions/new?documentId=${document.id}`}>
                    Add an action for this document
                  </Link>{" "}
                  · <Link href={`/documents/${document.id}/delete`}>Delete</Link>
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <p>
        <Link href="/">Back to the calendar</Link>
      </p>
      <Disclaimer />
    </main>
  );
}
