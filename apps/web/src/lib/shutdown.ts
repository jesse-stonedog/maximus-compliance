import "server-only";
/**
 * Checkpoint the database when the container stops.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * `docker stop` sends SIGTERM. Without a handler the process is killed with
 * writes still sitting in the write-ahead log, so the `.sqlite` file on the
 * volume is incomplete — and the obvious backup (copy that file) silently
 * loses recent data. See NEH-230.
 */

import { getStore } from "./server";

const globalForShutdown = globalThis as unknown as { maximusShutdownWired?: boolean };

export function wireShutdown(): void {
  // Next's dev server re-evaluates modules on every hot reload, so an unguarded
  // listener registration leaks one per edit until Node warns about a leak.
  if (globalForShutdown.maximusShutdownWired) return;
  globalForShutdown.maximusShutdownWired = true;

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      try {
        getStore().close();
        console.info("[maximus] database checkpointed and closed");
      } catch (error) {
        // Never block shutdown on this. The data is still in the WAL and will
        // be recovered on next open; hanging the container would be worse.
        console.error(`[maximus] checkpoint on ${signal} failed:`, error);
      }
      process.exit(0);
    });
  }
}
