/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { StyledCalendarAdd, StyledForm } from "@maximus/ui";
import { getStore } from "@/lib/server";
import { formatDate } from "@/lib/format";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const store = getStore();
  const documents = store.documents.searchDocuments(q);

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
      </form>

      <p>
        <Link href="/documents/new">Upload a document</Link> ·{" "}
        <Link href="/actions/new">Add an action without a document</Link>
      </p>

      {documents.length === 0 ? (
        <p className={css({ padding: "6", color: "boxTextSecondary" })}>
          {q ? (
            <>
              Nothing matches <strong>{q}</strong>.
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
                  {document.originalFilename} · {formatBytes(document.byteSize)} ·
                  added {formatDate(document.createdAt.slice(0, 10))}
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
                  </Link>
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
