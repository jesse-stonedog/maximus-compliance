/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { StyledCalendar, StyledEntity, StyledForm } from "@maximus/ui";
import { getStore, includeDraft, today } from "@/lib/server";
import { mergedCalendar } from "@/lib/calendar";
import { WindowList } from "@/components/window-list";
import { Disclaimer } from "@/components/disclaimer";
import { DraftBanner } from "@/components/draft-banner";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const asOf = today();
  const { bucketed, indeterminate } = mergedCalendar(asOf);
  const store = getStore();
  const entityCount = store.list().length;
  const documentCount = store.documents.listDocuments().length;

  return (
    <main className={css({ maxWidth: "5xl", margin: "0 auto", padding: "6" })}>
      <header className={css({ marginBottom: "6" })}>
        <h1 className={css({ fontSize: "3xl", margin: "0" })}>
          <StyledCalendar /> Compliance calendar
        </h1>
        <p className={css({ color: "boxTextSecondary", marginTop: "1" })}>
          Everything with a date, as of {asOf} — what the rules say you owe, and
          whatever you are tracking yourself.
        </p>
        <nav className={css({ marginTop: "2", fontSize: "sm" })}>
          <Link href="/actions/new">Add an action</Link> ·{" "}
          <Link href="/documents/new">Upload a document</Link> ·{" "}
          <Link href="/documents">
            <StyledForm /> Documents ({documentCount})
          </Link>{" "}
          ·{" "}
          <Link href="/entities/new">
            <StyledEntity /> Add an entity ({entityCount})
          </Link>
        </nav>
      </header>

      {includeDraft() && <DraftBanner />}

      <WindowList bucketed={bucketed} asOf={asOf} />

      {indeterminate.length > 0 && (
        <section
          className={css({ marginTop: "6", padding: "4", borderRadius: "md" })}
          style={{ background: "var(--optima-box-info-bg)" }}
        >
          <h2 className={css({ fontSize: "lg", marginTop: "0" })}>Cannot tell yet</h2>
          <p className={css({ fontSize: "sm", marginTop: "1" })}>
            These rules depend on facts an entity has not recorded. They have no
            date, so they cannot appear above — but they are not ruled out either.
          </p>
          <ul className={css({ fontSize: "sm" })}>
            {indeterminate.map((rule) => (
              <li key={`${rule.entityName}-${rule.ruleId}`}>
                <strong>{rule.title}</strong> ({rule.jurisdiction}) for{" "}
                {rule.entityName} — needs {rule.missingFacts.join(", ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {store.list().length > 0 && (
        <section className={css({ marginTop: "8" })}>
          <h2 className={css({ fontSize: "lg" })}>Entities</h2>
          <ul className={css({ listStyle: "none", padding: "0" })}>
            {store.list().map((entity) => (
              <li key={entity.id} className={css({ paddingBlock: "1" })}>
                <StyledEntity /> {entity.name}{" "}
                <span className={css({ fontSize: "sm", color: "boxTextSecondary" })}>
                  formed {entity.formedOn}
                </span>{" "}
                <Link href={`/entities/${entity.id}/edit`}>Edit</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Disclaimer />
    </main>
  );
}
