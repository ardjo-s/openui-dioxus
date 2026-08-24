import assert from "node:assert/strict";
import test from "node:test";

import { validateThreeArmRecordTopology } from "../src/three-arm-record-topology.mjs";
import { THREE_ARMS, threeArmOrder } from "../src/three-arm-schedule.mjs";

function validRecords(scenarios = 2) {
  return Array.from({ length: scenarios }, (_, index) => {
    const passage = index + 1;
    return THREE_ARMS.map((protocol) => ({
      passage,
      protocol,
      order_position: threeArmOrder(passage).indexOf(protocol),
      attempt: 1,
      accepted: true,
    }));
  }).flat();
}

test("accepts complete three-arm topology", () => {
  const records = validRecords();
  assert.equal(
    validateThreeArmRecordTopology(records, { calls: records.length, pairs_requested: 2 }).ok,
    true,
  );
});

test("rejects missing arms, wrong order, and repair after acceptance", () => {
  const missing = validRecords();
  missing.pop();
  assert.equal(
    validateThreeArmRecordTopology(missing, { calls: missing.length, pairs_requested: 2 }).ok,
    false,
  );
  const wrongOrder = validRecords();
  wrongOrder[0].order_position = 2;
  assert.equal(
    validateThreeArmRecordTopology(wrongOrder, { calls: wrongOrder.length, pairs_requested: 2 }).ok,
    false,
  );
  const repaired = validRecords();
  repaired.push({ ...repaired[0], attempt: 2 });
  assert.equal(
    validateThreeArmRecordTopology(repaired, { calls: repaired.length, pairs_requested: 2 }).ok,
    false,
  );
});
