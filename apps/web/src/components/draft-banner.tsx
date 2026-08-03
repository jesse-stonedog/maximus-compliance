/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { StyledUnverified } from "@optima/ui";
import { css } from "styled-system/css";

/**
 * Shown whenever unverified rules are switched on.
 *
 * The whole seeded rule set is currently `draft` — written from general
 * knowledge, never checked against a statute by a person. Someone who has
 * opted in needs that stated plainly and repeatedly, because the rows
 * themselves look exactly as authoritative as verified ones.
 */
export function DraftBanner() {
  return (
    <div
      role="note"
      className={css({ padding: "3", borderRadius: "md", fontSize: "sm" })}
      style={{
        background: "var(--optima-box-info-bg)",
        borderLeft: "4px solid var(--optima-text-warning-text)",
      }}
    >
      <StyledUnverified title="Warning" />{" "}
      <strong>Unverified rules are being shown.</strong> Rows marked
      “unverified” come from rules nobody has checked against the statute they
      cite. Treat them as a prompt to verify, not as fact.
    </div>
  );
}
