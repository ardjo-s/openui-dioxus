import { writeArtifacts } from "./src/catalog-generator.mjs";
import { resolve } from "node:path";

const output = process.argv[2] ? resolve(process.argv[2]) : new URL("../generated/", import.meta.url).pathname;
await writeArtifacts(output);
