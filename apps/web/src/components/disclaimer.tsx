/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { css } from "styled-system/css";

/**
 * Shown on every page that displays a deadline, not once at signup and not in a
 * footer nobody reads twice.
 *
 * This software tells people when to file with a government and a missed
 * deadline costs real money, so the caveat belongs where the answer is.
 */
export function Disclaimer() {
  return (
    <p
      className={css({
        fontSize: "sm",
        marginTop: "8",
        paddingTop: "4",
        borderTop: "1px solid",
        borderColor: "boxBorderPrimary",
        color: "boxTextSecondary",
      })}
    >
      <strong>This is not legal or tax advice.</strong> Deadlines and fees
      change, and your circumstances may be unusual. Every row cites its source
      — check anything that matters. You remain responsible for your own
      filings.
    </p>
  );
}
