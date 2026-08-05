/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
/** @type {import('next').NextConfig} */
export default {
  /**
   * `standalone` traces exactly the files the server needs into one directory,
   * so the runtime image can be a bare node:alpine with no node_modules install
   * and no package manager. That is what keeps the self-host image small enough
   * to pull on a Pi.
   */
  output: "standalone",
  /**
   * Both packages ship TypeScript source rather than a bundle, for Panda's
   * sake, so Next has to compile them itself.
   */
  transpilePackages: ["stonedog-style", "@optima-compliance/ui"],
  experimental: {
    // The store is a singleton holding an open SQLite handle. Without this,
    // Next's bundler would try to trace node:sqlite into the client graph.
    serverComponentsExternalPackages: ["node:sqlite"],
  },
};
