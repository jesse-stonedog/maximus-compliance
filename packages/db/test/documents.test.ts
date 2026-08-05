/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import { EntityStore } from "../src/store.js";
import type { EntityFacts } from "@optima-compliance/engine";

const NOW = "2026-08-01T00:00:00.000Z";
let counter = 0;
const open = () => {
  counter = 0;
  return new EntityStore({
    path: ":memory:",
    now: () => NOW,
    newId: () => `field-${++counter}`,
  });
};

const facts: EntityFacts = {
  name: "Example Cascade Trails Association",
  entityTypes: ["501c3"],
  formedOn: "2021-03-15",
  homeJurisdiction: "US-WA",
  jurisdictions: ["US", "US-WA"],
  fiscalYearEnd: "12-31",
};

const doc = {
  title: "WA SOS formation letter",
  originalFilename: "formation.pdf",
  contentType: "application/pdf",
  byteSize: 12345,
  storageKey: "abc123",
};

describe("documents", () => {
  it("can exist with no entity attached", () => {
    // Someone often has the letter before they have modelled the entity.
    // Refusing the upload until then would lose the document.
    const store = open();
    const created = store.documents.createDocument(doc, "d1");
    expect(created.entityId).toBeUndefined();
    store.close();
  });

  it("attaches to an entity when given one", () => {
    const store = open();
    store.create(facts, "e1");
    const created = store.documents.createDocument({ ...doc, entityId: "e1" }, "d1");
    expect(created.entityId).toBe("e1");
    store.close();
  });

  it("stores reference fields", () => {
    const store = open();
    store.documents.createDocument(
      {
        ...doc,
        fields: [
          { label: "UBI Number", value: "604123456" },
          { label: "DUNS", value: "123456789" },
        ],
      },
      "d1",
    );
    expect(store.documents.getDocument("d1")!.fields.map((f) => f.label)).toEqual([
      "DUNS",
      "UBI Number",
    ]);
    store.close();
  });

  it("rolls back the whole document if a field insert fails", () => {
    // Otherwise a document row survives with its reference numbers silently
    // missing, which is worse than the upload failing outright.
    const store = open();
    expect(() =>
      store.documents.createDocument(
        { ...doc, fields: [{ label: "UBI", value: null as unknown as string }] },
        "d1",
      ),
    ).toThrow();
    expect(store.documents.getDocument("d1")).toBeUndefined();
    store.close();
  });
});

describe("search", () => {
  const seeded = () => {
    const store = open();
    store.documents.createDocument(
      {
        ...doc,
        title: "WA SOS formation letter",
        fields: [{ label: "UBI Number", value: "604123456" }],
      },
      "d1",
    );
    store.documents.createDocument(
      {
        ...doc,
        title: "IRS determination letter",
        storageKey: "def456",
        originalFilename: "irs-501c3.pdf",
        notes: "Exempt status approved",
        fields: [{ label: "EIN", value: "91-1234567" }],
      },
      "d2",
    );
    return store;
  };

  it("finds by a reference number buried in a document", () => {
    // The actual use case: "the UBI is in the formation letter somewhere".
    // A title-only search would never find it.
    const store = seeded();
    expect(store.documents.searchDocuments("604123456").map((d) => d.id)).toEqual(["d1"]);
    store.close();
  });

  it("finds by field label", () => {
    const store = seeded();
    expect(store.documents.searchDocuments("EIN").map((d) => d.id)).toEqual(["d2"]);
    store.close();
  });

  it("finds by title, notes, and filename", () => {
    const store = seeded();
    expect(store.documents.searchDocuments("determination").map((d) => d.id)).toEqual(["d2"]);
    expect(store.documents.searchDocuments("exempt status").map((d) => d.id)).toEqual(["d2"]);
    expect(store.documents.searchDocuments("irs-501c3").map((d) => d.id)).toEqual(["d2"]);
    store.close();
  });

  it("is case-insensitive", () => {
    const store = seeded();
    expect(store.documents.searchDocuments("FORMATION").map((d) => d.id)).toEqual(["d1"]);
    store.close();
  });

  it("returns everything for an empty query", () => {
    const store = seeded();
    expect(store.documents.searchDocuments("   ")).toHaveLength(2);
    store.close();
  });

  it("does not return a document twice when several fields match", () => {
    const store = open();
    store.documents.createDocument(
      {
        ...doc,
        fields: [
          { label: "UBI Number", value: "604123456" },
          { label: "UBI (again)", value: "604123456" },
        ],
      },
      "d1",
    );
    expect(store.documents.searchDocuments("604123456")).toHaveLength(1);
    store.close();
  });
});

describe("actions", () => {
  it("can be created with no entity and no document", () => {
    // The escape hatch: a user who does not trust the rules just wants a date.
    const store = open();
    const action = store.documents.createAction(
      { title: "File an Annual Report", dueOn: "2027-03-31" },
      "a1",
    );
    expect(action.entityId).toBeUndefined();
    expect(action.documentId).toBeUndefined();
    expect(action.completedOn).toBeUndefined();
    store.close();
  });

  it("links to the document it came from", () => {
    const store = open();
    store.documents.createDocument(doc, "d1");
    store.documents.createAction(
      { title: "File an Annual Report", dueOn: "2027-03-31", documentId: "d1" },
      "a1",
    );
    expect(store.documents.listActionsForDocument("d1").map((a) => a.id)).toEqual(["a1"]);
    store.close();
  });

  it("records WHEN it was completed, not merely that it was", () => {
    // "When did we file it" is the question asked afterwards, by an auditor or
    // by the person who cannot remember.
    const store = open();
    store.documents.createAction({ title: "File", dueOn: "2027-03-31" }, "a1");
    const done = store.documents.setActionCompleted("a1", "2027-03-20")!;
    expect(done.completedOn).toBe("2027-03-20");
    store.close();
  });

  it("can be reopened after being completed", () => {
    // Someone ticks off "filed", then the agency rejects it. Without a way back
    // the item vanishes from every reminder exactly when it matters most.
    const store = open();
    store.documents.createAction({ title: "File", dueOn: "2027-03-31" }, "a1");
    store.documents.setActionCompleted("a1", "2027-03-20");
    const reopened = store.documents.setActionCompleted("a1", undefined)!;
    expect(reopened.completedOn).toBeUndefined();
    store.close();
  });

  it("lists soonest first", () => {
    const store = open();
    store.documents.createAction({ title: "Later", dueOn: "2027-06-01" }, "a2");
    store.documents.createAction({ title: "Sooner", dueOn: "2027-01-01" }, "a1");
    expect(store.documents.listActions().map((a) => a.id)).toEqual(["a1", "a2"]);
    store.close();
  });

  it("survives its document being deleted", () => {
    // Deleting the paperwork does not mean the filing stopped being due.
    const store = open();
    store.documents.createDocument(doc, "d1");
    store.documents.createAction({ title: "File", dueOn: "2027-03-31", documentId: "d1" }, "a1");
    store.documents.deleteDocument("d1");

    const action = store.documents.getAction("a1");
    expect(action).toBeDefined();
    expect(action!.dueOn).toBe("2027-03-31");
    expect(action!.documentId).toBeUndefined();
    store.close();
  });

  it("is removed with its entity", () => {
    // Unlike a document, an action about an entity is meaningless without it.
    const store = open();
    store.create(facts, "e1");
    store.documents.createAction({ title: "File", dueOn: "2027-03-31", entityId: "e1" }, "a1");
    store.delete("e1");
    expect(store.documents.getAction("a1")).toBeUndefined();
    store.close();
  });
});

describe("reference numbers are findable however they are remembered", () => {
  const seeded = () => {
    const store = open();
    store.documents.createDocument(
      {
        ...doc,
        fields: [
          // As printed on the letter, separators and all.
          { label: "UBI Number", value: "604 123 456" },
          { label: "EIN", value: "91-1234567" },
        ],
      },
      "d1",
    );
    return store;
  };

  it.each([
    ["604 123 456", "as written"],
    ["604123456", "no separators, as typed from memory"],
    ["604-123-456", "different separators"],
  ])("finds a UBI searched as %s (%s)", (query) => {
    // The bug this exists to prevent: someone types the number the way they
    // remember it, gets nothing, and concludes the document was never uploaded.
    const store = seeded();
    expect(store.documents.searchDocuments(query).map((d) => d.id)).toEqual(["d1"]);
    store.close();
  });

  it.each(["91-1234567", "911234567"])("finds an EIN searched as %s", (query) => {
    const store = seeded();
    expect(store.documents.searchDocuments(query).map((d) => d.id)).toEqual(["d1"]);
    store.close();
  });

  it("still displays the value exactly as it was written", () => {
    // Normalisation is for MATCHING only. The displayed value has to match the
    // paper so it can be checked by eye.
    const store = seeded();
    const ubi = store.documents.getDocument("d1")!.fields.find((f) => f.label === "UBI Number");
    expect(ubi!.value).toBe("604 123 456");
    store.close();
  });

  it("does not match everything when the query has no alphanumerics", () => {
    // normalizeReference("???") is "", and an unguarded LIKE '%%' matches every
    // row — turning a nonsense search into "all your documents".
    const store = seeded();
    store.documents.createDocument({ ...doc, storageKey: "k2", title: "Unrelated" }, "d2");
    expect(store.documents.searchDocuments("???")).toHaveLength(0);
    store.close();
  });
});

describe("recurring actions", () => {
  const repeating = { title: "File an Annual Report", dueOn: "2027-03-31", repeatAnnually: true };

  it("does not repeat unless asked", () => {
    const store = open();
    store.documents.createAction({ title: "One off", dueOn: "2027-03-31" }, "a1");
    store.documents.setActionCompleted("a1", "2027-03-20");
    expect(store.documents.listActions()).toHaveLength(1);
    store.close();
  });

  it("creates next year's occurrence when completed", () => {
    // Without this, someone tracking their own dates re-adds every filing each
    // year, and the year they forget is the year they miss it.
    const store = open();
    store.documents.createAction(repeating, "a1");
    store.documents.setActionCompleted("a1", "2027-03-20");

    const all = store.documents.listActions();
    expect(all).toHaveLength(2);
    const next = all.find((a) => a.id !== "a1")!;
    expect(next.dueOn).toBe("2028-03-31");
    expect(next.completedOn).toBeUndefined();
    expect(next.repeatAnnually).toBe(true);
    store.close();
  });

  it("carries the detail and attachments onto the successor", () => {
    // The notes are what the user wants in front of them on the day; making
    // them retype next year defeats the point.
    const store = open();
    store.documents.createDocument(doc, "d1");
    store.create(facts, "e1");
    store.documents.createAction(
      { ...repeating, detail: "File online, login in 1Password", documentId: "d1", entityId: "e1" },
      "a1",
    );
    store.documents.setActionCompleted("a1", "2027-03-20");

    const next = store.documents.listActions().find((a) => a.id !== "a1")!;
    expect(next.detail).toBe("File online, login in 1Password");
    expect(next.documentId).toBe("d1");
    expect(next.entityId).toBe("e1");
    store.close();
  });

  it("does NOT spawn twice across reopen and recomplete", () => {
    // The normal path when an agency rejects a filing. Spawning again would
    // duplicate a deadline, which erodes trust in every other row on the page.
    const store = open();
    store.documents.createAction(repeating, "a1");
    store.documents.setActionCompleted("a1", "2027-03-20");
    store.documents.setActionCompleted("a1", undefined);
    store.documents.setActionCompleted("a1", "2027-03-25");

    expect(store.documents.listActions()).toHaveLength(2);
    store.close();
  });

  it("keeps the successor when the original is reopened", () => {
    // Next year's filing is still legitimately due, whatever happened to this
    // year's.
    const store = open();
    store.documents.createAction(repeating, "a1");
    store.documents.setActionCompleted("a1", "2027-03-20");
    store.documents.setActionCompleted("a1", undefined);

    const all = store.documents.listActions();
    expect(all).toHaveLength(2);
    expect(all.find((a) => a.id !== "a1")!.dueOn).toBe("2028-03-31");
    store.close();
  });

  it("clamps a leap-day due date rather than sliding into March", () => {
    const store = open();
    store.documents.createAction(
      { title: "Leap filing", dueOn: "2028-02-29", repeatAnnually: true },
      "a1",
    );
    store.documents.setActionCompleted("a1", "2028-02-20");
    const next = store.documents.listActions().find((a) => a.id !== "a1")!;
    expect(next.dueOn).toBe("2029-02-28");
    store.close();
  });

  it("chains: completing the successor spawns the one after", () => {
    const store = open();
    store.documents.createAction(repeating, "a1");
    store.documents.setActionCompleted("a1", "2027-03-20");
    const second = store.documents.listActions().find((a) => a.id !== "a1")!;
    store.documents.setActionCompleted(second.id, "2028-03-20");

    const dates = store.documents.listActions().map((a) => a.dueOn).sort();
    expect(dates).toEqual(["2027-03-31", "2028-03-31", "2029-03-31"]);
    store.close();
  });

  it("can be turned off later without affecting what already exists", () => {
    const store = open();
    store.documents.createAction(repeating, "a1");
    store.documents.updateAction("a1", { ...repeating, repeatAnnually: false });
    store.documents.setActionCompleted("a1", "2027-03-20");
    expect(store.documents.listActions()).toHaveLength(1);
    store.close();
  });
});

describe("catching up on a missed recurring filing", () => {
  it("advances by exactly one year, even when that is still in the past", () => {
    // Deliberate, and load-bearing. Completing a 2024 filing in 2026 spawns
    // 2025 — which is itself overdue — because the 2025 filing was ALSO missed
    // and is genuinely still owed. The successor lands in the dashboard's
    // Overdue section, which is where it belongs.
    //
    // The tempting "improvement" is to skip forward to the next FUTURE
    // occurrence. Do not: it silently erases obligations the user still has,
    // which is the one thing a compliance tool must never do. Catching up
    // should take several deliberate steps, one per year actually missed.
    const store = open();
    store.documents.createAction(
      { title: "File an Annual Report", dueOn: "2024-03-31", repeatAnnually: true },
      "a1",
    );
    store.documents.setActionCompleted("a1", "2026-08-01");

    const open_ = store.documents.listActions().filter((a) => !a.completedOn);
    expect(open_.map((a) => a.dueOn)).toEqual(["2025-03-31"]);
    store.close();
  });

  it("steps year by year, so no missed filing is skipped", () => {
    const store = open();
    store.documents.createAction(
      { title: "File an Annual Report", dueOn: "2024-03-31", repeatAnnually: true },
      "a1",
    );
    // Three catch-up completions produce 2025, 2026 and 2027 in turn — every
    // year accounted for, none quietly dropped.
    let current = store.documents.getAction("a1")!;
    const spawned: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      store.documents.setActionCompleted(current.id, "2026-08-01");
      const next = store.documents
        .listActions()
        .find((a) => !a.completedOn && !spawned.includes(a.dueOn))!;
      spawned.push(next.dueOn);
      current = next;
    }
    expect(spawned).toEqual(["2025-03-31", "2026-03-31", "2027-03-31"]);
    store.close();
  });
});
