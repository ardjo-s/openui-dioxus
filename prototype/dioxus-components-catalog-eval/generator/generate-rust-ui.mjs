import { resolve } from "node:path";

import { writeArtifacts } from "./src/catalog-generator.mjs";

const output = process.argv[2]
  ? resolve(process.argv[2])
  : new URL("../generated-rust-ui/", import.meta.url).pathname;

await writeArtifacts(output, {
  manifestUrl: new URL("../catalog/rust-ui-manifest.json", import.meta.url),
  adapterSource: "../../src/rust_ui.rs",
  buildPrefix: "ope10",
});
