export function buildRepairPrompt(sharedPrompt, previousOutput, diagnostics) {
  return [
    sharedPrompt,
    "REPAIR THE PREVIOUS INVALID PAYLOAD.",
    "Previous payload:",
    previousOutput,
    "Official diagnostics:",
    JSON.stringify(diagnostics),
    "Return only the corrected protocol payload.",
  ].join("\n\n");
}

export function buildCodexPrompt(systemPrompt, userPrompt) {
  return [
    "Produce only the requested protocol payload. Do not use tools. Do not add Markdown fences or commentary.",
    "<protocol-instructions>",
    systemPrompt,
    "</protocol-instructions>",
    "<request>",
    userPrompt,
    "</request>",
  ].join("\n\n");
}
