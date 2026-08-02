/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { EvaluationResult, Obligation } from "@maximus/engine";
import { StyledStatute, StyledUnverified, StyledWarning } from "@maximus/ui";
import { css } from "styled-system/css";
import {
  formatDate,
  formatFee,
  jurisdictionLabel,
  relativeDue,
  urgency,
} from "@/lib/format";

const URGENCY_COLOR = {
  overdue: "var(--optima-text-error-text)",
  "due-soon": "var(--optima-text-warning-text)",
  upcoming: "var(--optima-box-secondary-text)",
} as const;

function DueCell({ asOf, obligation }: { asOf: string; obligation: Obligation }) {
  const level = urgency(asOf, obligation.dueOn);
  return (
    <div>
      <div className={css({ fontWeight: "600" })}>{formatDate(obligation.dueOn)}</div>
      <div
        className={css({ fontSize: "sm" })}
        style={{ color: URGENCY_COLOR[level] }}
      >
        {/*
          Colour is never the only signal — WCAG 1.4.1. "12 days overdue" reads
          the same to someone who cannot distinguish the red, and to a screen
          reader, which gets nothing from the colour at all.
        */}
        {level === "overdue" ? (
          <StyledWarning title="Overdue" />
        ) : null}{" "}
        {relativeDue(asOf, obligation.dueOn)}
      </div>
    </div>
  );
}

export function ObligationTable({
  result,
  asOf,
}: {
  result: EvaluationResult;
  asOf: string;
}) {
  if (result.obligations.length === 0 && result.indeterminate.length === 0) {
    return (
      <p className={css({ color: "boxTextSecondary", padding: "4" })}>
        Nothing due in the next 12 months.
      </p>
    );
  }

  return (
    <>
      {result.obligations.length > 0 && (
        <div className={css({ overflowX: "auto" })}>
          <table className={css({ width: "full", borderCollapse: "collapse" })}>
            <caption className={css({ srOnly: true })}>
              Filing obligations, soonest first
            </caption>
            <thead>
              <tr>
                {["Due", "Filing", "Where", "Fee"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className={css({
                      textAlign: "left",
                      padding: "3",
                      fontSize: "sm",
                      borderBottom: "1px solid",
                      borderColor: "boxBorderPrimary",
                    })}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.obligations.map((obligation) => (
                <tr
                  key={`${obligation.ruleId}-${obligation.dueOn}`}
                  className={css({
                    borderBottom: "1px solid",
                    borderColor: "boxBorderPrimary",
                  })}
                >
                  <td className={css({ padding: "3", verticalAlign: "top" })}>
                    <DueCell asOf={asOf} obligation={obligation} />
                  </td>
                  <td className={css({ padding: "3", verticalAlign: "top" })}>
                    <div className={css({ fontWeight: "600" })}>
                      {obligation.title}
                      {obligation.status === "draft" && (
                        <span
                          className={css({ fontSize: "sm", marginLeft: "2" })}
                          style={{ color: "var(--optima-text-warning-text)" }}
                        >
                          <StyledUnverified title="Unverified" /> unverified
                        </span>
                      )}
                    </div>
                    <div
                      className={css({ fontSize: "sm", color: "boxTextSecondary" })}
                    >
                      {obligation.agency}
                      {obligation.form ? ` · Form ${obligation.form}` : ""}
                    </div>
                    {/*
                      The citation is shown on every row, not hidden behind a
                      detail toggle. It is what makes a deadline checkable, and
                      the README tells users to verify anything that matters —
                      which is only possible if the source is in front of them.
                    */}
                    <div className={css({ fontSize: "xs", marginTop: "1" })}>
                      <StyledStatute />{" "}
                      {obligation.citationUrl ? (
                        <a href={obligation.citationUrl} rel="noreferrer noopener">
                          {obligation.citation}
                        </a>
                      ) : (
                        obligation.citation
                      )}
                    </div>
                  </td>
                  <td className={css({ padding: "3", verticalAlign: "top" })}>
                    {jurisdictionLabel(obligation.jurisdiction)}
                  </td>
                  <td
                    className={css({
                      padding: "3",
                      verticalAlign: "top",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {formatFee(obligation)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.indeterminate.length > 0 && (
        <section
          className={css({ marginTop: "6", padding: "4", borderRadius: "md" })}
          style={{ background: "var(--optima-box-info-bg)" }}
        >
          <h3 className={css({ margin: "0", fontSize: "md" })}>
            Cannot tell yet
          </h3>
          {/*
            Surfaced prominently rather than tucked away. An incomplete calendar
            presented as complete is this product's worst failure, and the user
            can usually resolve it by supplying one number.
          */}
          <p className={css({ fontSize: "sm", marginTop: "1" })}>
            These depend on facts this entity has not recorded:
          </p>
          <ul className={css({ fontSize: "sm", marginTop: "2" })}>
            {result.indeterminate.map((rule) => (
              <li key={rule.ruleId}>
                <strong>{rule.title}</strong> ({jurisdictionLabel(rule.jurisdiction)})
                — needs {rule.missingFacts.join(", ")}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
