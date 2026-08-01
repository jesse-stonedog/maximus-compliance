/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `server-only` exists to THROW when a server module is pulled into a client
 * bundle — that is its whole job, and it is why the marker is worth having on
 * files.ts and server.ts. Under Jest there is no client boundary to enforce, so
 * the import is stubbed rather than the marker removed: dropping it from the
 * source to make tests pass would trade a real build-time guarantee for a
 * green suite.
 */
module.exports = {};
