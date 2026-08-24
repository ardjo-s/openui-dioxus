import { THREE_ARMS, threeArmOrder } from "./three-arm-schedule.mjs";

export function validateThreeArmRecordTopology(records, generation) {
  const diagnostics = [];
  const scenarios = generation.pairs_requested;
  if (generation.calls !== records.length) {
    diagnostics.push(`generation.calls=${generation.calls} but records=${records.length}`);
  }
  if (generation.calls < scenarios * THREE_ARMS.length || generation.calls > scenarios * 6) {
    diagnostics.push(`call count outside ${scenarios * 3}-${scenarios * 6}`);
  }
  const grouped = new Map();
  const seen = new Set();
  for (const record of records) {
    if (!THREE_ARMS.includes(record.protocol)) {
      diagnostics.push(`unknown arm ${record.protocol}`);
      continue;
    }
    const attemptKey = `${record.passage}:${record.protocol}:${record.attempt}`;
    if (seen.has(attemptKey)) diagnostics.push(`duplicate attempt ${attemptKey}`);
    seen.add(attemptKey);
    const expectedPosition = threeArmOrder(record.passage).indexOf(record.protocol);
    if (record.order_position !== expectedPosition) {
      diagnostics.push(`wrong order position for ${attemptKey}`);
    }
    const armKey = `${record.passage}:${record.protocol}`;
    const arm = grouped.get(armKey) ?? [];
    arm.push(record);
    grouped.set(armKey, arm);
  }
  for (let passage = 1; passage <= scenarios; passage += 1) {
    for (const arm of THREE_ARMS) {
      if (!grouped.has(`${passage}:${arm}`)) diagnostics.push(`missing ${passage}:${arm}`);
    }
  }
  for (const [armKey, arm] of grouped) {
    arm.sort((left, right) => left.attempt - right.attempt);
    if (arm.length < 1 || arm.length > 2) diagnostics.push(`invalid attempt count for ${armKey}`);
    if (arm.some((record, index) => record.attempt !== index + 1)) {
      diagnostics.push(`non-contiguous attempts for ${armKey}`);
    }
    if (arm.length === 2 && arm[0].accepted) {
      diagnostics.push(`repair followed accepted attempt for ${armKey}`);
    }
  }
  return { ok: diagnostics.length === 0, diagnostics };
}
