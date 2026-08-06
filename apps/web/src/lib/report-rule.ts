/**
 * Where to say a rule is wrong.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * A deep link into the repository's `rule-change` issue form, prefilled with
 * the context the reporter would otherwise have to describe.
 *
 * ## Why prefill at all
 *
 * The audience is a CPA or an attorney who knows the statute and does not know
 * git. They are looking at a date they believe is wrong. Everything between
 * that moment and a filed report is attrition — and "which jurisdiction?" and
 * "which filing?" are questions the screen can already answer. The one thing
 * only they can supply is what is actually wrong and where they read it, so
 * those are the only fields left empty.
 *
 * ## What must NEVER be prefilled
 *
 * **The issue tracker is public and permanent.** So the URL carries the
 * jurisdiction, the rule id, the agency and the filing title — facts about the
 * *rule*, all of which are already published in the rule pack — and nothing
 * about the entity. Not its name, not its id, not its formation date, not its
 * revenue band.
 *
 * That is not a caution; it is the whole design of this module. It takes a
 * `RuleContext` rather than a `DatedItem` precisely so an entity field cannot
 * be passed in by accident: the caller has to pick out the four rule fields by
 * hand, and there is nothing else here to pick.
 *
 * A self-hoster's entity data lives on their own machine and this link is the
 * one path in the product that sends anything to a third party at all.
 */

/** The rule facts, and only the rule facts. */
export interface RuleContext {
  ruleId?: string;
  jurisdiction?: string;
  title: string;
  agencyUrl?: string;
}

export const REPO = "stonedog-code/optima-filings";
const TEMPLATE = "rule-change.yml";

/**
 * `US-WA` as a person would say it.
 *
 * The issue form asks for a jurisdiction in prose ("Washington"), and the rule
 * pack stores ISO 3166-2. Rather than ship a 50-state lookup table that would
 * drift from the pack, the code is passed through with its `US-` prefix
 * stripped — `WA`, `WA/seattle`, `federal`. A human triaging the issue reads
 * either fine, and a wrong-but-confident expansion would be worse than a code.
 */
export function jurisdictionLabel(jurisdiction: string | undefined): string {
  if (!jurisdiction) return "";
  if (jurisdiction === "US") return "federal";
  return jurisdiction.replace(/^US-/, "");
}

/**
 * The URL for reporting that this rule is wrong.
 *
 * GitHub issue *forms* accept prefills as query parameters keyed by each
 * field's `id` in the YAML — so these names are a contract with
 * `.github/ISSUE_TEMPLATE/rule-change.yml`, not free text. A renamed field
 * there silently stops prefilling here: the link still opens a blank-ish form
 * rather than erroring, which is the failure mode the test guards.
 *
 * **What is verified and what is not.** The URL is well-formed and GitHub
 * accepts it — an anonymous request 302s to the login page with every
 * parameter preserved in `return_to`, which is the correct behaviour for a
 * page that requires a session. What has NOT been checked from here is the
 * *rendered* form with the boxes filled in, because that needs an
 * authenticated browser. So treat "it prefills" as relying on GitHub's
 * documented behaviour rather than on an observation.
 *
 * That gap is tolerable only because the failure is benign: a key GitHub does
 * not recognise is ignored, the form opens, and the reporter fills it in
 * themselves. There is no broken link and no error — which is also precisely
 * why nobody would notice it silently stopping. Worth an eye the first time a
 * real report comes in.
 */
export function reportRuleUrl(context: RuleContext): string {
  const params = new URLSearchParams({ template: TEMPLATE });

  const jurisdiction = jurisdictionLabel(context.jurisdiction);
  if (jurisdiction) params.set("jurisdiction", jurisdiction);
  params.set("filing", context.title);
  if (context.ruleId) params.set("rule-id", context.ruleId);

  // Prefilled into the citation box because it is the page we are ASKING them
  // to check — see the link this one sits beneath. Someone who followed it and
  // found a different fee has the tab open; making them paste the URL back is
  // the kind of small friction that turns a report into a shrug.
  //
  // It is our own value from the rule pack, not anything they typed.
  if (context.agencyUrl) params.set("citation", context.agencyUrl);

  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}
