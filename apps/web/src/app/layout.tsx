/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Metadata } from "next";
import { OptimaStyleProvider, themeCss } from "@optima/ui";
import { SiteFooter } from "../components/site-footer";
import "../styles.css";

export const metadata: Metadata = {
  title: "Optima Filings",
  description: "Know what your business owes, and when.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          The theme is injected rather than imported as a stylesheet because it
          is generated from the token map in @optima/ui — the same source the
          completeness test asserts against. Two copies of these 44 properties
          would drift, and a drifted property renders as nothing.
        */}
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
      </head>
      <body>
        <OptimaStyleProvider>
          {children}
          {/*
            In the layout rather than per-page, so a self-hoster cannot end up
            with a page that quietly carries no notice — which for an AGPL
            network application is the one omission with a legal consequence.
          */}
          <SiteFooter />
        </OptimaStyleProvider>
      </body>
    </html>
  );
}
