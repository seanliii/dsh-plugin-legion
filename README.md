# Legion Bridge

English | [简体中文](README.zh-CN.md)

`dsh-plugin-legion` connects a DeepSeek Harness (DSH) session to an **existing Legion service that you are authorized to use**. DSH keeps its own conversation, main loop and permissions. The bridge delegates tasks, reads progress, finds saved tasks and downloads formal exports; it is not another runner or a judge of the result.

**The backend is not included.** You need an operator-provided service address and your own personal token. This is an independent community plugin, not an official DeepSeek product or endorsement.

## Requirements

- Node.js **>=24.9.0** and official npm DSH **exactly `0.2.1-rc.2`**.
- An authorized, working Legion service and a personal token from its operator. Installing this bridge does not start or provide that service.
- A DSH Host surface with the `commands` service for slash commands.

Review the pinned code before enabling it: DSH bundles run with Host privileges **outside the agent sandbox**. See [Security](docs/SECURITY.md).

## Installation — publication pending

The public repository, pinned-commit installation and marketplace submission have **not yet been completed**. Once a public commit has been reviewed, replace the placeholder with its full 40-character SHA:

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#<PUBLIC_FULL_COMMIT_SHA>'
```

This is an installation template, not a working public release link. Keep `-w`; replace `web` if you use another profile. The commit must include the entry point, prebuilt JavaScript and bundle patch.

Manual Git installation, a self-hosted index for official Discover, and a 1024Store directory entry are separate routes. npm publication is optional for Git and directory admission; without it, 1024Store can be **browse-only**, not one-click installable. See [Market](docs/MARKET.md).

## Configure privately

Set these in the DSH Host environment. In the JSON Environment editor, values are **JSON strings**, including the double quotes:

| Variable | Example JSON value |
|---|---|
| `LEGION_BASE_URL` | `"https://legion.example.invalid"` |
| `LEGION_PERSONAL_TOKEN` | `"<your-personal-token>"` |

Use your operator's real values privately. The token belongs **only in the environment**, never in chat, command arguments, plugin configuration or Git. Ordinary process environment variables use plain strings, not an extra layer of JSON. Remote URLs require HTTPS; HTTP is limited to loopback.

Optional plugin configuration, if your operator supports Codex:

```json
{
  "stateDirectory": "/absolute/path/to/private/legion-state",
  "candidateHarnesses": ["codex"]
}
```

Replace the example path with a private directory and retain it when reopening the **same DSH session**. `candidateHarnesses` is user configuration, not a model argument: a non-empty ordered list is passed to the service; omission or `[]` sends no candidate plan. There is no default candidate or fallback.

The successful live run used an explicit Codex candidate. The earlier automatic-planning failure remains recorded in [Plan](docs/PLAN.md). Storage defaults, `baseUrl`, `tokenEnv` and optional project binding are documented in [Protocol](docs/PROTOCOL.md).

## Try it

```text
/legion help
/legion start page-1 Create a small HTML page with status text and a button.
/legion status <task_ref>
/legion download <task_ref> <artifact_id>
```

Use the returned `task_ref`; choose a downloadable `artifact_id` from `status`. These placeholders are not real task IDs. The [command and tool reference](docs/PROTOCOL.md) also covers `list`, `continue`, `message`, `resume` and `cancel`.

**One key, one submission.** The reference is saved before sending. If an acknowledgement is lost, reopen the same DSH session, use `/legion list`, then check `/legion status <task_ref>`. **Do not resubmit or change keys/candidates to reconnect.** This is local duplicate-send suppression, not a cross-machine exactly-once guarantee.

`continue` starts explicit follow-up work; `resume` only requests recovery of interrupted work. `message` only delivers to a mailbox. Cancellation is a request, not proof that a process stopped.

## Verified scope — 2026-10-27

| Check | Observed result |
|---|---|
| Maintainer-run local suite | **110/110 passed, 0 failed**; `npm run check` exited **0**. |
| Official rc.2 local Host | Installation, loading, disable/re-enable and native command RPCs exercised. |
| Native model-tool path | An explicit normal-chat request invoked `legion_list` and `legion_status`; call/result IDs matched, both returned `isError: false`, and the turn completed. This does not prove autonomous task selection. |
| One real Codex task | Reached `done`; native command downloaded `connection-check.html`, **2123 bytes with matching SHA-256**. Another export without a valid SHA-256 was rejected. |
| Independent offline review | **13+7 cases passed**, no new blockers in the reviewed scope; not a production-wide safety guarantee. |

**Still unverified:** model-invoked task submission, successful real recovery and HTML button interaction. Browser `file://` access was denied by the validation tool's safety policy and was not bypassed. rc.2 Web also has a known command-only session display limitation. The persisted long `legion_status` text was pruned by the Host; its success envelope is verified, not a lossless result-body round trip.

Real reverse-proxy and uninstall acceptance remain pending; prefix handling has synthetic coverage only. Public Git installation, an index, a catalog PR and npm publication have not happened. [Plan](docs/PLAN.md) keeps the detailed history and remaining checks.

## Data and license

The recovery index does not separately copy raw tasks or full conversations; they naturally remain in DSH/Legion sessions, and cleaned results may still contain task content. Downloaded files belong to the user and **are not deleted on uninstall**; uninstalling does not cancel remote work.

Downloads recheck the service's current authorization. Matching bytes and SHA-256 proves transfer integrity, not file safety or user experience. Read [Security](docs/SECURITY.md) before sharing diagnostics or opening exports.

MIT covers this connector only. The backend is not included; its license, availability and operator authorization are separate.
