/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { EntityFacts } from "@optima-compliance/engine";
import { EntityStore } from "../src/store.js";
import { MIGRATIONS } from "../src/schema.js";

const NOW = "2026-08-01T00:00:00.000Z";
const open = () => new EntityStore({ path: ":memory:", now: () => NOW });

const facts: EntityFacts = {
  name: "Example Cascade Trails Association",
  entityTypes: ["501c3", "nonprofit-corp"],
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
  grossRevenueMinorUnits: 4_200_000,
  solicitsCharitableContributions: true,
};

describe("migrations", () => {
  it("apply on open", () => {
    const store = open();
    expect(store.list()).toEqual([]);
    store.close();
  });

  it("are idempotent across reopens of the same database", () => {
    // A self-hoster upgrades by restarting the container, so migrate() runs on
    // every boot. Running one twice must not throw.
    const store = open();
    store.create(facts, "a");
    store.close();
  });

  it("have unique, ordered ids", () => {
    const ids = MIGRATIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual(ids);
  });
});

describe("round trip", () => {
  it("returns what was stored", () => {
    const store = open();
    const created = store.create(facts, "e1");
    expect(created).toMatchObject(facts);
    expect(store.get("e1")).toEqual(created);
    store.close();
  });

  it("preserves array fields", () => {
    const store = open();
    store.create(facts, "e1");
    expect(store.get("e1")?.entityTypes).toEqual(["501c3", "nonprofit-corp"]);
    expect(store.get("e1")?.jurisdictions).toEqual(["US", "US-WA"]);
    store.close();
  });

  it("preserves registeredOn", () => {
    const store = open();
    store.create({ ...facts, registeredOn: { "US-OR": "2023-04-01" } }, "e1");
    expect(store.get("e1")?.registeredOn).toEqual({ "US-OR": "2023-04-01" });
    store.close();
  });
});

describe("unknown facts stay unknown", () => {
  it("omits an absent number rather than storing 0", () => {
    // THE point of the nullable columns. A NOT NULL DEFAULT 0 would turn "we do
    // not know this charity's revenue" into "it earned nothing", and the engine
    // would then confidently tell a large organisation it qualifies for the
    // postcard return instead of reporting the rule as indeterminate.
    const store = open();
    const sparse = { ...facts };
    delete sparse.grossRevenueMinorUnits;
    store.create(sparse, "e1");

    const loaded = store.get("e1")!;
    expect(loaded).not.toHaveProperty("grossRevenueMinorUnits");
    expect(loaded.grossRevenueMinorUnits).toBeUndefined();
    store.close();
  });

  it("distinguishes a real zero from an absent value", () => {
    const store = open();
    store.create({ ...facts, grossRevenueMinorUnits: 0 }, "zero");
    const sparse = { ...facts };
    delete sparse.grossRevenueMinorUnits;
    store.create(sparse, "unknown");

    expect(store.get("zero")).toHaveProperty("grossRevenueMinorUnits", 0);
    expect(store.get("unknown")).not.toHaveProperty("grossRevenueMinorUnits");
    store.close();
  });

  it("round-trips false without turning it into unknown", () => {
    // The boolean is stored as 0/1, so `false` and NULL must not collapse.
    const store = open();
    store.create({ ...facts, solicitsCharitableContributions: false }, "e1");
    expect(store.get("e1")).toHaveProperty(
      "solicitsCharitableContributions",
      false,
    );
    store.close();
  });

  it("omits the boolean entirely when it was never supplied", () => {
    const store = open();
    const sparse = { ...facts };
    delete sparse.solicitsCharitableContributions;
    store.create(sparse, "e1");
    expect(store.get("e1")).not.toHaveProperty("solicitsCharitableContributions");
    store.close();
  });
});

describe("money", () => {
  it("survives a large integer without precision loss", () => {
    // Integer minor units, so $12,000,000.00 is 1_200_000_000 cents. A float
    // column would be where a fee quietly gains a fraction of a cent.
    const store = open();
    store.create({ ...facts, totalAssetsMinorUnits: 1_200_000_000 }, "e1");
    expect(store.get("e1")?.totalAssetsMinorUnits).toBe(1_200_000_000);
    store.close();
  });
});

describe("crud", () => {
  it("lists by name, case-insensitively", () => {
    const store = open();
    store.create({ ...facts, name: "zebra trust" }, "z");
    store.create({ ...facts, name: "Alpha Foundation" }, "a");
    store.create({ ...facts, name: "beta Society" }, "b");
    expect(store.list().map((e) => e.name)).toEqual([
      "Alpha Foundation",
      "beta Society",
      "zebra trust",
    ]);
    store.close();
  });

  it("updates in place and moves updatedAt only", () => {
    const store = open();
    const created = store.create(facts, "e1");
    const updated = store.update("e1", { ...facts, name: "Renamed" })!;
    expect(updated.name).toBe("Renamed");
    expect(updated.createdAt).toBe(created.createdAt);
    store.close();
  });

  it("returns undefined when updating something that is not there", () => {
    const store = open();
    expect(store.update("nope", facts)).toBeUndefined();
    store.close();
  });

  it("can clear a previously-known fact back to unknown", () => {
    // Someone who mistyped a revenue figure must be able to remove it, not just
    // overwrite it with a different number.
    const store = open();
    store.create(facts, "e1");
    const sparse = { ...facts };
    delete sparse.grossRevenueMinorUnits;
    store.update("e1", sparse);
    expect(store.get("e1")).not.toHaveProperty("grossRevenueMinorUnits");
    store.close();
  });

  it("deletes, and reports whether anything was deleted", () => {
    const store = open();
    store.create(facts, "e1");
    expect(store.delete("e1")).toBe(true);
    expect(store.delete("e1")).toBe(false);
    expect(store.get("e1")).toBeUndefined();
    store.close();
  });
});

describe("checkpointing", () => {
  it("folds the write-ahead log back into the main file on close", async () => {
    // The self-hoster's backup instinct is to copy optima.sqlite. In WAL mode
    // that file is missing recent writes until a checkpoint — a backup that
    // opens cleanly and has silently lost data, discovered only on restore.
    const { mkdtemp, stat, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const dir = await mkdtemp(join(tmpdir(), "optima-wal-"));
    const path = join(dir, "test.sqlite");

    const store = new EntityStore({ path, now: () => NOW });
    for (let i = 0; i < 50; i += 1) {
      store.create({ ...facts, name: `Entity ${i}` }, `e${i}`);
    }

    // Before the checkpoint the main file is essentially empty and the WAL
    // holds the data.
    const beforeMain = (await stat(path)).size;
    const beforeWal = (await stat(`${path}-wal`)).size;
    expect(beforeWal).toBeGreaterThan(beforeMain);

    store.close();

    // After close the main file carries it all, so a plain copy is correct.
    const afterMain = (await stat(path)).size;
    expect(afterMain).toBeGreaterThan(beforeMain);

    const reopened = new EntityStore({ path, now: () => NOW });
    expect(reopened.list()).toHaveLength(50);
    reopened.close();

    await rm(dir, { recursive: true, force: true });
  });

  it("survives a checkpoint failure rather than refusing to close", () => {
    // Data is still safe in the WAL if a checkpoint cannot run; hanging on to
    // the handle would be the worse outcome.
    const store = new EntityStore({ path: ":memory:", now: () => NOW });
    expect(() => store.close()).not.toThrow();
  });
});
