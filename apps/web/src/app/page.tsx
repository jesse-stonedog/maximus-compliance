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
  const bucketed = mergedCalendar(asOf);
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

      <Disclaimer />
    </main>
  );
}
