/**
 * GENERATED — do not hand-edit. Run `npm run rules:barrel`.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Rule } from "@maximus/engine";

export const ALL_RULES: readonly Rule[] = [
  // us/de/corporation-annual-report.json
  {
    "id": "us-de-corporation-annual-report",
    "jurisdiction": "US-DE",
    "title": "Corporation Annual Report and Franchise Tax",
    "agency": "Delaware Division of Corporations",
    "entityTypes": [
      "s-corp",
      "c-corp",
      "b-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "calendar",
      "month": 3,
      "day": 1
    },
    "fee": {
      "amountMinorUnits": 5000,
      "currency": "USD"
    },
    "citation": "8 Del. C. 502",
    "citationUrl": "https://delcode.delaware.gov/title8/c001/sc15/index.html",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "FEE IS THE REPORT FEE ONLY. Delaware franchise tax is calculated separately (authorised-shares or assumed-par-value method) and is usually far larger than this. The schema has no way to express a computed fee — presenting $50 as the total cost would badly understate it. Do not promote to active until either the schema supports computed fees or the notes are surfaced in the UI."
  },
  // us/de/llc-annual-tax.json
  {
    "id": "us-de-llc-annual-tax",
    "jurisdiction": "US-DE",
    "title": "Limited Liability Company Annual Tax",
    "agency": "Delaware Division of Corporations",
    "entityTypes": [
      "llc"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "calendar",
      "month": 6,
      "day": 1
    },
    "fee": {
      "amountMinorUnits": 30000,
      "currency": "USD"
    },
    "citation": "6 Del. C. 18-1107",
    "citationUrl": "https://delcode.delaware.gov/title6/c018/sc10/index.html",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "Delaware LLCs pay a flat annual tax and file no annual report. Fixed calendar date, not an anniversary. Verify the current amount — it has been $300 for some years but is set by statute and can change."
  },
  // us/federal/form-990.json
  {
    "id": "us-federal-form-990",
    "jurisdiction": "US",
    "title": "Form 990 — Return of Organization Exempt From Income Tax",
    "agency": "Internal Revenue Service",
    "entityTypes": [
      "501c3"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 5,
      "dayOfMonth": 15
    },
    "form": "990",
    "conditions": [
      {
        "anyOf": [
          {
            "fact": "grossRevenueMinorUnits",
            "op": "gte",
            "value": 20000000
          },
          {
            "fact": "totalAssetsMinorUnits",
            "op": "gte",
            "value": 50000000
          }
        ]
      }
    ],
    "citation": "26 U.S.C. 6033; IRS Instructions for Form 990",
    "citationUrl": "https://www.irs.gov/forms-pubs/about-form-990",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "Due the 15th day of the 5th month after the fiscal year ends — 15 May for a calendar-year filer. The threshold is gross receipts >= $200k OR total assets >= $500k: an organisation meeting EITHER files the full return, which is why this uses an anyOf group. Still draft — the cadence and both thresholds need checking against the current IRS instructions before promotion."
  },
  // us/federal/form-990-ez.json
  {
    "id": "us-federal-form-990-ez",
    "jurisdiction": "US",
    "title": "Form 990-EZ — Short Form Return of Organization Exempt From Income Tax",
    "agency": "Internal Revenue Service",
    "entityTypes": [
      "501c3"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 5,
      "dayOfMonth": 15
    },
    "form": "990-EZ",
    "conditions": [
      {
        "fact": "grossRevenueMinorUnits",
        "op": "gt",
        "value": 5000000
      },
      {
        "fact": "grossRevenueMinorUnits",
        "op": "lt",
        "value": 20000000
      },
      {
        "fact": "totalAssetsMinorUnits",
        "op": "lt",
        "value": 50000000
      }
    ],
    "citation": "26 U.S.C. 6033; IRS Instructions for Form 990-EZ",
    "citationUrl": "https://www.irs.gov/forms-pubs/about-form-990-ez",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "Filing thresholds are reviewed by the IRS periodically; re-check the current instructions before promoting to active."
  },
  // us/federal/form-990-n.json
  {
    "id": "us-federal-form-990-n",
    "jurisdiction": "US",
    "title": "Form 990-N (e-Postcard)",
    "agency": "Internal Revenue Service",
    "entityTypes": [
      "501c3"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 5,
      "dayOfMonth": 15
    },
    "form": "990-N",
    "conditions": [
      {
        "fact": "grossRevenueMinorUnits",
        "op": "lte",
        "value": 5000000
      }
    ],
    "citation": "26 U.S.C. 6033(i); IRS Annual Electronic Filing Requirement for Small Exempt Organizations",
    "citationUrl": "https://www.irs.gov/charities-non-profits/annual-electronic-filing-requirement-for-small-exempt-organizations-form-990-n-e-postcard",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "Failing to file for three consecutive years revokes exempt status automatically. Worth surfacing prominently in the UI — it is the single most consequential missed deadline for a small nonprofit."
  },
  // us/or/corporation-annual-report.json
  {
    "id": "us-or-sos-corporation-annual-report",
    "jurisdiction": "US-OR",
    "title": "Business Corporation Annual Report",
    "agency": "Oregon Secretary of State, Corporation Division",
    "entityTypes": [
      "s-corp",
      "c-corp",
      "b-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 10000,
      "currency": "USD"
    },
    "citation": "ORS 60.787",
    "citationUrl": "https://www.oregonlegislature.gov/bills_laws/ors/ors060.html",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "Same anniversary-date question — verify before promoting."
  },
  // us/or/llc-annual-report.json
  {
    "id": "us-or-sos-llc-annual-report",
    "jurisdiction": "US-OR",
    "title": "Limited Liability Company Annual Report",
    "agency": "Oregon Secretary of State, Corporation Division",
    "entityTypes": [
      "llc"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 10000,
      "currency": "USD"
    },
    "citation": "ORS 63.787",
    "citationUrl": "https://www.oregonlegislature.gov/bills_laws/ors/ors063.html",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "Same anniversary-date question as the nonprofit report — verify before promoting."
  },
  // us/or/nonprofit-annual-report.json
  {
    "id": "us-or-sos-nonprofit-annual-report",
    "jurisdiction": "US-OR",
    "title": "Nonprofit Corporation Annual Report",
    "agency": "Oregon Secretary of State, Corporation Division",
    "entityTypes": [
      "501c3",
      "nonprofit-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 5000,
      "currency": "USD"
    },
    "citation": "ORS 65.787",
    "citationUrl": "https://www.oregonlegislature.gov/bills_laws/ors/ors065.html",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "Oregon anniversary-based annual report. Verify whether the deadline is the anniversary DATE rather than the end of the anniversary month — this rule currently assumes end of month, which would be wrong by up to 30 days if Oregon uses the exact date."
  },
  // us/wa/charitable-solicitation-registration.json
  {
    "id": "us-wa-charitable-solicitation-registration",
    "jurisdiction": "US-WA",
    "title": "Charitable Organization Registration Renewal",
    "agency": "Washington Secretary of State, Charities Program",
    "entityTypes": [
      "501c3",
      "nonprofit-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "fiscal-year-end",
      "offsetMonths": 11,
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 6000,
      "currency": "USD"
    },
    "conditions": [
      {
        "fact": "solicitsCharitableContributions",
        "op": "eq",
        "value": true
      }
    ],
    "citation": "RCW 19.09.075; RCW 19.09.097",
    "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=19.09",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "SEPARATE from the corporate annual report, and the one most often missed — an organisation can be in good standing as a corporation while unregistered to solicit. Verify the renewal deadline: it is tied to the fiscal year end rather than to formation, and the exact offset needs checking against the Charities Program."
  },
  // us/wa/corporation-annual-report.json
  {
    "id": "us-wa-sos-corporation-annual-report",
    "jurisdiction": "US-WA",
    "title": "Profit Corporation Annual Report",
    "agency": "Washington Secretary of State",
    "entityTypes": [
      "s-corp",
      "c-corp",
      "b-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 6000,
      "currency": "USD"
    },
    "citation": "RCW 23.95.255",
    "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=23.95",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "RCW 23.95 is the Washington Uniform Business Organizations Code, which carries the annual report requirement for several entity forms. Verify the section and fee."
  },
  // us/wa/llc-annual-report.json
  {
    "id": "us-wa-sos-llc-annual-report",
    "jurisdiction": "US-WA",
    "title": "Limited Liability Company Annual Report",
    "agency": "Washington Secretary of State",
    "entityTypes": [
      "llc"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 6000,
      "currency": "USD"
    },
    "citation": "RCW 25.15.106",
    "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=25.15",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2020-01-01",
    "notes": "Due by the end of the month the LLC was formed in. Verify the section and fee against the SOS fee schedule."
  },
  // us/wa/nonprofit-annual-report.json
  {
    "id": "us-wa-sos-nonprofit-annual-report",
    "jurisdiction": "US-WA",
    "title": "Nonprofit Corporation Annual Report",
    "agency": "Washington Secretary of State",
    "entityTypes": [
      "501c3",
      "nonprofit-corp"
    ],
    "cadence": {
      "type": "annual",
      "anchor": "formation-month",
      "dayOfMonth": "last"
    },
    "fee": {
      "amountMinorUnits": 6000,
      "currency": "USD"
    },
    "citation": "RCW 24.03A.1010",
    "citationUrl": "https://app.leg.wa.gov/rcw/default.aspx?cite=24.03A",
    "lastVerified": "2026-08-01",
    "status": "draft",
    "effectiveFrom": "2022-01-01",
    "notes": "Washington replaced the old Nonprofit Corporation Act with RCW 24.03A effective 1 Jan 2022. Verify BOTH the exact RCW section and the current fee against the SOS fee schedule before promoting to active."
  },
] as const;
