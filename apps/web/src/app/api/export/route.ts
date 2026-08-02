/**
 * Calendar and spreadsheet export.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { toCsv, toICalendar } from "@maximus/export";
import { allCalendars, today } from "@/lib/server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") ?? "ics";
  const asOf = today();
  const obligations = allCalendars(asOf).flatMap((c) => c.result.obligations);

  if (format === "csv") {
    return new Response(toCsv(obligations), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="optima-${asOf}.csv"`,
      },
    });
  }

  return new Response(
    toICalendar(obligations, {
      // asOf, not the clock, so re-downloading the same day yields a
      // byte-identical file. The UID is what makes a re-import update the
      // user's events rather than duplicating them; a moving DTSTAMP would not
      // break that, but a stable file is easier to reason about and to diff.
      dtstamp: `${asOf.replaceAll("-", "")}T000000Z`,
      calendarName: "Optima compliance",
      reminderDaysBefore: [30, 7],
    }),
    {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="optima-${asOf}.ics"`,
      },
    },
  );
}
