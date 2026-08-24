export function evidenceStatus(platforms) {
  const values = Object.values(platforms);
  if (values.every((platform) => platform.passed === true && platform.evidence_complete === true)) {
    return "PASS";
  }
  if (values.some((platform) => platform.status === "INVALID_EVAL")) {
    return "INVALID_EVAL";
  }
  return "FAIL";
}
