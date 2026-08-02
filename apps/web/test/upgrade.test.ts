/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Every case here stands for the same self-hoster: they pulled a new image onto
 * the volume they already had. If any of these regress, their calendar comes up
 * empty and looks like total data loss (NEH-237).
 */
import { readFileSync } from "node:fs";
import {
  adoptLegacyDatabase,
  renamedEnv,
  type FileOps,
} from "../src/lib/upgrade.js";

/** An in-memory volume: a set of paths, and a log of the renames performed. */
function volume(...present: string[]) {
  const files = new Set(present);
  const renames: [string, string][] = [];
  const ops: FileOps = {
    exists: (path) => files.has(path),
    rename: (from, to) => {
      if (!files.has(from)) throw new Error(`ENOENT: ${from}`);
      files.delete(from);
      files.add(to);
      renames.push([from, to]);
    },
  };
  return { files, renames, ops };
}

describe("adoptLegacyDatabase", () => {
  it("moves a pre-rename database, and its WAL with it", () => {
    const v = volume(
      "/data/maximus.sqlite",
      "/data/maximus.sqlite-wal",
      "/data/maximus.sqlite-shm",
    );

    expect(adoptLegacyDatabase("/data/optima.sqlite", v.ops)).toBe("/data/optima.sqlite");

    expect([...v.files].sort()).toEqual([
      "/data/optima.sqlite",
      "/data/optima.sqlite-shm",
      "/data/optima.sqlite-wal",
    ]);
  });

  it("moves the main file last, so a partial move is not mistaken for a finished one", () => {
    // The main file's presence is the only "already migrated" marker there is.
    // Moving it first and then failing would strand the WAL under the old name.
    const v = volume("/data/maximus.sqlite", "/data/maximus.sqlite-wal");

    adoptLegacyDatabase("/data/optima.sqlite", v.ops);

    expect(v.renames[v.renames.length - 1]).toEqual([
      "/data/maximus.sqlite",
      "/data/optima.sqlite",
    ]);
  });

  it("leaves a database that has already been migrated alone", () => {
    // Both names present means a previous start did the work. Renaming again
    // would overwrite the live database with a stale one.
    const v = volume("/data/optima.sqlite", "/data/maximus.sqlite");

    adoptLegacyDatabase("/data/optima.sqlite", v.ops);

    expect(v.renames).toEqual([]);
    expect(v.files.has("/data/maximus.sqlite")).toBe(true);
  });

  it("does nothing on a fresh install", () => {
    const v = volume();
    expect(adoptLegacyDatabase("/data/optima.sqlite", v.ops)).toBe("/data/optima.sqlite");
    expect(v.renames).toEqual([]);
  });

  it("never touches a path the operator chose themselves", () => {
    // Their explicit setting is carried across by the env-var fallback instead.
    // Renaming a file they named would be a surprise, not a migration.
    const v = volume("/data/maximus.sqlite");

    expect(adoptLegacyDatabase("/data/my-filings.sqlite", v.ops)).toBe(
      "/data/my-filings.sqlite",
    );
    expect(v.renames).toEqual([]);
  });

  it("is a no-op for an in-memory database", () => {
    const v = volume();
    expect(adoptLegacyDatabase(":memory:", v.ops)).toBe(":memory:");
  });

  it("propagates a failed rename rather than starting empty", () => {
    // A read-only volume must crash the container. Continuing would create an
    // empty database beside the real one, which is the failure being prevented.
    const v = volume("/data/maximus.sqlite");
    v.ops.rename = () => {
      throw new Error("EROFS: read-only file system");
    };

    expect(() => adoptLegacyDatabase("/data/optima.sqlite", v.ops)).toThrow(/EROFS/);
  });
});

describe("renamedEnv", () => {
  it("reads the current name", () => {
    expect(renamedEnv("DB_PATH", { OPTIMA_DB_PATH: "/data/a.sqlite" })).toBe(
      "/data/a.sqlite",
    );
  });

  it("falls back to the pre-rename name", () => {
    expect(renamedEnv("INCLUDE_DRAFT", { MAXIMUS_INCLUDE_DRAFT: "true" })).toBe("true");
  });

  it("prefers the current name when both are set", () => {
    // A rollout may set both. The one the operator migrated to has to win, or
    // the migration has no observable effect.
    expect(
      renamedEnv("DB_PATH", {
        OPTIMA_DB_PATH: "/data/new.sqlite",
        MAXIMUS_DB_PATH: "/data/old.sqlite",
      }),
    ).toBe("/data/new.sqlite");
  });

  it("is undefined when neither is set, so the caller's default applies", () => {
    expect(renamedEnv("DOCUMENTS_DIR", {})).toBeUndefined();
  });

  it("is not defeated by the image defining the variable itself", () => {
    // Found by running the container, not by a unit test: the Dockerfile set
    // ENV OPTIMA_DB_PATH, so the current name was ALWAYS present and the
    // fallback below could never fire. An upgrading self-hoster who had set
    // MAXIMUS_DB_PATH would have been handed an empty database.
    //
    // The app's own default is identical, so nothing was gained by setting it.
    // This pins the Dockerfile rather than the function, because the function
    // was already correct — the environment around it was not.
    const dockerfile = readFileSync("docker/Dockerfile", "utf8");
    const envDefaults = dockerfile.match(/^\s*(?:ENV\s+)?OPTIMA_\w+=/gm) ?? [];
    expect(envDefaults).toEqual([]);
  });

  it("treats an empty string as set, not as absent", () => {
    // `??` on the caller's side would silently replace a deliberate empty
    // value with the default; this pins that it does not reach that path.
    expect(renamedEnv("DB_PATH", { OPTIMA_DB_PATH: "" })).toBe("");
  });
});
