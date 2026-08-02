/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { css } from "styled-system/css";

/** `danger` is for anything that destroys data. Colour is never the only cue. */
export function SubmitButton({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "danger";
}) {
  return (
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
      style={
        tone === "danger"
          ? {
              background: "var(--optima-text-error-text)",
              color: "var(--optima-button-primary-text)",
            }
          : {
              background: "var(--optima-button-primary-bg)",
              color: "var(--optima-button-primary-text)",
            }
      }
    >
      {children}
    </button>
  );
}
