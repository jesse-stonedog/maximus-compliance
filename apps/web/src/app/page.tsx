/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { StyledCalendar, StyledEntity } from "@maximus/ui";
import { allCalendars, includeDraft, today } from "@/lib/server";
import { ObligationTable } from "@/components/obligation-table";
import { Disclaimer } from "@/components/disclaimer";
import { DraftBanner } from "@/components/draft-banner";
import { entityTypeLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const asOf = today();
  const calendars = allCalendars(asOf);

  return (
    <main className={css({ maxWidth: "5xl", margin: "0 auto", padding: "6" })}>
      <header className={css({ marginBottom: "6" })}>
        <h1 className={css({ fontSize: "3xl", margin: "0" })}>
          <StyledCalendar /> Compliance calendar
        </h1>
        <p className={css({ color: "boxTextSecondary", marginTop: "1" })}>
          What your entities owe, as of {asOf}.
        </p>
      </header>

      {includeDraft() && <DraftBanner />}

      {calendars.length === 0 ? (
        <section className={css({ padding: "8", textAlign: "center" })}>
          <p className={css({ fontSize: "lg" })}>No entities yet.</p>
          <p className={css({ color: "boxTextSecondary" })}>
            Add one to see what it owes and when.
          </p>
          <Link href="/entities/new">Add an entity</Link>
        </section>
      ) : (
        calendars.map(({ entity, result }) => (
          <section key={entity.id} className={css({ marginBottom: "8" })}>
            <h2 className={css({ fontSize: "xl", marginBottom: "1" })}>
              <StyledEntity /> {entity.name}
            </h2>
            <p
              className={css({
                fontSize: "sm",
                color: "boxTextSecondary",
                marginTop: "0",
              })}
            >
              {entity.entityTypes.map(entityTypeLabel).join(" · ")} · formed{" "}
              {entity.formedOn}
            </p>
            <ObligationTable result={result} asOf={asOf} />
          </section>
        ))
      )}

      <Disclaimer />
    </main>
  );
}
