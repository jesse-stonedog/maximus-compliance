/**
 * The entity form, shared by create and edit.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * One component on purpose. When the create and edit forms were separate, a
 * field added to one could silently not exist on the other — and the field most
 * likely to be missed is an optional one, which is exactly where "I cannot
 * clear this value" bugs live.
 */
import { ENTITY_TYPES } from "@maximus/engine";
import type { StoredEntity } from "@maximus/db";
import { css } from "styled-system/css";
import { entityTypeLabel } from "@/lib/format";
import { fieldClass, hintClass, inputClass, labelClass } from "./action-fields";

/** Minor units back to a decimal string for an editable field. */
function toDollars(minorUnits: number | undefined): string {
  return minorUnits === undefined ? "" : (minorUnits / 100).toFixed(2);
}

export function EntityFormFields({ entity }: { entity?: StoredEntity }) {
  return (
    <>
      <label className={fieldClass}>
        <span className={labelClass}>Name</span>
        <input className={inputClass} name="name" required defaultValue={entity?.name} />
      </label>

      <fieldset className={css({ marginBottom: "4", border: "none", padding: "0" })}>
        <legend className={labelClass}>Legal form</legend>
        <p className={hintClass}>
          Pick every form this entity holds. A 501(c)(3) is almost always also a
          nonprofit corporation — state and federal rules key off different ones,
          so selecting both is usually correct.
        </p>
        {ENTITY_TYPES.map((type) => (
          <label key={type} className={css({ display: "block", marginTop: "1" })}>
            <input
              type="checkbox"
              name="entityTypes"
              value={type}
              defaultChecked={entity?.entityTypes.includes(type)}
            />{" "}
            {entityTypeLabel(type)}
          </label>
        ))}
      </fieldset>

      <label className={fieldClass}>
        <span className={labelClass}>Date formed</span>
        <input
          className={inputClass}
          type="date"
          name="formedOn"
          required
          defaultValue={entity?.formedOn}
        />
        <span className={hintClass}>
          Most state annual reports are due in the anniversary month of this
          date, so it needs to be right — getting it wrong shifts every state
          deadline for this entity.
        </span>
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Home jurisdiction</span>
        <input
          className={inputClass}
          name="homeJurisdiction"
          placeholder="US-WA"
          pattern="US-[A-Z]{2}"
          required
          defaultValue={entity?.homeJurisdiction}
        />
        <span className={hintClass}>The state it was formed in, e.g. US-WA.</span>
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Registered in</span>
        <input
          className={inputClass}
          name="jurisdictions"
          placeholder="US, US-WA"
          required
          defaultValue={entity?.jurisdictions.join(", ")}
        />
        <span className={hintClass}>
          Comma-separated. Include <code>US</code> for federal filings and every
          state you are registered in — registering in a state is what creates
          the obligation to it.
        </span>
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Fiscal year ends</span>
        <input
          className={inputClass}
          name="fiscalYearEnd"
          placeholder="12-31"
          pattern="\d{2}-\d{2}"
          defaultValue={entity?.fiscalYearEnd ?? "12-31"}
          required
        />
        <span className={hintClass}>
          MM-DD. The federal return is due five months after this, so a
          non-calendar year changes the date.
        </span>
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Gross annual revenue (optional)</span>
        <input
          className={inputClass}
          type="number"
          name="grossRevenue"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.grossRevenueMinorUnits)}
        />
        <span className={hintClass}>
          In dollars. <strong>Leave blank if you do not know</strong> — an
          unknown is reported as “cannot tell yet”, whereas a guess is reported
          as an answer. Clearing this field puts it back to unknown.
        </span>
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Total assets (optional)</span>
        <input
          className={inputClass}
          type="number"
          name="totalAssets"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.totalAssetsMinorUnits)}
        />
      </label>

      <label className={fieldClass}>
        <span className={labelClass}>Charitable assets (optional)</span>
        <input
          className={inputClass}
          type="number"
          name="charitableAssets"
          min="0"
          step="0.01"
          defaultValue={toDollars(entity?.charitableAssetsMinorUnits)}
        />
        <span className={hintClass}>
          The portion held for charitable purposes — <strong>not the same as
          total assets</strong>. Several states require charity registration
          above a threshold on this figure alone, even for an organisation that
          never asks the public for money.
        </span>
      </label>

      <label className={css({ display: "block", marginBottom: "6" })}>
        <input
          type="checkbox"
          name="solicits"
          value="true"
          defaultChecked={entity?.solicitsCharitableContributions === true}
        />{" "}
        This organisation solicits charitable contributions
        <span className={hintClass}>
          Charity registration is a separate obligation from the corporate
          annual report, and it is the one most often missed.
        </span>
      </label>
    </>
  );
}
