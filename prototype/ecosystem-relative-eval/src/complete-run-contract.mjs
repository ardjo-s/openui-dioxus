import { createHash } from "node:crypto";

export const COMPLETE_HUMAN_EVIDENCE_FIELDS = Object.freeze([
  "corrections",
  "reviews",
  "keyboard",
  "voiceover",
  "talkback",
  "mobile",
  "replay",
  "migration",
  "drills",
  "costs",
  "applicability",
]);

const routes = Object.freeze(["openui", "typed-json", "json-render", "direct-rsx"]);
const forbiddenOutcomes = new Set(["GO_OPENUI_DIOXUS", "PIVOT_TO_SURFACE_RUNTIME", "NO_GO"]);
const hashPattern = /^[a-f0-9]{64}$/u;
const performedKeys = ["artifact_sha256", "estimated", "id", "passed", "performed", "platform"];
const performedRequirements = Object.freeze({
  keyboard: Object.freeze({ "keyboard-web": "web", "keyboard-desktop": "desktop" }),
  voiceover: Object.freeze({ "voiceover-ios": "ios" }),
  talkback: Object.freeze({ "talkback-android": "android" }),
  mobile: Object.freeze({ "mobile-ios": "ios", "mobile-android": "android" }),
  replay: Object.freeze({ replay: "all" }),
  migration: Object.freeze({ migration: "all" }),
  drills: Object.freeze({
    "component-prop": "all",
    "schema-component": "all",
    "action-policy": "all",
    "dtcg-token": "all",
    "catalog-release": "all",
  }),
  applicability: Object.freeze({ "route-applicability": "all" }),
});
const leakPatterns = Object.freeze([
  { class: "route", pattern: /\b(?:openui|typed-json|json-render|direct-rsx)\b/iu },
  { class: "syntax", pattern: /(?:definecomponent|createlibrary|generatesystemprompt|\brsx!|\bfn\s+main\b|\buse\s+[a-z_:]+;|\bimport\s+.+\bfrom\b|<\/?[a-z][^>]*>)/iu },
  { class: "path", pattern: /(?:\/(?:users|home|tmp|private|var)\/|[a-z]:\\|(?:^|["'\s])(?:src|prototype|packages?)\/|\.(?:rs|tsx?|jsx?|toml)\b)/iu },
  { class: "metric", pattern: /\b(?:token(?:s|_count)?|latency|provider|model|reasoning|cost|price|usd|prompt[_ -]?size)\b/iu },
  { class: "technology", pattern: /\b(?:dioxus|react|rust|typescript|javascript|a2ui|radix|shadcn|figma)\b/iu },
]);

export function buildCompleteSchedule(cohorts) {
  if (cohorts?.runtime_uncertain?.length !== 20 || cohorts?.compile_known?.length !== 5) {
    throw new Error("complete schedule requires 20 runtime-uncertain and 5 compile-known scenarios");
  }
  const cells = [];
  const runtimeRoutes = routes.slice(0, 3);
  for (const [scenarioIndex, scenario] of cohorts.runtime_uncertain.entries()) {
    const ordered = rotate(runtimeRoutes, scenarioIndex % runtimeRoutes.length);
    for (const [orderPosition, route] of ordered.entries()) cells.push(cell("runtime-uncertain", scenario.id, route, orderPosition));
  }
  for (const [scenarioIndex, scenario] of cohorts.compile_known.entries()) {
    const ordered = rotate(routes, scenarioIndex % routes.length);
    for (const [orderPosition, route] of ordered.entries()) cells.push(cell("compile-known", scenario.id, route, orderPosition));
  }
  const schedule = cells.map((entry, index) => ({ ...entry, prompt_id: `complete-${String(index + 1).padStart(2, "0")}` }));
  const uniqueCells = new Set(schedule.map((entry) => `${entry.cohort}:${entry.scenario_id}:${entry.route}`));
  if (schedule.length !== 80 || uniqueCells.size !== schedule.length) throw new Error("complete schedule is not an exact 80-cell matrix");
  return schedule;
}

export function validateHumanEvidence(manifest, evidence, { packets = null } = {}) {
  const diagnostics = [];
  const source = isPlainObject(evidence) ? evidence : {};
  for (const field of Object.keys(source)) {
    if (!COMPLETE_HUMAN_EVIDENCE_FIELDS.includes(field)) diagnostics.push(diag(field, "unknown-evidence-class"));
  }
  for (const field of COMPLETE_HUMAN_EVIDENCE_FIELDS) {
    if (!Array.isArray(source[field]) || source[field].length === 0) diagnostics.push(diag(field, "missing-evidence"));
  }

  if (Array.isArray(source.corrections)) validateCorrections(manifest, source.corrections, diagnostics);
  if (Array.isArray(source.reviews)) validateReviews(manifest, source.reviews, diagnostics, packets);
  for (const field of Object.keys(performedRequirements)) {
    if (Array.isArray(source[field])) validatePerformed(field, source[field], performedRequirements[field], diagnostics);
  }
  if (Array.isArray(source.costs)) validateCosts(source.costs, diagnostics);
  return { passed: diagnostics.length === 0, diagnostics };
}

export function completeHumanEvidenceFixture(manifest, { packets = null, artifactSha = "a".repeat(64) } = {}) {
  if (!hashPattern.test(artifactSha)) throw new Error("complete human evidence fixture requires an artifact SHA-256");
  const scheduleById = new Map(manifest.complete_run.schedule.map((cell) => [cell.prompt_id, cell]));
  const packetReferences = packets === null
    ? [{ packet_id: "packet-fixture-001", packet_sha256: "b".repeat(64) }]
    : packets.map((packet) => ({ packet_id: packet.packet_id, packet_sha256: packet.packet_sha256 }));
  const performed = (id, platform) => ({ id, platform, performed: true, passed: true, estimated: false, artifact_sha256: artifactSha });
  return {
    corrections: manifest.review_plan.correction_operator_slots.map((operator_id, index) => ({
      operator_id,
      practice_completed: true,
      assigned_routes: [...manifest.review_plan.correction_assignment[operator_id]],
      estimated: false,
      artifact_sha256: artifactSha,
      measurements: manifest.complete_run.evidence_contract.correction_cell_assignment[operator_id].map((cellId, cellIndex) => ({
        cell_id: cellId,
        route: scheduleById.get(cellId).route,
        scenario_id: scheduleById.get(cellId).scenario_id,
        active_seconds: 120 + index + cellIndex,
        correction_required: cellIndex % 2 === 0,
        passed: true,
        estimated: false,
        artifact_sha256: artifactSha,
      })),
    })),
    reviews: manifest.review_plan.blind_reviewer_slots.map((slot) => ({
      reviewer_id: slot.id,
      specialty: slot.specialty,
      experience_years: 3,
      conflict_attested: true,
      route_labels_seen: false,
      identity_commitment_verified: true,
      scored_packet_ids: packetReferences.map((packet) => packet.packet_id),
      packet_openings: packetReferences.map((packet) => ({
        packet_id: packet.packet_id,
        packet_sha256: packet.packet_sha256,
        reviewer_id: slot.id,
        opened_at: "2026-08-27T00:00:00.000Z",
        route_labels_seen: false,
      })),
      scores: packetReferences.map((packet) => ({
        packet_id: packet.packet_id,
        ...Object.fromEntries(manifest.review_plan.ui_quality_rubric.dimensions.map((dimension) => [dimension, 3])),
        route_guess: "unknown",
        scored_before_route_guess: true,
        artifact_sha256: artifactSha,
      })),
      route_guess_recorded_after_scoring: true,
      artifact_sha256: artifactSha,
    })),
    keyboard: [performed("keyboard-web", "web"), performed("keyboard-desktop", "desktop")],
    voiceover: [performed("voiceover-ios", "ios")],
    talkback: [performed("talkback-android", "android")],
    mobile: [performed("mobile-ios", "ios"), performed("mobile-android", "android")],
    replay: [performed("replay", "all")],
    migration: [performed("migration", "all")],
    drills: Object.entries(performedRequirements.drills).map(([id, platform]) => performed(id, platform)),
    costs: [
      { id: "first-adoption", amount: 1, currency: "USD", basis: "measured", estimated: false, artifact_sha256: artifactSha },
      { id: "steady-state", amount: 1, currency: "USD", basis: "measured", estimated: false, artifact_sha256: artifactSha },
    ],
    applicability: [performed("route-applicability", "all")],
  };
}

export function buildBlindedPackets(records, seed) {
  if (!Array.isArray(records) || records.length === 0) throw new Error("blinded packets require records");
  if (typeof seed !== "string" || !seed) throw new Error("blinded packets require the registered seed");
  const ordered = records.map((record) => {
    const artifactSha = record.artifact_sha256 ?? record.artifact_hashes?.platform_artifact_sha256;
    if (!hashPattern.test(artifactSha ?? "")) throw new Error("blinded packet record requires an artifact SHA-256");
    if (typeof record.scenario_id !== "string" || !isPlainObject(record.task_contract) || !Array.isArray(record.screenshots) || typeof record.behavior_recording !== "string") {
      throw new Error("malformed blinded packet record");
    }
    const sourceIdentity = hashPattern.test(record.source_identity_sha256 ?? "") ? record.source_identity_sha256 : artifactSha;
    return { record, artifactSha, order: digest(`${seed}:${record.scenario_id}:${sourceIdentity}`) };
  }).sort((left, right) => left.order.localeCompare(right.order));

  return ordered.map(({ record }, index) => {
    const content = {
      packet_id: `packet-${String(index + 1).padStart(3, "0")}`,
      scenario_id: record.scenario_id,
      task_contract: structuredClone(record.task_contract),
      screenshots: structuredClone(record.screenshots),
      behavior_recording: record.behavior_recording,
      immutable_after_opening: true,
    };
    const packet = { ...content, packet_sha256: digest(stableJson(content)) };
    const findings = scanPacketLeaks(packet);
    if (findings.length) throw new Error(`blinded packet leakage: ${findings.map((finding) => finding.class).join(",")}`);
    return deepFreeze(packet);
  });
}

export function scanPacketLeaks(packet) {
  const text = JSON.stringify(packet);
  return leakPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ class: className, pattern }) => ({ class: className, match: text.match(pattern)?.[0] ?? null }));
}

export function validatePacketOpening(packet, opening) {
  const diagnostics = [];
  if (!isPlainObject(packet) || !isPlainObject(opening)) return { passed: false, diagnostics: [diag("packet", "malformed-opening")] };
  const { packet_sha256: claimedHash, ...content } = packet;
  if (!hashPattern.test(claimedHash ?? "") || digest(stableJson(content)) !== claimedHash) diagnostics.push(diag("packet", "content-hash-mismatch"));
  if (opening.packet_id !== packet.packet_id || opening.packet_sha256 !== claimedHash) diagnostics.push(diag("packet", "opening-hash-mismatch"));
  if (typeof opening.reviewer_id !== "string" || !opening.reviewer_id) diagnostics.push(diag("packet", "missing-reviewer"));
  if (Number.isNaN(Date.parse(opening.opened_at))) diagnostics.push(diag("packet", "invalid-opened-at"));
  if (opening.route_labels_seen !== false || packet.immutable_after_opening !== true) diagnostics.push(diag("packet", "unblinded-or-mutable"));
  return { passed: diagnostics.length === 0, diagnostics };
}

export function finalizeDecisionGrade({ generationComplete, platformComplete, humanEvidence, manifest, requestedOutcome = null, packets = null }) {
  const diagnostics = [];
  if (requestedOutcome && forbiddenOutcomes.has(requestedOutcome)) diagnostics.push(diag("outcome", "product-verdict-forbidden"));
  if (!generationComplete) diagnostics.push(diag("generation", "incomplete"));
  if (!platformComplete) diagnostics.push(diag("platform", "incomplete"));
  diagnostics.push(...validateHumanEvidence(manifest, humanEvidence, { packets }).diagnostics);
  return { outcome: diagnostics.length ? "INVALID_EVAL" : "READY_FOR_REVIEW", diagnostics };
}

function validateCorrections(manifest, corrections, diagnostics) {
  const expectedIds = manifest.review_plan.correction_operator_slots;
  const scheduleById = new Map(manifest.complete_run.schedule.map((cell) => [cell.prompt_id, cell]));
  const assignment = manifest.complete_run.evidence_contract.correction_cell_assignment;
  const assignedCells = expectedIds.flatMap((operatorId) => assignment?.[operatorId] ?? []);
  if (!sameSet(assignedCells, [...scheduleById.keys()])) diagnostics.push(diag("corrections", "invalid-cell-assignment-contract"));
  if (!sameSet(corrections.map((entry) => entry?.operator_id), expectedIds)) diagnostics.push(diag("corrections", "operator-roster-mismatch"));
  for (const entry of corrections) {
    const expectedRoutes = manifest.review_plan.correction_assignment[entry?.operator_id];
    const expectedCells = assignment?.[entry?.operator_id];
    const measurementsValid = Array.isArray(entry?.measurements)
      && Array.isArray(expectedCells)
      && sameSet(entry.measurements.map((measurement) => measurement?.cell_id), expectedCells)
      && sameSet([...new Set(entry.measurements.map((measurement) => measurement?.route))], expectedRoutes ?? [])
      && entry.measurements.every((measurement) => {
        const registeredCell = scheduleById.get(measurement?.cell_id);
        return exactKeys(measurement, ["active_seconds", "artifact_sha256", "cell_id", "correction_required", "estimated", "passed", "route", "scenario_id"])
        && typeof measurement.cell_id === "string"
        && measurement.cell_id.length > 0
        && registeredCell?.route === measurement.route
        && registeredCell?.scenario_id === measurement.scenario_id
        && expectedRoutes?.includes(measurement.route)
        && typeof measurement.scenario_id === "string"
        && measurement.scenario_id.length > 0
        && Number.isFinite(measurement.active_seconds)
        && measurement.active_seconds > 0
        && typeof measurement.correction_required === "boolean"
        && measurement.passed === true
        && measurement.estimated === false
        && hashPattern.test(measurement.artifact_sha256 ?? "");
      });
    if (!exactKeys(entry, ["artifact_sha256", "assigned_routes", "estimated", "measurements", "operator_id", "practice_completed"])
      || entry.practice_completed !== true
      || entry.estimated !== false
      || !hashPattern.test(entry.artifact_sha256 ?? "")
      || !Array.isArray(expectedRoutes)
      || JSON.stringify(entry.assigned_routes) !== JSON.stringify(expectedRoutes)
      || !measurementsValid) {
      diagnostics.push(diag("corrections", "malformed-correction-record"));
    }
  }
}

function validateReviews(manifest, reviews, diagnostics, packets) {
  const slots = new Map(manifest.review_plan.blind_reviewer_slots.map((slot) => [slot.id, slot]));
  const packetMap = packets === null ? null : new Map(packets.map((packet) => [packet.packet_id, packet]));
  const expectedPacketIds = packetMap === null ? null : [...packetMap.keys()];
  if (!sameSet(reviews.map((entry) => entry?.reviewer_id), [...slots.keys()])) diagnostics.push(diag("reviews", "reviewer-roster-mismatch"));
  for (const entry of reviews) {
    const slot = slots.get(entry?.reviewer_id);
    const packetRosterValid = Array.isArray(entry?.scored_packet_ids)
      && entry.scored_packet_ids.length > 0
      && new Set(entry.scored_packet_ids).size === entry.scored_packet_ids.length
      && (expectedPacketIds === null || sameSet(entry.scored_packet_ids, expectedPacketIds));
    const openingRosterValid = Array.isArray(entry?.packet_openings)
      && sameSet(entry.packet_openings.map((opening) => opening?.packet_id), entry.scored_packet_ids ?? [])
      && entry.packet_openings.every((opening) => validOpeningShape(opening, entry.reviewer_id))
      && (packetMap === null || entry.packet_openings.every((opening) => validatePacketOpening(packetMap.get(opening.packet_id), opening).passed));
    const scoresValid = Array.isArray(entry?.scores)
      && sameSet(entry.scores.map((score) => score?.packet_id), entry.scored_packet_ids ?? [])
      && entry.scores.every((score) => validReviewScore(score, manifest.review_plan.ui_quality_rubric.dimensions));
    if (!exactKeys(entry, ["artifact_sha256", "conflict_attested", "experience_years", "identity_commitment_verified", "packet_openings", "reviewer_id", "route_guess_recorded_after_scoring", "route_labels_seen", "scored_packet_ids", "scores", "specialty"])
      || !slot
      || entry.specialty !== slot.specialty
      || !Number.isFinite(entry.experience_years)
      || entry.experience_years < manifest.review_plan.reviewer_eligibility.minimum_relevant_experience_years
      || entry.conflict_attested !== true
      || entry.route_labels_seen !== false
      || entry.identity_commitment_verified !== true
      || entry.route_guess_recorded_after_scoring !== true
      || !packetRosterValid
      || !openingRosterValid
      || !scoresValid
      || !hashPattern.test(entry.artifact_sha256 ?? "")) {
      diagnostics.push(diag("reviews", "malformed-or-unblinded-review"));
    }
  }
}

function validReviewScore(score, dimensions) {
  const expectedKeys = ["artifact_sha256", "packet_id", "route_guess", "scored_before_route_guess", ...dimensions];
  return exactKeys(score, expectedKeys)
    && typeof score.packet_id === "string"
    && score.packet_id.length > 0
    && dimensions.every((dimension) => Number.isInteger(score[dimension]) && score[dimension] >= 1 && score[dimension] <= 5)
    && ["arm-a", "arm-b", "arm-c", "arm-d", "unknown"].includes(score.route_guess)
    && score.scored_before_route_guess === true
    && hashPattern.test(score.artifact_sha256 ?? "");
}

function validOpeningShape(opening, reviewerId) {
  return exactKeys(opening, ["opened_at", "packet_id", "packet_sha256", "reviewer_id", "route_labels_seen"])
    && typeof opening.packet_id === "string"
    && opening.packet_id.length > 0
    && hashPattern.test(opening.packet_sha256 ?? "")
    && opening.reviewer_id === reviewerId
    && !Number.isNaN(Date.parse(opening.opened_at))
    && opening.route_labels_seen === false;
}

function validatePerformed(field, records, expected, diagnostics) {
  if (!sameSet(records.map((entry) => entry?.id), Object.keys(expected))) diagnostics.push(diag(field, "evidence-roster-mismatch"));
  for (const entry of records) {
    if (!exactKeys(entry, performedKeys)
      || expected[entry?.id] !== entry?.platform
      || entry.performed !== true
      || entry.passed !== true
      || entry.estimated !== false
      || !hashPattern.test(entry.artifact_sha256 ?? "")) {
      diagnostics.push(diag(field, "malformed-or-unverified-evidence"));
    }
  }
}

function validateCosts(costs, diagnostics) {
  if (!sameSet(costs.map((entry) => entry?.id), ["first-adoption", "steady-state"])) diagnostics.push(diag("costs", "cost-roster-mismatch"));
  for (const entry of costs) {
    if (!exactKeys(entry, ["amount", "artifact_sha256", "basis", "currency", "estimated", "id"])
      || !Number.isFinite(entry.amount)
      || entry.amount < 0
      || entry.currency !== "USD"
      || entry.estimated !== false
      || typeof entry.basis !== "string"
      || !entry.basis
      || /estimat/iu.test(entry.basis)
      || !hashPattern.test(entry.artifact_sha256 ?? "")) {
      diagnostics.push(diag("costs", "malformed-or-unmeasured-cost"));
    }
  }
}

function cell(cohort, scenario_id, route, order_position) {
  return { cohort, scenario_id, route, order_position };
}

function rotate(values, count) {
  return [...values.slice(count), ...values.slice(0, count)];
}

function diag(field, code) {
  return { field, code };
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function exactKeys(value, expected) {
  return isPlainObject(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function sameSet(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && new Set(actual).size === actual.length
    && actual.every((value) => expected.includes(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function stableJson(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
