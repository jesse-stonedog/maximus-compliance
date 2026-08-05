/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Metadata } from "next";
import { OptimaStyleProvider, themeCss } from "@optima-compliance/ui";
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
          is generated from the token map in @optima-compliance/ui — the same source the
          completeness test asserts against. Two copies of these 44 properties
          would drift, and a drifted property renders as nothing.
        */}
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
      </head>
      <body>
        {/*
          WCAG 2.2 §2.4.1 (Bypass Blocks), Level A. Without this a keyboard or
          screen-reader user re-traverses the header navigation on every page
          load to reach the calendar — which is the entire content of the
          product. The hosted app has had one since its first slice; this repo
          did not, so the two products differed on a Level A basic (NEH-379).

          First element in the body, because "first thing focus reaches" is the
          whole point — a skip link placed after anything else skips past less
          than the thing in front of it.
        */}
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <OptimaStyleProvider>
          {/*
            A wrapper rather than an `id` on each page's own `<main>`. Nine
            pages render one today, and a tenth added later would silently have
            no skip target — a failure with no symptom for anyone testing with a
            mouse. One wrapper means a new page inherits a working skip link
            without knowing this exists.

            `tabIndex={-1}` is what makes the jump actually move FOCUS rather
            than only scrolling: a browser will not focus a non-focusable
            target, so without it the next Tab continues from the header and the
            link has done nothing for the user it exists for.
          */}
          <div id="main" tabIndex={-1}>
            {children}
          </div>
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
