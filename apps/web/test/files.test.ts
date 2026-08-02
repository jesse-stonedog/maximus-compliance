/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  checkUpload,
  newStorageKey,
} from "../src/lib/files.js";

const file = (over: Partial<{ size: number; type: string; name: string }> = {}) =>
  ({ size: 1024, type: "application/pdf", name: "formation.pdf", ...over }) as File;

describe("newStorageKey", () => {
  it("never contains the user's filename", () => {
    // A name like "../../data/optima.sqlite" reaching a path join is how an
    // upload form becomes an arbitrary-write primitive. Sanitising such a name
    // correctly is much harder than never using it.
    const key = newStorageKey("application/pdf");
    expect(key).not.toContain("formation");
    expect(key).toMatch(/^[0-9a-f-]{36}\.pdf$/);
  });

  it("cannot contain a path separator or traversal", () => {
    for (const type of Object.keys(ALLOWED_CONTENT_TYPES)) {
      const key = newStorageKey(type);
      expect(key).not.toMatch(/[/\\]/);
      expect(key).not.toContain("..");
    }
  });

  it("is unique per call", () => {
    const keys = new Set(Array.from({ length: 50 }, () => newStorageKey("image/png")));
    expect(keys.size).toBe(50);
  });

  it("falls back to .bin for an unknown type", () => {
    expect(newStorageKey("application/x-unknown")).toMatch(/\.bin$/);
  });
});

describe("checkUpload", () => {
  it("accepts a normal PDF", () => {
    expect(checkUpload(file()).ok).toBe(true);
  });

  it("rejects an empty file", () => {
    expect(checkUpload(file({ size: 0 }))).toMatchObject({ ok: false });
  });

  it("rejects one over the limit, and says how big it was", () => {
    const result = checkUpload(file({ size: MAX_UPLOAD_BYTES + 1 }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MB/);
  });

  it.each(["image/svg+xml", "text/html", "application/javascript"])(
    "rejects %s, which a browser would execute",
    (type) => {
      // Both SVG and HTML can carry script. Served from this origin they would
      // run with the user's session, so they are absent from the allowlist
      // deliberately rather than by oversight.
      expect(checkUpload(file({ type }))).toMatchObject({ ok: false });
    },
  );

  it("rejects a file with no type at all", () => {
    expect(checkUpload(file({ type: "" }))).toMatchObject({ ok: false });
  });
});
