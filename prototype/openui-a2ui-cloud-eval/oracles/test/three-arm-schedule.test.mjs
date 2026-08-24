import assert from "node:assert/strict";
import test from "node:test";

import { buildThreeArmSchedule, THREE_ARMS } from "../src/three-arm-schedule.mjs";

test("the frozen schedule balances every pairwise relative order ten to ten", () => {
  const schedule = buildThreeArmSchedule();
  assert.equal(schedule.length, 20);
  for (const item of schedule) assert.deepEqual([...item.order].sort(), [...THREE_ARMS].sort());
  for (let left = 0; left < THREE_ARMS.length; left += 1) {
    for (let right = left + 1; right < THREE_ARMS.length; right += 1) {
      const a = THREE_ARMS[left];
      const b = THREE_ARMS[right];
      const aFirst = schedule.filter((item) => item.order.indexOf(a) < item.order.indexOf(b)).length;
      assert.equal(aFirst, 10, `${a}/${b}`);
    }
  }
});

test("each scenario pair uses exact reverse order and positions are maximally balanced", () => {
  const schedule = buildThreeArmSchedule();
  for (let index = 0; index < schedule.length; index += 2) {
    assert.deepEqual(schedule[index + 1].order, [...schedule[index].order].reverse());
  }
  for (const arm of THREE_ARMS) {
    const counts = [0, 1, 2].map(
      (position) => schedule.filter((item) => item.order[position] === arm).length,
    );
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 2, `${arm}: ${counts}`);
  }
});
