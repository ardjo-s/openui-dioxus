export function validateControlledRecordTopology(records, generation) {
  const diagnostics = [];
  if (generation.calls !== records.length) {
    diagnostics.push(`generation.calls=${generation.calls} but records=${records.length}`);
  }
  const grouped = new Map();
  const seen = new Set();
  for (const record of records) {
    const attemptKey = `${record.passage}:${record.protocol}:${record.attempt}`;
    if (seen.has(attemptKey)) diagnostics.push(`duplicate attempt ${attemptKey}`);
    seen.add(attemptKey);
    const armKey = `${record.passage}:${record.protocol}`;
    const arm = grouped.get(armKey) ?? [];
    arm.push(record);
    grouped.set(armKey, arm);
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
