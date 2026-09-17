// pdfjs-dist loads its CMaps, standard fonts, ICC profile, and image-codec wasm at runtime by URL.
// They are copied into public/ at build time instead of being committed, so a scanned, CJK, or
// non-embedded-font PDF still renders its page when a board imports it.
import { cp, mkdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const packageRoot = dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"));
const target = join(process.cwd(), "public", "pdfjs");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const asset of ["cmaps", "iccs", "standard_fonts", "wasm"]) {
  await cp(join(packageRoot, asset), join(target, asset), { recursive: true });
}
