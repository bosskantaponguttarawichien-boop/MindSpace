import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];

async function read(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch (error) {
    failures.push(`${relativePath}: cannot read (${error.code ?? error.message})`);
    return "";
  }
}

const rawConfig = await read("harness.config.json");
let config;
try {
  config = JSON.parse(rawConfig);
} catch (error) {
  failures.push(`harness.config.json: invalid JSON (${error.message})`);
}

if (config) {
  for (const key of ["version", "project", "currentPhase", "sources", "requiredDocuments", "validation"]) {
    if (!(key in config)) failures.push(`harness.config.json: missing ${key}`);
  }
  const files = [
    config.sources?.product,
    config.sources?.visualReference,
    config.sources?.agentEntryPoint,
    ...(config.requiredDocuments ?? []),
  ].filter(Boolean);
  for (const relativePath of new Set(files)) {
    try {
      await access(path.join(root, relativePath));
    } catch {
      failures.push(`${relativePath}: required Harness file is missing`);
    }
  }
}

const agentContract = await read("AGENTS.md");
for (const heading of ["## Source of truth", "## Current delivery boundary", "## Mandatory workflow", "## Non-negotiable rules"]) {
  if (!agentContract.includes(heading)) failures.push(`AGENTS.md: missing '${heading}'`);
}

const scope = await read("docs/harness/product-scope.md");
for (const heading of ["## Current phase: Phase 2 — Personal board persistence", "### In scope", "### Explicitly out of scope", "## Phase 2 acceptance criteria"]) {
  if (!scope.includes(heading)) failures.push(`product-scope.md: missing '${heading}'`);
}

if (failures.length) {
  console.error("Harness validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Harness validation passed.");
}
