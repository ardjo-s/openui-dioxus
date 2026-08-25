#!/usr/bin/env node
import path from "node:path";

import { verifyEvidencePublication } from "../src/evidence-publication.mjs";

const directory = path.resolve(process.argv[2] ?? "evidence/candidate-canary");
const result = await verifyEvidencePublication(directory);
process.stdout.write(`${JSON.stringify(result)}\n`);
