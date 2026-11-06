---
last_edited: 2026-11-06
---

# Start Entire in a new clone

Install the Entire CLI and authenticate with your existing account before these steps.
Git does not copy local remotes, installed Git hooks, or per-user Graph hooks.

The shared configuration deliberately targets `entire`, never a GitHub origin.
Create that clone-local remote if it is absent, then inspect its URL:

```sh
if ! git remote get-url entire >/dev/null 2>&1; then
  entire repo remote add entire /gh/ardjo-s/openui-dioxus
fi
git remote get-url entire
```

The URL must identify `/gh/ardjo-s/openui-dioxus` on an Entire cluster. If an existing
remote names another repository, stop and resolve that mismatch before enabling uploads.

Install this clone's Git hooks and select its checkpoint destination:

```sh
entire enable --local --agent codex --checkpoint-push-remote entire --telemetry=false --absolute-git-hook-path
entire status --json
```

The committed lifecycle integrations cover eight supported agents. Each agent
still needs its own installed CLI and authentication. Review Codex hooks through
the native trust flow; do not manufacture trusted hashes.

Graph and Brain plugins must also be installed. Run `entire plugin install graph`
and `entire plugin install brain` if absent. Then:

```sh
entire graph setup
entire brain setup --agent none --no-backfill --daemon
entire brain connect
```

`entire graph setup` restores the ignored per-user Claude SubagentStart hook,
which gives Explore and Plan subagents Graph guidance. Do not commit the whole
`.claude/settings.local.json` file. Brain connection uses existing authentication;
when origin names an upstream repository, resolve the intended Entire repository
with `entire repo view` and connect using its explicit repo ID and API URL.

The commands above do not start model backfill or create billing credentials.
Check status and capture one real session before claiming end-to-end recording.
