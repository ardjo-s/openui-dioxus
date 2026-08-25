import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "709cff1";
const head = process.argv[3] ?? "HEAD";
const root = new URL("../", import.meta.url);
const activity = JSON.parse(readFileSync(new URL("evidence/ope10-activity.json", root)));
const numstat = execFileSync("git", ["diff", "--numstat", base, head, "--", "prototype/dioxus-components-catalog-eval", "GATES.md"], { encoding: "utf8" });
const categories = {};
for (const line of numstat.trim().split("\n").filter(Boolean)) {
  const [added, removed, file] = line.split("\t");
  let category = "handwritten";
  if (file.includes("generated-rust-ui/")) category = "generated";
  else if (file.includes("/test/") || file.includes("/tests/")) category = "test";
  else if (file.includes("catalog/rust-ui-manifest") || file.includes("rust_ui_upstream/")) category = "catalog";
  else if (/src\/(rust_ui|lib)\.rs|Cargo\.(toml|lock)/.test(file)) category = "adapter";
  else if (file.includes("platform")) category = "platform";
  categories[category] ??= { added_loc: 0, removed_loc: 0, files: 0 };
  categories[category].added_loc += Number(added);
  categories[category].removed_loc += Number(removed);
  categories[category].files += 1;
}
const activeSeconds = activity.intervals.reduce((total, interval) => total + interval.active_seconds, 0);
const nonGenerated = Object.entries(categories).filter(([name]) => name !== "generated").reduce((total, [, value]) => total + value.added_loc, 0);
const families = 8;
process.stdout.write(`${JSON.stringify({
  base,
  head,
  categories,
  active_seconds: activeSeconds,
  active_hours: activeSeconds / 3600,
  hard_gate_hours: 16,
  hard_gate_pass: activeSeconds <= 16 * 3600,
  normalized_per_family: {
    active_minutes: activeSeconds / 60 / families,
    non_generated_added_loc: nonGenerated / families,
    generated_added_loc: (categories.generated?.added_loc ?? 0) / families,
  },
  failures: activity.failures,
}, null, 2)}\n`);
