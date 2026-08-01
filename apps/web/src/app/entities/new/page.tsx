/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import Link from "next/link";
import { css } from "styled-system/css";
import { ENTITY_TYPES } from "@maximus/engine";
import { createEntity } from "./actions";
import { entityTypeLabel } from "@/lib/format";
import { Disclaimer } from "@/components/disclaimer";

export const dynamic = "force-dynamic";

const field = css({ marginBottom: "4", display: "block" });
const label = css({ display: "block", fontWeight: "600", marginBottom: "1" });
const input = css({
  width: "full",
  padding: "2",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "boxBorderSecondary",
  fontSize: "md",
});
const hint = css({ fontSize: "sm", color: "boxTextSecondary", marginTop: "1" });

export default async function NewEntityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className={css({ maxWidth: "3xl", margin: "0 auto", padding: "6" })}>
      <h1 className={css({ fontSize: "2xl" })}>Add an entity</h1>

      {error && (
        <p
          role="alert"
          className={css({ padding: "3", borderRadius: "sm" })}
          style={{
            background: "var(--maximus-box-info-bg)",
            color: "var(--maximus-text-error-text)",
          }}
        >
          {error}
        </p>
      )}

      <form action={createEntity}>
        <label className={field}>
          <span className={label}>Name</span>
          <input className={input} name="name" required autoFocus />
        </label>

        <fieldset className={css({ marginBottom: "4", border: "none", padding: "0" })}>
          <legend className={label}>Legal form</legend>
          <p className={hint}>
            Pick every form this entity holds. A 501(c)(3) is almost always also
            a nonprofit corporation — state and federal rules key off different
            ones, so selecting both is usually correct.
          </p>
          {ENTITY_TYPES.map((type) => (
            <label key={type} className={css({ display: "block", marginTop: "1" })}>
              <input type="checkbox" name="entityTypes" value={type} />{" "}
              {entityTypeLabel(type)}
            </label>
          ))}
        </fieldset>

        <label className={field}>
          <span className={label}>Date formed</span>
          <input className={input} type="date" name="formedOn" required />
          <span className={hint}>
            Most state annual reports are due in the anniversary month of this
            date, so it needs to be right.
          </span>
        </label>

        <label className={field}>
          <span className={label}>Home jurisdiction</span>
          <input
            className={input}
            name="homeJurisdiction"
            placeholder="US-WA"
            pattern="US-[A-Z]{2}"
            required
          />
          <span className={hint}>The state it was formed in, e.g. US-WA.</span>
        </label>

        <label className={field}>
          <span className={label}>Registered in</span>
          <input
            className={input}
            name="jurisdictions"
            placeholder="US, US-WA"
            required
          />
          <span className={hint}>
            Comma-separated. Include <code>US</code> for federal filings and
            every state you are registered in — registering in a state is what
            creates the obligation to it.
          </span>
        </label>

        <label className={field}>
          <span className={label}>Fiscal year ends</span>
          <input
            className={input}
            name="fiscalYearEnd"
            placeholder="12-31"
            pattern="\d{2}-\d{2}"
            defaultValue="12-31"
            required
          />
          <span className={hint}>
            MM-DD. The federal return is due five months after this, so a
            non-calendar year changes the date.
          </span>
        </label>

        <label className={field}>
          <span className={label}>Gross annual revenue (optional)</span>
          <input className={input} type="number" name="grossRevenue" min="0" step="0.01" />
          <span className={hint}>
            In dollars. <strong>Leave blank if you do not know</strong> — an
            unknown is reported as “cannot tell yet”, whereas a guess is
            reported as an answer.
          </span>
        </label>

        <label className={field}>
          <span className={label}>Total assets (optional)</span>
          <input className={input} type="number" name="totalAssets" min="0" step="0.01" />
        </label>

        <label className={field}>
          <span className={label}>Charitable assets (optional)</span>
          <input
            className={input}
            type="number"
            name="charitableAssets"
            min="0"
            step="0.01"
          />
          <span className={hint}>
            The portion held for charitable purposes — <strong>not the same as
            total assets</strong>. Several states require charity registration
            above a threshold on this figure alone, even for an organisation
            that never asks the public for money.
          </span>
        </label>

        <label className={css({ display: "block", marginBottom: "6" })}>
          <input type="checkbox" name="solicits" value="true" /> This
          organisation solicits charitable contributions
          <span className={hint}>
            Charity registration is a separate obligation from the corporate
            annual report, and it is the one most often missed.
          </span>
        </label>

        <button
          type="submit"
          className={css({
            padding: "3",
            paddingInline: "5",
            borderRadius: "sm",
            border: "none",
            fontSize: "md",
            cursor: "pointer",
            // 44px minimum touch target, WCAG 2.2 AA.
            minHeight: "44px",
          })}
          style={{
            background: "var(--maximus-button-primary-bg)",
            color: "var(--maximus-button-primary-text)",
          }}
        >
          Add entity
        </button>{" "}
        <Link href="/">Cancel</Link>
      </form>

      <Disclaimer />
    </main>
  );
}
