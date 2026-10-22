// Node loader hooks that let the storefront test suite render real React
// components.
//
// The project ships Vite as a dev dependency, so Vite's own JSX transformer is
// used instead of adding a separate test dependency. Stylesheets and media
// files are replaced with empty modules: they carry no behaviour worth
// asserting on and Node cannot load them. Relative imports are resolved the
// way the bundler resolves them, so source files can keep their existing
// extensionless import style.

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";

const SCRIPT_EXTENSIONS = [".jsx"];
const STUB_EXTENSIONS = [
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
  ".gif",
  ".mp4",
  ".webm",
];
const RESOLUTION_SUFFIXES = ["", ".js", ".jsx", "/index.js", "/index.jsx"];

const endsWithAny = (value, extensions) =>
  extensions.some((extension) => value.split("?")[0].endsWith(extension));

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const parentURL = context.parentURL ?? pathToFileURL(`${process.cwd()}/`).href;
    const baseUrl = new URL(specifier, parentURL);

    for (const suffix of RESOLUTION_SUFFIXES) {
      const candidate = new URL(baseUrl.href + suffix);
      if (!existsSync(fileURLToPath(candidate))) continue;

      if (endsWithAny(candidate.href, [...SCRIPT_EXTENSIONS, ...STUB_EXTENSIONS])) {
        return { url: candidate.href, format: "module", shortCircuit: true };
      }

      return nextResolve(candidate.href, context);
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (endsWithAny(url, STUB_EXTENSIONS)) {
    const isStylesheet = url.split("?")[0].endsWith(".css");
    return {
      format: "module",
      source: isStylesheet ? 'export default "";' : 'export default "asset-stub";',
      shortCircuit: true,
    };
  }

  if (endsWithAny(url, SCRIPT_EXTENSIONS)) {
    const filename = fileURLToPath(url);
    const source = await readFile(filename, "utf8");
    const { code } = await transformWithOxc(source, filename, { lang: "jsx" });
    return { format: "module", source: code, shortCircuit: true };
  }

  return nextLoad(url, context);
}
