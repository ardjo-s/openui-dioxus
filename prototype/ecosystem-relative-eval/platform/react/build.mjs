import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

import { generatePlatformFixtures } from "../generate-fixtures.mjs";
import { jsonRenderManifest } from "../../src/json-render-catalog.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(here, "dist");

export async function buildReactApp() {
  const generated = await generatePlatformFixtures();
  const fixturePath = process.env.OPE11_JSON_RENDER_FIXTURE ?? generated.react;
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  await mkdir(output, { recursive: true });
  const bundle = path.join(output, "app.js");
  await build({
    entryPoints: [path.join(here, "app.tsx")],
    outfile: bundle,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    jsx: "automatic",
    sourcemap: true,
    define: {
      __OPE11_JSON_RENDER_FIXTURE__: JSON.stringify(fixture),
    },
    logLevel: "silent",
  });
  const index = path.join(output, "index.html");
  await cp(path.join(here, "index.html"), index);
  await readFile(bundle);
  return { bundle, index, component_count: jsonRenderManifest.components.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildReactApp();
}
