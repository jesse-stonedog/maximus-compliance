# Security Policy

## Reporting a vulnerability

**Please do not open a public issue.**

Report privately through
[GitHub's private vulnerability reporting](../../security/advisories/new), or
email **security@stonedogcode.com**.

Please include what you found, how to reproduce it, and what an attacker could
do with it. We will acknowledge within a few days and keep you updated. If you
would like credit in the advisory, say so and we will name you.

## What is in scope

This repository is the self-hosted core: the rules engine, the rule packs, and
the tooling around them. In scope, for example:

- A way to make the engine produce wrong obligations from crafted rule data
- A crash or resource exhaustion reachable from ordinary input
- Anything in the self-host container that exposes a user's data beyond their
  own instance

The hosted service at maximuscompliance.com is a separate, closed codebase.
Reports about it are very welcome at the same address.

## Wrong rule data is not a vulnerability — but please still tell us

If a deadline or a fee is incorrect, that is a **data defect**, and it is the
single most consequential kind of defect this project has: a wrong date can cost
someone a penalty or their tax-exempt status.

It is not a security issue, so please report it in the open, with the statute you
checked, using the
["A deadline or fee changed" issue template](../../issues/new/choose). Public is
better here — other people relying on the same rule deserve to see the
correction being discussed.

## Threat model, honestly stated

The self-hosted tier is **single-tenant by design**: one instance, one
organisation, no authentication boundary between users of that instance, and a
SQLite file on a volume you control. It is not built to isolate mutually
distrustful users from each other, and running one instance for several
unrelated organisations is outside what it is designed to do. Multi-tenant
isolation is a property of the hosted service, not of this code.

If you find something that breaks the single-tenant assumption in a way a
self-hoster would not expect, that is in scope and we want to hear about it.
