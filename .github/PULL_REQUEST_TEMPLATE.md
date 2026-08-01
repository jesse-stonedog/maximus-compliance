## What and why

<!-- What changes, and what problem it solves. -->

## If this touches rule data

- [ ] I read the **primary source** (statute, regulation, or the agency's own page) — not another compliance vendor
- [ ] `citation` names the source; `citationUrl` links it where one exists
- [ ] `status` is honest: `active` only if I actually opened and read the source
- [ ] `lastVerified` is the date I read it (unchanged if I did not)
- [ ] A fee or deadline **change** adds a new rule with `effectiveTo` on the old one, rather than editing in place
- [ ] `npm run rules:barrel` run, and `packages/rules/src/generated.ts` committed
- [ ] Fixtures added: one entity that triggers the rule, one nearby that does not

## Checks

- [ ] `npm run gate` is green locally
- [ ] Bug fix? A test reproduces it and fails on the pre-fix code

## Issue

<!-- Closes NEH-xxx. Note: the keyword does NOT auto-close in this workspace — close it by hand after merge. -->
