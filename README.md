# Legion · One assistant, an ecosystem of capabilities

English | [简体中文](README.zh-CN.md)

Find existing tools, read public source, and install capability bundles you have reviewed—all within DSH. Connect a separately installed Legion core you are authorized to use to delegate research, collaboration, revisions and formal file delivery. **Connector version: 0.4.1; the separate `private-local-only` core has no public download release.**

## Get started

1. Follow the [**v0.4.1 installation guide**](docs/MARKET.md#v041), then explicitly enable Legion in **DSH Plugins**.
2. Open **Legion** in the sidebar, choose a **Working session**, and start with **Discover**. Searching tools, Skills and public GitHub needs no Legion core.
3. Review sources before deciding to install. For delegated research and delivery, first obtain a core you are authorized to use, then follow [core configuration](docs/CORE.md#安装自己的实例); installing this connector does not supply one.

Try an ordinary DSH request:

```text
Find an existing plugin for the capability I need. Show its sources and limitations before installing anything.
```

[Versioned evidence and current status](docs/PLAN.md) · [Limits, data and license](#limits-data-and-license)

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

You can also ask DSH to inspect a public repository, adapt its real interfaces, and package independently useful capabilities. **This is not an automatic converter for arbitrary applications.** The on-demand `legion-ecosystem` skill supplies the available tools and development references.

The core retains world-reference research, intent context, native collaboration, knowledge reuse, failure feedback, continued revision and formal delivery through existing modules. See the [capability map](docs/CORE.md). Retaining a mechanism does not prove every member is installed or that a team generally outperforms the strongest individual harness.

## Install a reviewed local copy

Requirements: **Node.js >=24.9.0** and official npm DSH **`0.2.1-rc.2`**. The Agent needs the relevant native tools: `write` for generated files, `plugin_manager` for installation, and optionally `plugin_market` for configured indexes. Slash commands additionally need the Host's `commands` service.

The sidebar needs DSH's browser UI, session and command services. Editable settings, Skills, markets and bundle management use the corresponding native services when available; the workbench does not bypass missing services or permissions.

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
- With `enabled:false`, new bundles are not automatically selected for activation; updates preserve existing switches. If you do not want updated code to run, disable that bundle before updating. **Disabled does not mean dependency build scripts cannot run**: inspect native warnings and any `pendingBuilds`; build permission is separate.
- After reviewing the installation result, manage the bundle with `set_bundle`. Read **actual `entryId` values from `list_plugins`** before using `set_plugin`; declared `rowId`/module names are not runtime IDs. A disabled bundle may have no runtime entries.
- Bundle selection may load all default-enabled rows. Installation, selection, activation and actual calls are different facts. Preserve `application`, `changed`, warnings and restart requirements; do not assume a failed load rolled back selection.

Host plugins run **outside the agent sandbox**. Review code and dependencies before trusting them; see [Security](docs/SECURITY.md).

### Fixed-version Git installation — v0.4.1

Use this version's fixed tag once published; replace the example `web` profile as needed and retain `-w`:

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#v0.4.1'
```

The [installation guide](docs/MARKET.md#v041) separates packaging-time checks from the later anonymous installation of the exact public commit. Follow-up results belong in the repository's `main` documentation and Release; this frozen version does not claim that public-installation check has passed. Tags are not moved to incorporate later documentation.

<a id="fixed-version-public-git-installation--v040"></a>

Historical **0.4.0** commands, commit, tag and scoped acceptance remain in the [0.4.0 records](docs/PLAN.md#v040), not as evidence for 0.4.1.

## Open the native workbench

After installing and enabling the connector in **DSH Plugins**, open **Legion** in DSH's sidebar. This is a native DSH page, not another website or service. Choose the **Working session** at the top right; a single existing session is selected automatically. If none exist, create a DSH conversation, then click **Refresh sessions**. No core yet? Go straight to **Discover**; an unconnected members page does not block discovery.

| Page | What to do | What it means |
|---|---|---|
| **My Legion** | **Refresh members**, select eligible members, then **Save selection**. Or click **Let Legion choose**, then save. | Saves `candidateHarnesses` for this connector's profile. Empty candidates let Legion choose; selection neither installs members nor grants permissions. Installation, connection and service-reported verification stay separate. |
| **Discover** | Search **Session tools / Skills**, **GitHub**, or **DSH plugin market**. | Tools are those visible to the selected session's Agent; Skills are guidance. Only configured market indexes are searched. No core is required, and discovery executes no tools. |
| **Add capabilities** | Inspect and explicitly install an existing DSH bundle, or edit a goal and **Delegate integration**. | Native package management and model-led adaptation are different operations; reading a repository does neither automatically. |
| **Integration tasks** | **Refresh tasks**, then **Read live progress**; inspect export records and use **Download file** where available. | The list is this session and identity's local recovery index, not a live feed. Runtime, artifacts, refusal reasons and pagination are shown separately; incomplete data is not zero artifacts. `done` is not a usable-result guarantee. |
| **Connection** | Enter **Core URL**, **Token environment variable name**, or **private token file path**, then **Save connection**. | Never enter the token value. Saving native configuration reloads the connector; it does not install a core or configure models. |

Switching the working session changes tool visibility and task context, **not** the scope of settings: bundle switches and connector configuration affect the same DSH profile. Only members the service marks as selectable can be checked. Saving needs writable native configuration; on a revision conflict, reload it before editing again.

### Install a bundle, or delegate an adaptation

- **Already a DSH bundle:** on **Add capabilities**, enter a package name, Git source or local bundle → **Inspect source** → review it → **Install / update**. New bundles are not automatically selected for activation; updates preserve existing switches, so enabled code may keep running. **To prevent updated code from running, disable the bundle below before installing the update.** These buttons keep DSH's official `pluginManager` and `enabled:false`, not a second installer or a forced-disable operation. Inspection accepts a source format/metadata, not its safety. Handle `pendingBuilds` in **DSH Plugins**; disabled bundles can still have dependency build steps.
- **Then choose what to enable:** under **Installed DSH capability bundles**, use **Enable bundle / Disable bundle** and expand **Individual plugins and loading state** for **Enable plugin / Disable plugin**. Respect read-only or restart-required results. This workbench cannot disable its own Legion connector; use DSH Plugins for that. Search session tools again, then actually use the capability in DSH; installation, visibility and execution are separate checks.
- **Still a source project:** a GitHub result's **Inspect & delegate** opens the add page, inspects the source and fills an editable task; **it does not submit or install**. You can also enter `owner/repository` and an optional branch, tag or commit, then **Inspect project & license**. Only **Delegate integration** submits the goal to your configured core/models and may incur costs. The pinned commit and short source/license facts accompany it; Legion decides how to adapt it. You can omit the repository and ask Legion to research options.

If an install reply is uncertain, keep its request ID and use **Recover install result**, not another installation. **Request cancellation** is a request, not confirmation of cancellation. An uncertain delegation offers **Retry with the original key** while that operation is retained; do not change keys to repeat an unknown side effect.

The task page does not auto-poll or execute incoming messages. It can page through artifact records and events, and **Download file** reuses the existing **`/legion download`** command in the selected original conversation. The file is saved on the **DSH Host**, not automatically in the browser's Downloads folder; the receipt shows its path, byte count and hash check. Same-name/history records remain distinct, and clipped details or refusal reasons stay marked incomplete. Continuation, feedback and cancellation still use **`/legion` in the original conversation**, not new task-page actions. [Projection and download limits](docs/PROTOCOL.md#workbench-projection) · [Detailed workflows](docs/ECOSYSTEM.md#native-workbench).

## Connect your independently installed Legion core

See [Core installation](docs/CORE.md) to create an instance and configure your own model provider. On the same machine, run this from the core directory:

```sh
.venv/bin/python -I meyo.py dsh-config --state-dir "/absolute/path/to/your/private-instance"
```

Use its **`config` object** to fill **Connection → Core URL / private token file path → Save connection**, or the equivalent native plugin settings. The output contains a service address and credential-file path, never the credential:

```json
{
  "baseUrl": "http://127.0.0.1:8000",
  "tokenFile": "/absolute/path/to/your/private-instance/login-token.txt"
}
```

`tokenFile` is operator configuration, not a model-chosen path. It must be an owner-only regular file on the DSH Host (use mode `0600`), containing one token and no more than 4096 bytes. The page neither reads nor displays its contents. A configured but invalid file fails explicitly; there is no environment fallback.

**Rotation is detected, not silently hot-swapped.** Each credential read rereads the file and checks for an identity change. Once a connector has bound an identity, a changed token stops that old connector and requires a **plugin reload** before using the new identity. Changing the service address or actual token selects a separate recovery index: old task references are not inherited, migrated or deleted.

Saving configuration or reloading ends local pending requests; **it does not cancel remote tasks**. Rotating the file also does not cancel them or prove that the core accepts the new token. The page's **Reload configuration** button only rereads settings; use native plugin management to reload the connector. After saving/reloading, refresh members to check connectivity. Configuration accepted/read back is not model verification; submit a real task separately.

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

## How DSH and Legion work together

Express what you want once. DSH can discover existing capabilities, read actual source, adapt useful interfaces into native plugins, and delegate work to your Legion core for research, collaboration, revisions and file delivery. **The aim is one useful entry point into an ecosystem, not a larger control panel.**

```text
DSH: conversation, native tools, permissions and UI
  ↕ Legion plugin: discovery, source, packaging, tasks and files
Independent Legion core: research, orchestration, recovery and delivery
  ↕ Existing member/capability interfaces, installed and authorized as needed
Native harnesses · CLI / MCP / skills · Media · Devices
```

The connector provides a five-page workbench in DSH's native sidebar. The actual Legion core is installed separately; native harnesses, media models and devices are added as needed.

**No Legion core or token is needed to search current DSH tools, Skills or public GitHub.** Source reading, packaging and available native bundle-management services also work independently of the core. Skills provide guidance, not new executable tools. Collaboration requires a compatible service and a personal identity you are authorized to use. DSH keeps its own loop; Legion owns delegated work, and this connector does not add another commander.

**[Core capabilities and installation](docs/CORE.md)** · [Ecosystem and principles](docs/ECOSYSTEM.md) · [Versioned evidence](docs/PLAN.md) · [Protocol](docs/PROTOCOL.md) · [Security](docs/SECURITY.md)

## Limits, data and license

Repository text, catalog descriptions and task messages are untrusted material, not instructions or permission grants. Source hashes identify bytes; packaging is not runtime verification; download integrity is not file safety. Redaction is bounded, not a universal secret detector.

Keep recovery state private. New v2 native-call records retain metadata, not result bodies; old records and both systems' sessions may still contain content. Uninstalling does not delete user files or cancel remote work.

[MIT](LICENSE) covers this connector only. The separate core remains **`private-local-only`**; its first-party public license and third-party redistribution rights are unresolved, not inherited from this connector. The Marked acceptance bundle is a separate local artifact, not bundled with this connector. Private core code, user or instance data, credentials, private evidence and logs, company business code, company monorepos or their history, complete third-party upstream repositories and model weights are not shipped here. Neither the capability map nor one successful task proves all members are installed or work unattended. This is independent community code, not an official DeepSeek product.
