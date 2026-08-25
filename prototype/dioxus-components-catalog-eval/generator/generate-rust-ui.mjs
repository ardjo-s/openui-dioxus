import { resolve } from "node:path";

import { writeArtifacts } from "./src/catalog-generator.mjs";

const output = process.argv[2]
  ? resolve(process.argv[2])
  : new URL("../generated-rust-ui/", import.meta.url).pathname;

await writeArtifacts(output, {
  manifestUrl: new URL("../catalog/rust-ui-manifest.json", import.meta.url),
  adapterSources: [
    "../../Cargo.toml",
    "../../Cargo.lock",
    "../../src/lib.rs",
    "../../src/catalog_evidence.rs",
    "../../src/rust_ui.rs",
    "../../src/rust_ui_upstream/mod.rs",
    "../../src/rust_ui_upstream/alert.rs",
    "../../src/rust_ui_upstream/button.rs",
    "../../src/rust_ui_upstream/card.rs",
    "../../src/rust_ui_upstream/checkbox.rs",
    "../../src/rust_ui_upstream/input.rs",
    "../../src/rust_ui_upstream/label.rs",
    "../../src/rust_ui_upstream/progress.rs",
    "../../src/rust_ui_upstream/table.rs",
  ],
  buildPrefix: "ope10",
});
