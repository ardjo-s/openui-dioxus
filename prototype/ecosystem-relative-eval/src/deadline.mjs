export function boundedTimeout(deadlineMs, maximumMs, label) {
  const remaining = Math.floor(deadlineMs - performance.now());
  if (remaining <= 0) throw new Error(`canary deadline reached before ${label}`);
  return Math.max(1, Math.min(maximumMs, remaining));
}
