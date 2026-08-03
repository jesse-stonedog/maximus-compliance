/**
 * Regenerates `src/generated.ts` from the rule JSON on disk.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * The rules are inlined into a TypeScript module rather than read from disk at
 * runtime, because `@optima/engine` is pure and must run in a browser: a
 * consumer that had to `fs.readFile` a rule pack could not. The generated file
 * is committed, and `--check` fails the gate when it is stale, so a rule added
 * without regenerating is caught at merge rather than going silently missing
 * from everyone's calendar.
 *
 *   node scripts/build-barrel.mjs           # write
 *   node scripts/build-barrel.mjs --check   # fail if stale
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const rulesRoot = join(packageRoot, "us");
const outputPath = join(packageRoot, "src", "generated.ts");

/** Every rule JSON under `us/`, depth-first, in a stable order. */
export async function findRuleFiles(dir = rulesRoot) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await findRuleFiles(full)));
    else if (entry.name.endsWith(".json")) files.push(full);
  }
  return files;
}

export async function loadRules() {
  const files = await findRuleFiles();
  const rules = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(file, "utf8"));
    // `$schema` is an editor affordance, not part of the rule. Strip it so the
    // shipped data matches the Rule type exactly.
    const { $schema: _schema, ...rule } = raw;
    rules.push({ rule, file });
  }
  rules.sort((a, b) => a.rule.id.localeCompare(b.rule.id));
  return rules;
}

function render(rules) {
  const body = rules
    .map(({ rule, file }) => {
      const source = relative(packageRoot, file).replaceAll("\\", "/");
      return `  // ${source}\n${JSON.stringify(rule, null, 2)
        .split("\n")
        .map((line) => `  ${line}`)
        .join("\n")},`;
    })
    .join("\n");

  return `/**
 * GENERATED — do not hand-edit. Run \`npm run rules:barrel\`.
 *
 * Copyright (C) 2026 StoneDogCode L.L.C.
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Rule } from "@optima/engine";

export const ALL_RULES: readonly Rule[] = [
${body}
] as const;
`;
}

// Only when run as a command. `validate.mjs` and `staleness.mjs` import
// `loadRules` from here, and a module that rewrites a committed file just for
// being imported would make the validator's own `--check` meaningless.
const isEntryPoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  const rules = await loadRules();
  const rendered = render(rules);

  if (process.argv.includes("--check")) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== rendered) {
      console.error(
        `src/generated.ts is stale (${rules.length} rules on disk). Run: npm run rules:barrel`,
      );
      process.exit(1);
    }
    console.log(`rules barrel up to date (${rules.length} rules)`);
  } else {
    await writeFile(outputPath, rendered);
    console.log(`wrote src/generated.ts (${rules.length} rules)`);
  }
}
