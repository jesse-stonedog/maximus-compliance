/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Metadata } from "next";
import { MaximusStyleProvider, themeCss } from "@maximus/ui";
import "../styles.css";

export const metadata: Metadata = {
  title: "Maximus Compliance",
  description: "Know what your business owes, and when.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          The theme is injected rather than imported as a stylesheet because it
          is generated from the token map in @maximus/ui — the same source the
          completeness test asserts against. Two copies of these 44 properties
          would drift, and a drifted property renders as nothing.
        */}
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
      </head>
      <body>
        <MaximusStyleProvider>{children}</MaximusStyleProvider>
      </body>
    </html>
  );
}
