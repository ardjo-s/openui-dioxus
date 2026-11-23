# Security model: openui-dioxus

This is the threat model the Devin security scan profile uses to rerank findings for this repository. **(user)** marks a fact the owner confirmed; everything else is inferred from the code. Update this file when entry points, account types or assets change.

## Component
- **Local Tools & Hooks**: Rust prototype, `prototype/`
- Exposure: Runs only on the owner's machine or in CI. Nothing is hosted.

## Entry points and who can reach them
- Agent lifecycle hooks and scripts that Claude Code, Cursor or Codex run on the owner's machine.
- GitHub Actions workflows.
- Committed configuration and git history, readable by anyone with repository access.

## Assets
- Secrets or API keys committed to the repository or its history **(user: committed secrets anywhere are a top asset)**.
- The owner's machine and shell environment, which agent hooks and scripts run in.

## Attackers that matter
- A malicious local process, or crafted input (a file, an MCP request, a web page calling a loopback port) reaching the tool.
- A supply-chain or CI attacker working through GitHub Actions workflows or dependencies.

## Existing controls
- None recorded.

## Out of scope / accepted risk
- None recorded.

## Finding tags
- `Component`, `Repository`, and `CVE` for dependency findings **(user)**.
