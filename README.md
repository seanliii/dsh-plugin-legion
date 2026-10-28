# Legion Bridge

English | [简体中文](README.zh-CN.md)

Bring open-source capabilities into **DeepSeek Harness (DSH)**, and optionally collaborate with your own Legion service. `dsh-plugin-legion` **0.2.0** can find existing tools/plugins, read public GitHub source at a fixed commit, package an author's adapted code, and support a two-step handoff of a selected local tool result to a Legion task.

**Start with open-source capabilities; no Legion token is required for discovery, source reading or packaging.** Only Legion collaboration needs an existing service you are authorized to use and your own personal token. The backend is not included.

DSH keeps its conversation, main loop, tool choices and permissions. Installation and plugin switches belong to the official `plugin_manager`, not a second runner. This is independent community code, not an official DeepSeek product or endorsement.

## Start with a capability

Once the connector is installed and enabled, ask in an ordinary DSH conversation:

```text
Find an existing DSH plugin for the capability I need. Show the sources and limitations; do not install anything yet.
```

If an adapter is needed, replace `<owner>/<repo>` with the public repository you want to inspect:

```text
Read <owner>/<repo> at a fixed commit, including its interfaces and license. Write an adapter for the capability I need, then package independently usable capabilities as separate plugins in one bundle. Show me the files before installation.
```

These are requests to DSH to research and implement an adapter, **not an automatic conversion promise**. DSH can consult the on-demand `legion-ecosystem` skill when the Host provides skills.

| What you want | Entry point | What to expect |
|---|---|---|
| Find something already available | `legion_discover` | Current Agent-visible tools, user-configured native markets, and public GitHub; failures stay distinct from empty results. |
| Understand a public project | `legion_source` | A fixed commit, real source/README/dependency/license text, and explicit pagination or truncation. |
| Package code already adapted by an author | `legion_bundle` | Workspace files and native bundle metadata; **written, not installed or executed**. |
| Install or switch capabilities | Official `plugin_manager` | DSH's native installation, approvals and individual plugin switches. |
| Run a local tool for a Legion task | `legion_call` | An explicit native call with a **pending** first receipt; no HTTP or message sending by the bridge. Requires collaboration setup. |
| Share the result after DSH sees it | `legion_message` | A later, explicit message with its own delivery receipt; not proof of remote consumption. |

“Installed” discovery means tools visible to the **current Agent**, not a machine-wide inventory. Market search needs the optional official market tools and indexes you have configured; there is no built-in global catalog. GitHub and remote index reads need network access, but not a Legion token. See [the ecosystem guide](docs/ECOSYSTEM.md) and [exact parameters](docs/PROTOCOL.md).

## Requirements and installation

- Node.js **>=24.9.0** and official npm DSH **exactly `0.2.1-rc.2`**.
- Make the relevant native tools visible to your Agent: `write` for generated files, `plugin_manager` for installation, and optionally `plugin_market` for market search.
- Slash commands additionally need the Host's `commands` service. The four new 0.2 tools are model tools, not new `/legion` subcommands.

Review the pinned code and dependencies before enabling it: DSH bundles run with Host privileges **outside the agent sandbox**. See [Security](docs/SECURITY.md).

**Publication is pending.** No Git remote is configured; the public repository, public pinned-Git installation, index, directory submission/listing and npm publication are not yet completed. Code rights, publishing permissions and external-release authorization still require confirmation. Once a public commit has been reviewed, the installation template is:

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#<PUBLIC_FULL_COMMIT_SHA>'
```

This is **not a working release command yet**. Replace the placeholder with the real full 40-character public commit; keep `-w` and select your intended profile instead of `web` if different. The commit must include runnable JavaScript and the bundle patch.

Pinned Git installation, an official Discover self-hosted index, and a 1024Store listing are separate routes. At the reviewed store snapshot, offered one-click installation is **npm-only**; an entry without npm can be **browse-only**. Git installation does not need an npm publishing account. See [publication routes and pending evidence](docs/MARKET.md).

## What a generated bundle contains

The author first adapts the real interfaces using DSH's native plugin APIs. `legion_bundle` then packages those files; it does not translate any arbitrary library or application into a working plugin.

- Split by **independently useful capability**, not mechanically by source file. Shared implementation can stay shared.
- One bundle is the installation unit. Each `<package>/<id>` has its own native plugin row, export, display name/description and icon metadata, so capabilities can be enabled or disabled separately. They are not separate npm packages.
- `package.json`, `cordis.patch.yml`, locales, a simple original SVG icon, README, `provenance.json` and `SOURCE-NOTICE.md` are generated. The tool fetches source facts or reuses successful, fully pinned observations from the same DSH session and plugin lifetime. Reuse preserves the original fetch time, hashes and truncation; partial or failed observations are fetched again.
- A supplied `LICENSE` is preserved verbatim. No upstream license is invented or replaced with this connector's MIT license. Dependencies must use exact versions; runtime requirements are not inferred from imports.

Choose a dedicated ordinary workspace directory, not a DSH profile directory; native `write` may overwrite existing same-path files. A successful result is `written_not_installed`. Listed hashes describe expected written content, **not independent readback**. DSH can then use official `plugin_manager` to install the directory initially disabled, review its actual warnings/build approvals, and enable the intended bundle and individual plugins. Installation, active state and real calls each still need verification.

Retries still validate the current adapter and directory and request current native write permissions for every file; no old execution result or approval is replayed. `source_retrieval` distinguishes `"fetched"` from `"reused_pinned_facts"`. This is source-observation reuse, not a new fetch, access check or quality judgement. See [the packaging contract](docs/PROTOCOL.md#5-package-authored-adapters--包装作者已完成的适配代码).

## Optional: collaborate with your Legion service

Only this section requires a working authorized Legion service and personal token. Installing the connector does not provide or start the service.

Set these privately in the DSH Host environment. In the JSON Environment editor, values are **JSON strings**, including the double quotes:

| Variable | Example JSON value |
|---|---|
| `LEGION_BASE_URL` | `"https://legion.example.invalid"` |
| `LEGION_PERSONAL_TOKEN` | `"<your-personal-token>"` |

Use your operator's real values privately. Keep the token **out of chat, command arguments, plugin configuration and Git**. Ordinary process environment variables use plain strings, without an extra JSON layer. Remote service URLs require HTTPS; HTTP is limited to loopback.

If supported by your service, an optional user configuration is:

```json
{
  "candidateHarnesses": ["codex"]
}
```

This is user configuration, not a model argument. A non-empty list is passed in order; omission or `[]` sends no candidate plan. There is no connector-selected default or fallback. Private state-directory and project-binding options are in [Protocol](docs/PROTOCOL.md).

```text
/legion help
/legion start page-1 Create a small HTML page with status text and a button.
/legion status <task_ref>
/legion download <task_ref> <artifact_id>
```

Use the returned `task_ref` and a downloadable `artifact_id` from `status`, not the literal placeholders. `list`, `continue`, `message`, `resume` and `cancel` remain available.

When submitting through `legion_submit`, optional `tool_names` shares only explicitly selected visible tool descriptions and schemas. It grants no remote access. DSH chooses the specific local tool, arguments and recipient under its native permissions; repository text and remote messages are not execution authorizations.

### Share a local result in two steps

**First, execute without sending.** For example, ask DSH:

```text
Use legion_call for the selected local tool and the original task reference. Show me the final Host result; do not send a task message yet.
```

`legion_call` itself makes **no HTTP requests and sends no messages**; the selected native tool may have its own network behavior. Its first receipt is only a child observation: `native.state: "unknown"`, `transport.state: "pending"`, with a bounded projection of the child's final `content`. It is not proof that the enclosing DSH call succeeded. After the root finishes, an official `tools/result` observer saves **status metadata only**, not result bodies, and does not rewrite that first receipt or send anything.

**Then, only after the enclosing call's final result is visible, make a separate decision to send.** For example:

```text
Now send only the shareable result the Host actually showed, using legion_message for the original task and recipient. Report any failure or uncertainty accurately.
```

Do **not** put execution and a success message in the same `run_code` or another still-running parent call. This is usage guidance, not a claim that the connector intercepts all such programs. Give the explicit message its own stable `operation_key`. Its acknowledgement is separate; it does not update a **new v2** `legion_call`'s `delivery`, which remains `not_attempted` with `automatic: false`. This does not erase a legacy v1 delivery acknowledgement.

**Sharing is limited to bounded, redacted text/structured data, not image/audio/video binaries.** The implementation forwards images and native contexts on the local DSH path; that is not full-media transfer to Legion. Use only the final content DSH actually receives, never hidden child values or cached bodies. A message receipt is not proof the remote model consumed the result, and delivery does not automatically wake a terminal task.

**Keep the original key after uncertainty.** Reopen the same DSH session with its retained state, use `/legion list`, then check the original reference with `status`; do not change keys or candidates to “reconnect.” The same `legion_call` key and arguments recover **metadata only**: no re-execution, no replay of old result text. Recovery also works after the **target capability** is disabled or uninstalled, provided Legion Bridge, the original state/session and authorization remain available. Legacy v1 records without ancestor evidence cannot establish success. A missing result stays unknown, not permission to repeat a side effect. This is local duplicate suppression, not cross-machine exactly-once. `continue` starts explicit new work; `resume` only requests interrupted-work recovery. Cancellation is a request, not proof that a process stopped.

## Validation status — 0.2.0

**Offline validation passed:** on Node **v24.20.0**, `npm run check` and `npm test` both exited 0, with **357/357 tests passed**, no failures, cancellations or skips. The run was **2026-10-28 04:25:05–04:25:09 UTC / 12:25:05–12:25:09 Asia/Shanghai**, with unchanged source hashes before/after. All 30 recorded code, test and manifest files still match that snapshot. The integrated suite is reused, not reported as a new run; it covers isolated tests and the official rc.2 Runtime, not a real Host journey.

The explicit-message ACK embedded-data-URL leak, legacy v1 delivery-ACK recovery and pinned-source retry handling are fixed for the covered cases. An independent 13-case source-retry review also passed. These counts are not added to the suite total, and do not guarantee every response format or execution path.

**The author repaired the `marked` adapter.** Independent official rc.2 Loader/ToolRuntime checks made 20 actual calls: 14 successful business calls and 6 expected `UNKNOWN_TOOL` results after unloading. The missing `tools` injection and invalid JSON output were repaired by the author, not patched into the test. A subsequent native `legion_bundle` result has been independently read back: all 17 files match its hashes, and the three runtime source files match the tested version. Dependency resolution used local aliases, so the installed dependency layout is not yet verified.

**A real installation was attempted, but failed.** After the earlier one-time `list_bundles` query, a separate one-time approval allowed the author to call official `plugin_manager install_bundle` with `enabled: false`. It returned `application: failed`, `changed: false` and `ERR_PNPM_ADDING_TO_ROOT`. Readback confirmed the unchanged profile manifest and no target dependency, selected bundle or installed target directory; the author's 17 files still matched. The failed process's pnpm executable/version was not recorded, so attributing that run to pnpm 9 would be an inference. Both one-time approvals are consumed, not permission for a retry or restart.

**The compatibility candidate is tested in isolation, not active in the Host.** On fixed Node v24.20.0 / DSH rc.2 / pnpm 11.7.0, 27 package-operation checks and a separate 33-check official `Context` / `Loader` / `PluginManager` experiment matched expectations. The latter used self-authored fixtures, without dependency aliases, a root shim or script-policy overrides; it covered pending builds, stale approvals, approved fixture scripts, failure rollback and removal. A pnpm 9 root-shim alternative was rejected because unapproved and explicitly denied fixture scripts ran. These are not native approval-UI or plugin-feature tests. A local, unapplied launcher uses the official `runCli` package-manager option; only its syntax and isolated `--version` were checked. It is not shipped or silently activated by this connector. See [the precise installation boundaries](docs/ECOSYSTEM.md).

**Real Host acceptance remains open.** A new scoped approval is needed to restart the test Host and retry one disabled installation; this would not authorize enabling, extra build scripts, permanent tool permissions or publication. The on-disk retry fix is still not proof that the existing Host loaded it—the last saved native packaging receipt lacks `source_retrieval`. Installation, separate switches, real Host calls, later explicit messages and remote consumption still need their own evidence. See [the implementation and remaining acceptance work](docs/PLAN.md).

## Data and license

Recovery records contain references, keys/digests and minimal receipts. The **v2 native-call ledger stores status metadata, not result bodies**. Existing v1 files are not automatically erased, and actual result text or images may remain in DSH/Legion sessions or user files; these are **not anonymous telemetry**. Generated/downloaded files have their own retention. Uninstalling neither cancels remote work nor deletes user files.

Download hash checks establish transfer integrity, not file safety or experience quality. Redaction is not a universal secret detector. Read [Security](docs/SECURITY.md) before sharing diagnostics or running adapted code or exports.

MIT covers this connector only. Planned publication is limited to this independently written plugin, its legitimate dependency declarations and documentation—not company/backend source, credentials, private evidence or user artifacts. Each source project, dependency, authored adapter and optional Legion backend retains its own license and authorization requirements.
