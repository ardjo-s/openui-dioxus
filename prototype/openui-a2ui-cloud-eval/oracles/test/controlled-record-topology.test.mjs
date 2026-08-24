import assert from "node:assert/strict";
import test from "node:test";

import { validateControlledRecordTopology } from "../src/controlled-record-topology.mjs";

const record = (attempt, accepted = false) => ({
  passage: 1,
  protocol: "openui",
  attempt,
  accepted,
});

test("accepts one first attempt and at most one repair after failure", () => {
  assert.equal(validateControlledRecordTopology([record(1)], { calls: 1 }).ok, true);
  assert.equal(validateControlledRecordTopology([record(1), record(2, true)], { calls: 2 }).ok, true);
});

test("rejects mismatched calls, duplicates, gaps, extra repairs, and repair after success", () => {
  const cases = [
    { records: [record(1)], calls: 2 },
    { records: [record(1), record(1)], calls: 2 },
    { records: [record(2)], calls: 1 },
    { records: [record(1), record(2), record(3)], calls: 3 },
    { records: [record(1, true), record(2, true)], calls: 2 },
  ];
  for (const value of cases) {
    assert.equal(
      validateControlledRecordTopology(value.records, { calls: value.calls }).ok,
      false,
    );
  }
});
