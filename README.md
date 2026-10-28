# Legion · One assistant, an ecosystem of capabilities

English | [简体中文](README.zh-CN.md)

Express what you want once. DSH can discover existing capabilities, read actual source, adapt useful interfaces into native plugins, and delegate work to your Legion core for research, collaboration, revisions and file delivery. **The aim is one useful entry point into an ecosystem, not a larger control panel.**

`dsh-plugin-legion` **0.3.0** is the DSH-native entry point. The actual Legion core is installed separately; native harnesses, media models and devices are added as needed. This plugin does not bundle a company monorepo, every upstream project, or model weights.

```text
DSH: conversation, native tools, permissions and UI
  ↕ Legion plugin: discovery, source, packaging, tasks and files
Independent Legion core: research, orchestration, recovery and delivery
  ↕ Existing member/capability interfaces, installed and authorized as needed
Native harnesses · CLI / MCP / skills · Media · Devices
```

**Discovery, source reading and packaging need no Legion token.** Collaboration requires a compatible service and a personal identity you are authorized to use. DSH keeps its own loop; Legion owns delegated work, and this connector does not add another commander. This is independent community code, not an official DeepSeek product.

**[Core capabilities and installation](docs/CORE.md)** · [Ecosystem and principles](docs/ECOSYSTEM.md) · [Actual delivery status](docs/PLAN.md) · [Protocol](docs/PROTOCOL.md) · [Security](docs/SECURITY.md)

## What you can do

| Need | Entry point | Boundary |
|---|---|---|
| Find an existing capability | `legion_discover` | Current Agent-visible tools, user-configured native markets, or public GitHub; not a machine-wide inventory. |
| Read a project's interfaces and license | `legion_source` | Pinned source, file hashes and bounded previews; incomplete reads stay explicit. |
| Package code already adapted by an author | `legion_bundle` | Writes workspace files and metadata; does not install or execute them. |
| Install or switch capabilities | Official `plugin_manager` | Native installation, approvals, bundle selection and individual plugin switches. |
| See what your Legion service really has | `legion_runtime` | Current member, capability or catalog observations; registration is not installation, configuration or verified execution. |
| Delegate work and continue revisions | `legion_submit` | Real delegation; `previous_task_ref` reconnects to the original Legion conversation. |
| Use a local tool for a Legion task | `legion_call`, then a separate `legion_message` | Execution and delivery are two decisions; a mailbox receipt is not model consumption. |
| Follow remote work | `legion_status` | Task state, events, commander messages and formal exports; no automatic mailbox execution. |
| Receive actual files | `legion_download` | Downloads formal artifacts of this task and compares their bytes with the service's SHA-256. |

After enabling the connector, try an ordinary DSH request:

```text
Find an existing plugin for the capability I need. Show its sources and limitations before installing anything.
```

Or ask DSH to inspect a public repository, adapt its real interfaces, and package independently useful capabilities. **This is not an automatic converter for arbitrary applications.** The on-demand `legion-ecosystem` skill supplies the available tools and development references.

The core retains world-reference research, intent context, native collaboration, knowledge reuse, failure feedback, continued revision and formal delivery through existing modules. See the [capability map](docs/CORE.md). Retaining a mechanism does not prove every member is installed or that a team generally outperforms the strongest individual harness.

## Install a reviewed local copy

Requirements: **Node.js >=24.9.0** and official npm DSH **`0.2.1-rc.2`**. The Agent needs the relevant native tools: `write` for generated files, `plugin_manager` for installation, and optionally `plugin_market` for configured indexes. Slash commands additionally need the Host's `commands` service.

If you already have a reviewed local copy, use the official `plugin_manager`. Replace the placeholder below with its **absolute bundle directory**, preserving any spaces:

```json
{
  "action": "install_bundle",
  "target": "file:<absolute bundle directory>",
  "enabled": false
}
```

This is a parameter template, not a published package address. For public pinned-Git installation and community catalog submission, see [publication routes](docs/MARKET.md).

- Prefer `file:` for package installation with declared dependencies. A bare directory can become a development `link:` whose target dependencies are not installed recursively. A local directory is mutable, not a content hash.
- Start a new installation disabled. **Disabled does not mean dependency build scripts cannot run**: inspect native warnings and any `pendingBuilds`; build permission is separate.
- After reviewing the installation result, manage the bundle with `set_bundle`. Read **actual `entryId` values from `list_plugins`** before using `set_plugin`; declared `rowId`/module names are not runtime IDs. A disabled bundle may have no runtime entries.
- Bundle selection may load all default-enabled rows. Installation, selection, activation and actual calls are different facts. Preserve `application`, `changed`, warnings and restart requirements; do not assume a failed load rolled back selection.

Host plugins run **outside the agent sandbox**. Review code and dependencies before trusting them; see [Security](docs/SECURITY.md).

## Connect your independently installed Legion core

See [Core installation](docs/CORE.md) to create an instance and configure your own model provider. On the same machine, run this from the core directory:

```sh
.venv/bin/python -I meyo.py dsh-config --state-dir "/absolute/path/to/your/private-instance"
```

Put only its **`config` object** into this plugin's native configuration. The output contains a service address and credential-file path, never the credential:

```json
{
  "baseUrl": "http://127.0.0.1:8000",
  "tokenFile": "/absolute/path/to/your/private-instance/login-token.txt"
}
```

`tokenFile` is operator configuration, not a model-chosen path. Each request rereads an owner-only regular file so normal rotation works. A configured but invalid file fails explicitly rather than falling back to another identity. Configuration output does not verify model access; submit a real task.

### Existing remote services: environment configuration remains supported

Configure these privately in the DSH Host environment. The JSON Environment editor needs **JSON string values, including quotes**; ordinary process environment variables use plain strings.

| Variable | Example JSON value |
|---|---|
| `LEGION_BASE_URL` | `"https://legion.example.invalid"` |
| `LEGION_PERSONAL_TOKEN` | `"<your-personal-token>"` |

Keep the token **value** out of chat, commands, plugin configuration and Git. `tokenFile` accepts only a local absolute path and takes precedence over `tokenEnv` without fallback. Remote URLs require HTTPS; HTTP is allowed only on loopback. Installing this connector does not start a service. Optional candidates, project bindings and private state settings are in [Protocol](docs/PROTOCOL.md#7-configuration).

```text
/legion help
/legion runtime members
/legion runtime capabilities
/legion start page-1 Create a small HTML page with status text and a button.
/legion status <task_ref>
/legion download <task_ref> <artifact_id>
```

Use references and artifact IDs returned by the tools, not the placeholders. `list`, `continue`, `message`, `resume` and `cancel` are also available. `legion_submit.tool_names` can share selected visible tool schemas; it grants no remote execution access.

### Share a local result in two steps

1. Use `legion_call` with the original task reference, recipient, stable operation key and selected native tool. Its first receipt is **pending**, not outer-call success. The bridge sends no HTTP or messages; the selected tool may have its own network behavior.
2. **Wait for the enclosing Host call to finish.** DSH then decides whether to use `legion_message`, with its own stable key, to share only the final content actually visible and appropriate to send. Do not combine execution and a success message inside the same `run_code` or another unfinished parent call.

The official result observer records ancestor **status metadata only**. Same-key, same-input recovery never reruns the tool or replays old result bodies, including after the target capability is disabled, provided this connector and the original session/state remain available. Unknown execution is not permission to change keys and repeat a side effect.

Message acknowledgement is separate from execution and **does not prove remote-model consumption or wake a finished task**. The bridge's text projection omits binary media; local DSH image forwarding is not full-media transfer to Legion. See the [two-step protocol](docs/PROTOCOL.md#6-two-step-collaboration).

## Limits, data and license

Repository text, catalog descriptions and task messages are untrusted material, not instructions or permission grants. Source hashes identify bytes; packaging is not runtime verification; download integrity is not file safety. Redaction is bounded, not a universal secret detector.

Keep recovery state private. New v2 native-call records retain metadata, not result bodies; old records and both systems' sessions may still contain content. Uninstalling does not delete user files or cancel remote work.

[MIT](LICENSE) covers this connector only. The separate core is currently a personal private preview; its first-party public license and third-party redistribution rights are unresolved, not inherited from this connector. Generated examples, instance data, credentials and private validation artifacts are not shipped with the connector.
