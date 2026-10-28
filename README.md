# Legion Bridge

English | [简体中文](README.zh-CN.md)

Bring open-source capabilities into **DeepSeek Harness (DSH)**, with optional collaboration through your own Legion service. `dsh-plugin-legion` **0.2.0** helps DSH find tools, read public source at a fixed commit, and package author-adapted code as independently switchable plugins in one bundle.

**Discovery, source reading and packaging need no Legion token.** Collaboration requires a compatible service you are authorized to use and your own personal token; no backend is included. DSH keeps its conversation, tool choices and permissions. This is independent community code, not an official DeepSeek product.

**[Current release and native-installation status](docs/PLAN.md)** · [Ecosystem guide](docs/ECOSYSTEM.md) · [Protocol](docs/PROTOCOL.md) · [Security](docs/SECURITY.md)

## What you can do

| Need | Entry point | Boundary |
|---|---|---|
| Find an existing capability | `legion_discover` | Current Agent-visible tools, user-configured native markets, or public GitHub; not a machine-wide inventory. |
| Read a project's interfaces and license | `legion_source` | Pinned source, file hashes and bounded previews; incomplete reads stay explicit. |
| Package code already adapted by an author | `legion_bundle` | Writes workspace files and metadata; does not install or execute them. |
| Install or switch capabilities | Official `plugin_manager` | Native installation, approvals, bundle selection and individual plugin switches. |
| Use a local tool for a Legion task | `legion_call`, then a separate `legion_message` | Execution and delivery are two decisions; a mailbox receipt is not model consumption. |
| Follow remote work | `legion_status` | Task state, events, commander messages and formal exports; no automatic mailbox execution. |

After enabling the connector, try an ordinary DSH request:

```text
Find an existing plugin for the capability I need. Show its sources and limitations before installing anything.
```

Or ask DSH to inspect a public repository, adapt its real interfaces, and package independently useful capabilities. **This is not an automatic converter for arbitrary applications.** The on-demand `legion-ecosystem` skill supplies the available tools and development references.

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

## Optional: collaborate with your Legion service

Configure these privately in the DSH Host environment. The JSON Environment editor needs **JSON string values, including quotes**; ordinary process environment variables use plain strings.

| Variable | Example JSON value |
|---|---|
| `LEGION_BASE_URL` | `"https://legion.example.invalid"` |
| `LEGION_PERSONAL_TOKEN` | `"<your-personal-token>"` |

Keep the token out of chat, commands, plugin configuration and Git. Remote URLs require HTTPS; HTTP is allowed only on loopback. Installing this connector does not start a service. Optional candidates, project bindings and private state settings are in [Protocol](docs/PROTOCOL.md#7-configuration).

```text
/legion help
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

[MIT](LICENSE) covers this connector only. Dependencies, source projects, generated adapters and the optional backend retain their own licenses. Generated examples and private validation artifacts are not shipped with the connector.
