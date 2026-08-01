/**
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { node: true, es2022: true },
  ignorePatterns: ["dist/", "node_modules/", "**/generated.ts", "coverage/"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  overrides: [
    {
      files: ["**/test/**/*.ts"],
      env: { jest: true },
      rules: {
        // The schema-parity test compares runtime values on purpose; a static
        // import would make a mismatch a type error rather than a value diff.
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
      },
    },
  ],
};
