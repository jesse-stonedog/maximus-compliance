/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The packages ship as ESM with NodeNext resolution, so their intra-package
 * imports carry `.js` extensions that point at TypeScript sources during a test
 * run. `moduleNameMapper` strips them; without it every import fails with
 * "Cannot find module './facts.js'".
 *
 * Tests themselves compile to CommonJS (see tsconfig.test.json) — that is a
 * test-harness choice and does not affect what the packages emit.
 */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/packages", "<rootDir>/apps"],
  testMatch: ["**/test/**/*.test.ts"],
  moduleNameMapper: {
    // Workspace packages resolve to SOURCE, not to dist. An app's tests must
    // not depend on a build step having run first, or a clean checkout fails
    // its own suite in a way that looks like a code error.
    "^@maximus/engine$": "<rootDir>/packages/engine/src/index.ts",
    "^@maximus/rules$": "<rootDir>/packages/rules/src/index.ts",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
};
