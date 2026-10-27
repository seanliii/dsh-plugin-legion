# Protocol / 协议

This is the **0.2.0** connector contract, not a promise that every Legion deployment implements the same API. The final integrated record reports **331/331 passed** on Node **v24.20.0**: `npm run check` and `npm test` both exited 0, with unchanged source hashes before/after. Its scope is isolated unit tests and the official rc.2 Runtime, not a real Host or end-to-end acceptance.

记录时间为 **2026-10-27T20:25:16Z（UTC）／2026-10-28 04:25:16 Asia/Shanghai**。当前全套已包含 ACK 脱敏、v1 恢复及两步终态回归；本次文档更新没有重跑测试，也不宣称覆盖所有流。真实原生旅程和后续显式消息**仍待验收**。

For short examples, start with the [English README](../README.md) or [中文入门](../README.zh-CN.md). Discovery, public source reading and packaging need no Legion token. Optional task collaboration, including the task-bound `legion_call`, still needs personal service configuration and authorization even though `legion_call` sends no HTTP.

DSH 自己决定下一步，连接器不接管主循环，不强制固定任务流程，也不评分作品质量。

**Implementation and acceptance are separate / 实现与验收分开：** current code binds context/turn methods to the original execution, forwards local image contexts, waits for ancestor outcomes before saving terminal metadata, and removes messaging from `legion_call`. Source failures retain bounded diagnostics. These changes do not prove that the original Host journey now passes.

显式消息 ACK 嵌入 data URL 脱敏和 v1 历史投递状态恢复已修复，并有当前全套证据。作者已实际调用 `legion_bundle`，但原 `marked` 双插件包缺 `tools` 注入的激活阻断仍未修，未安装、未调用。最新保存的审批仍是原 `plugin_manager list_bundles`；反馈已排队不等于作者消费或修复。具体未验项见 [PLAN](PLAN.md)。本文只复用保存的证据与本地 rc.2，没有联网或操作 Host。

## 1. Runtime and native tools / 运行环境与原生工具

The connector manifest declares Node `>=24.9.0`, exact `engines.dsh: "0.2.1-rc.2"`, and peers `@deepseek-ai/dsh-llm: "0.2.1-rc.2"`, `@deepseek-ai/dsh-tools: "0.2.1-rc.2"` and `@deepseek-ai/schemastery: "~3.18.5"`. Its `dsh.bundle.patch` is `"./cordis.patch.yml"`; the connector itself inserts only this row:

连接器自身的版本和 peer 声明如上，patch 只增加以下入口；它与后文生成的多插件适配包是不同的包：

```yaml
- insert:
    - id: legion
      name: dsh-plugin-legion
```

- `write` writes generated workspace files; `plugin_manager` installs and manages them. Neither is replaced by a private installer. / 文件写入和安装分别走原生工具，不另造安装器。
- `plugin_market` is optional and must be visible to the current Agent for market discovery. / 市场工具可选，必须对当前 Agent 可见。
- The `legion-ecosystem` skill registers only when the Host provides `skills`; slash commands register only with `commands`. / 技能与命令按 Host 提供的服务注册。
- The native-call path supplies the Agent, parent execution token, `rootCallId` and cancellation signal to `ctx.tools.execute`; these objects are not sent to Legion. `deferContext` and `concludeTurn` remain bound to the original runtime-owned execution. Successful image content is forwarded as a local user context, alongside native additional contexts and turn completion. / 这是当前转交实现；本地图片、待提交结构化输出和结束回合仍需真实 Host 重放，不能用隔离回归冒充。

## 2. Model tools and human commands / 模型工具与人类命令

There are **11 model tools**. All names below are literal. DSH invocation identity is supplied by the Host, not by model parameters.

当前共有 **11 个模型工具**。会话身份来自 Host，不能由模型参数伪造。

| Tool / 工具 | Required / 必填 | Optional / 可选 |
|---|---|---|
| `legion_discover` | None / 无 | `query`, `source`, `limit`, `offset`, `index_url` |
| `legion_source` | `action`, `repository`; `read` also needs `commit`, `path` / read 还需后两项 | `ref` for inspect; `offset`, `limit` for read |
| `legion_bundle` | `directory`, `spec`, `source_refs` | Optional fields inside `spec` and source references / 对象内可选项见下文 |
| `legion_call` | `task_ref`, `recipient`, `operation_key`, `tool_name`, `arguments` | None / 无 |
| `legion_submit` | `key`, `query` | `context`, `previous_task_ref`, `tool_names` |
| `legion_list` | None / 无 | None / 无 |
| `legion_status` | `task_ref` | `after_event_id`, `after_message_id` |
| `legion_message` | `task_ref`, `operation_key`, `recipient`, `text` | None / 无 |
| `legion_resume` | `task_ref`, `operation_key` | None / 无 |
| `legion_cancel` | `task_ref` | `reason` |
| `legion_download` | `task_ref`, `artifact_id` | None / 无 |

The four new tools have **no matching new slash subcommands**. Use ordinary chat or their tool schemas. Existing commands are:

新增四工具**没有对应的新斜杠子命令**，应通过普通对话或模型工具使用。原命令保留：

| Command / 命令 | Meaning / 含义 |
|---|---|
| `/legion help` | Show command usage / 查看命令用法 |
| `/legion start <key> <task>` | `legion_submit`, new task / 新建任务 |
| `/legion list` | Local references, not live status / 本地引用，不是实时进度 |
| `/legion status <ref> [cursor]` | Live state and event page / 实时状态与一页事件 |
| `/legion continue <ref> <new-key> <feedback>` | `legion_submit` with `previous_task_ref`, explicit new work / 明确续作 |
| `/legion message <ref> <opkey> <taskid> <text>` | Task mailbox only / 仅投递任务邮箱 |
| `/legion resume <ref> <opkey>` | Request recovery of interrupted work / 请求恢复中断 |
| `/legion cancel <ref> [reason]` | Request cancellation / 请求取消 |
| `/legion download <ref> <artifact-id>` | Download an eligible formal export / 下载符合条件的正式导出 |

References must be explicit; `latest` and command attachments are not supported. Command/RPC success, native tool execution and remote task completion are different observations. / 必须明确引用，不支持 `latest` 或命令附件；命令成功、工具执行、远端完成不是同一件事。

## 3. Discover existing capabilities / 搜索现成能力

Example tool arguments / 工具参数示例：

```json
{
  "source": "installed",
  "query": "read",
  "limit": 10,
  "offset": 0
}
```

`source` is `all | installed | market | github` (default `all`); `query` is at most 500 characters. `limit` is 1–30 (default 10), and `offset` is a non-negative integer (default 0). Results include `fetched_at` and `untrusted_source: true`; discovery never installs or executes a result.

`source` 默认 `all`；搜索词至多 500 字符，分页默认 10 条、偏移 0。结果带时间与不可信来源标记，不自动安装或执行。

| Source / 来源 | Contract / 返回边界 |
|---|---|
| `installed` | Current Agent-visible schemas only: `scope: "current_dsh_agent"`, `entries`, `total`, `next_offset`, `grants_remote_access: false`. Not all machine-installed plugins. / 只列当前 Agent 可见工具，不是全机器安装清单。 |
| `market` | Calls native `plugin_market` with `list_indexes`, then `list_plugins` for user-configured indexes. `index_url`, if supplied, must match a configured index. / 只查用户已配置索引，不能临时塞入未知索引。 |
| `github` | Public repository search, at most 10 results and only the first page; `offset_supported: false`. Without a query, `state: "query_required"`. / 最多十条、仅第一页，不伪装支持 offset。 |

Market states distinguish `unavailable`, `not_configured`, `failed`, `partial` and `available`. Up to five indexes are queried per call; `remaining_indexes` identifies the rest. One source's failure does not erase another source's successful results. Cancelling a market wait does not claim to cancel the official market's shared fetch lifetime.

市场不可见、未配置、失败、部分成功和成功分别返回；每次最多处理五个索引，剩余地址在 `remaining_indexes`。不能把失败或尚未读取写成“没有能力”。取消本次等待也不冒充已停止官方市场的共享抓取。

A GitHub discovery failure remains `github.state: "failed"` with an `error` message; the current implementation also includes `github.diagnostics` for typed source errors. These fields address the observed diagnostic gap, but native re-verification is still pending. Failure is not an empty search result. / 当前代码已补来源诊断字段，字段存在不等于原生复验通过；失败仍不能写成“没有结果”。

## 4. Read actual public source / 读取真实公开源码

| Action / 动作 | Arguments / 参数 | Result / 结果 |
|---|---|---|
| `inspect` | `repository`, optional `ref` / 可选分支、标签或 commit | Resolves the chosen/default branch to a fixed `commit`; returns metadata, tree, README, manifest and license observations. / 固定到 commit 后读取目录与预览。 |
| `read` | `repository`, full 40-hex `commit`, relative `path`, optional `offset`, `limit` | Reads a regular non-empty UTF-8 text file at that commit, with continuation fields. / 按固定提交分页读实际文本。 |

`repository` accepts a public `owner/repo` or its canonical `https://github.com/owner/repo` URL, not an arbitrary fetch URL. `read` uses **UTF-8 byte offsets**, not lines or character positions: default `offset: 0`, `limit: 12000`, allowed `limit: 1–65536`. Use the returned `next_offset` rather than calculating a new character offset.

仓库输入只接受公开 GitHub 仓库，不是任意 URL 读取器。`read` 的分页单位是 **UTF-8 字节**，不是行数或字符数；后续读取使用返回的偏移。

- `inspect` exposes at most 2,000 tree entries, one README, eight manifest previews and one actual license-file preview, each preview at most 12,000 bytes. / 目录与预览有上限，不等于完整仓库副本。
- A text file is at most 1 MiB, or a lower configured response limit. Read requests still check the pinned commit/tree/blob identity and whole file bytes. / 单文件上限不因分页被绕过。
- `read` returns `trust`, `status`, `repository`, `commit`, `source_sha`, `path`, `url`, `fetched_at`, `source`, `content`, `encoding`, `sha256`, `blob_sha`, `offset`, `limit`, `end_offset`, `returned_bytes`, `total_bytes`, `offset_unit`, `truncated`, `next_offset` and `next`. Its **SHA-256 covers the whole file**, not only the returned page. / hash 对应整文件，不是当前页。
- Keep `partial`, `errors`, truncation and continuation facts. A limited index or `not_detected` license observation is not evidence of absence. / 截断、未检出、读取失败都不能推成不存在。
- Requests use the fixed GitHub API; redirects, private repositories, symlinks, submodules and binary content are not followed as source files. Nothing is installed or executed. / 不跟随这些目标，也不执行读取的内容。

License metadata and actual text remain source observations with `assessment: "not_performed"`. `NOASSERTION` is not a conclusion that reuse is allowed or forbidden; neither it, missing text nor a repository description grants redistribution rights. Inspect all applicable licenses before adapting or distributing; fetch further pages when the license preview is incomplete.

许可证字段和原文只是来源事实，`assessment` 保持未评估；`NOASSERTION` 既不代表已获授权，也不代表不可复用。预览不完整就继续读取，不能擅自补成 MIT 或其他许可。

### Source error facts / 来源错误事实

For typed GitHub source errors, the current implementation keeps locally defined `name`, `message`, `code`, `trust`, and optional `status`, `rate_limit`, `retry_after_seconds` and `retryable`. `rate_limit` contains `limit`, `remaining`, `used`, `reset_epoch_seconds` and `resource`; invalid or unavailable numeric/header values are `null`. It does not forward arbitrary response bodies, redirect locations or the original exception.

来源诊断只保留白名单事实，不透传响应正文或原始异常。限流值未知时保留 `null`，不捏造剩余额度或重试时间。

`legion_source` still reports a failure: except for aborts, typed source errors append `Source diagnostics: <JSON facts>` to the native error message, rather than becoming a successful tool result. Do not assume the Host exposes these facts as separate structured fields. Discovery can expose the same facts as `github.diagnostics`. These code paths still need native replay to confirm that the author receives the diagnostics.

来源读取失败不会为了带诊断而改报成功；诊断 JSON 位于错误文本中，中断继续抛出。是否真的到达原生作者仍待复验，不能仅凭代码已补字段宣称解决。

## 5. Package authored adapters / 包装作者已完成的适配代码

`legion_bundle` requires an absolute ordinary workspace `directory`, a `spec`, and 1–4 `source_refs`. Each reference is `{ repository, ref?, paths? }`, with at most four extra source paths. Prefer the full commit already reviewed. The tool validates the spec, really re-runs source inspect/read to obtain provenance, then uses native `write`; it does not accept invented caller-supplied hashes or license observations.

输出目录必须是普通工作区的绝对目录，不能是 DSH 配置目录。`source_refs` 优先使用已审的完整 commit；工具会真实复读来源生成记录，不接受编造的来源 hash 或许可事实。

**Shape example only; not runnable adapter code.** Replace every angle-bracket placeholder with real reviewed input. The adapter's example version below is separate from the connector's 0.2.0 version.

**下例只展示参数结构，不是可运行适配代码。** 所有占位符都需替换；示例适配包版本与连接器版本分开。

```json
{
  "directory": "<absolute workspace output directory>",
  "spec": {
    "package_name": "dsh-plugin-my-capabilities",
    "version": "0.1.0",
    "description": "Independently usable adapted capabilities",
    "plugins": [
      { "id": "analyze", "title": "Analyze", "description": "The adapted analysis capability", "entry": "analyze.js" },
      { "id": "render", "title": "Render", "description": "The adapted rendering capability", "entry": "render.mjs" }
    ],
    "files": [
      { "path": "analyze.js", "content": "<reviewed ESM analysis adapter source>" },
      { "path": "render.mjs", "content": "<reviewed ESM rendering adapter source>" }
    ],
    "dependencies": [
      { "name": "@deepseek-ai/dsh-tools", "version": "0.2.1-rc.2" }
    ]
  },
  "source_refs": [
    { "repository": "<owner>/<repo>", "ref": "<full 40-hex commit>", "paths": ["src/index.js"] }
  ]
}
```

### Input and license rules / 输入与许可边界

- Required spec fields: `package_name`, exact `version`, `description`, non-empty `plugins` and `files`. Each plugin has `id`, `title`, `description`, `entry`; each file has `path`, `content`. An entry must already be a listed non-empty relative `.js` or `.mjs` file. / 入口必须真实包含在输入文件里。
- Optional `dependencies` is an array of `{ name, version }` with exact npm semver only, not ranges, URLs, Git specs or aliases. No scripts can be supplied through spec fields. / 只接受固定完整版本，不接收任意 package 字段或安装脚本。
- Optional `license` is only the caller's declaration for code they have authority to license; it is not a verified upstream grant. Put a specific, authorized license text into a file whose path is `LICENSE` to preserve it verbatim. Without that text, no LICENSE is generated; without the field, the package makes no license declaration. / 声明与原文各自按输入保留，不推断权利。
- Rejects traversal, absolute/backslash/NUL paths, duplicate or case/Unicode-alias paths, file/directory conflicts, missing entries, empty content, reserved metadata/control-file replacement and unknown spec fields. / 这些是格式和安全边界，不是恶意代码检测或质量评分。
- At most **256 input files, 64 plugins and 128 direct dependencies**; each output file at most **1 MiB**, total output including generated metadata at most **8 MiB**, provenance JSON at most **256 KiB**, path at most **512 UTF-8 bytes**. / 大小限制按 UTF-8 字节计算。

### Generated metadata and return values / 元数据与返回值

The package is ESM with `private: true`. Root export `.` points to the first entry; **every** plugin also gets `./<id>`. The patch inserts a row with both `id` and `name` equal to `<package>/<id>`. Root/subpath locale and icon exports are included; each plugin has its own title/description metadata and may share the original SVG. Both locale files preserve the supplied wording; they do not claim automatic translation.

生成的是本地适配工程包，不是自动 npm 发布。每项都有独立原生行和子路径元数据；一包装入，逐项启停，不是把每项变成独立 npm 包。locale 保留调用方文字，不冒充翻译完成。

Generated files include `package.json`, `cordis.patch.yml`, locale files, `icon.svg`, `README.md`, `provenance.json` and `SOURCE-NOTICE.md`, alongside the supplied files. The generated package has **no `prepare`, `postinstall` or other scripts**. It writes the declared exact versions to `dependencies`, but **does not scan imports or generate `peerDependencies` or `engines`**. The author must identify runtime dependencies; direct version pinning is not Host peer-compatibility verification. Dependencies may themselves have install scripts, handled through native approval.

包装只记录明确依赖，不自动补运行环境、MCP 或 skill 接线；这些要由真实适配代码完成。依赖自身仍可能有脚本，不能把“生成包无脚本”扩大成“整个依赖树无脚本”。

The internal synchronous helper **`buildBundle(spec, provenance = [])` is pure**: it reads/writes no files, performs no network requests, installs nothing and never evaluates input JavaScript. Its result is:

内部纯函数与有来源读取／原生写入行为的 `legion_bundle` 工具分开。纯函数返回：

```text
{
  files: [{ path, content, sha256 }],
  packageName, version,
  plugins: [{ id, rowId, name, title, description, entry }],
  totalBytes,
  verification: { installed: "unverified", active: "unverified", called: "unverified" }
}
```

The helper preserves caller-provided provenance as data; only the model tool obtains fresh source facts before calling it. Successful **tool** output has:

纯函数只保留传入事实；模型工具先复读来源再交给它。工具成功结果如下，其中文件路径为绝对路径：

```text
{
  state: "written_not_installed", directory, package_name, version,
  plugins: [{ id, rowId, name, title, description, entry }],
  files: [{ path, sha256, bytes }],
  hash_kind: "expected_written_content_not_independent_readback",
  install: {
    tool: "plugin_manager",
    arguments: { action: "install_bundle", target: directory, enabled: false }
  },
  execution_verified: false
}
```

Use a dedicated output directory: native `write` can overwrite existing same-path files. A native write failure reports the already-written subset and does not roll it back. Expected hashes are not independent readback. After reviewing the files, DSH can call official `plugin_manager` with the returned parameters, retain `application`, warnings, pending build approvals and restart requirements, then manage the bundle via `set_bundle` and individual current rows via `list_plugins` / `set_plugin`. Never invent `approvedBuilds` or edit profile package files as a shortcut.

不要把部分写入当成回滚成功，把预期 hash 当成读回，或把安装回执当成真实调用。安装仍以整个 bundle 为单位；各项独立开关交给原生管理器，不另造运行器。

### Native development references / 原生开发参考

Use the Host's `skill` tool with `{ "name": "cordis-plugin-development" }`, then read `references/host-plugin.md` and `references/practices.md` relative to the base directory returned by that skill. Accessing `ctx.tools` needs a native service dependency/injection—for example, the official module form `export const inject = ['tools']`. Service injection does not grant tool-execution approval. Module import, fiber activation, actual tool calls and cleanup on unload are separate observations.

当前生态 skill 与之后生成包的 README 已提供这些精确指针。使用 skill 返回的基目录，不猜安装路径；`cordis_inspect_query` 可只读检查已挂载行，安装和开关仍走 `plugin_manager` 及其权限。这些是开发信息，不会扫描代码猜依赖、自动补注入、执行作者代码或追溯改好已存在的包，也不能证明原作者已经读到。

## 6. Return one native result to a task / 把一次原生结果交回任务

`legion_submit.tool_names` optionally shares at most **30 explicitly selected current Agent-visible tool schemas**. Omission or `[]` shares none. Descriptions and parameter formats are not execution tokens or permission grants.

`tool_names` 只发选定能力的说明和格式，不把本机工具开放给远端直接调用。

### Step 1: explicit native execution, no HTTP / 第一步：只调用本机工具

`legion_call` needs an existing `task_ref` from the same DSH session, a personal Legion token, an explicit recipient task ID, a stable `operation_key`, a non-`legion_*` tool name and a JSON object of arguments. A **new** operation requires that tool to be visible to the current Agent. DSH decides whether to invoke it under native permissions. The bridge never sends HTTP or task messages; the selected tool may have its own network behavior.

使用原任务状态中的实际收件任务 ID；先预约再执行，沿用 Agent、父子调用关系、原始 execution 方法和取消信号，没有后台远程执行器。

The first tool body is a **pending child observation**, not committed outer-call success. A successful, non-aborted child returns `native.state: "unknown"`, `native.observed.state: "succeeded"`, `transport.state: "pending"`, plus a bounded projection of its **final policy-processed `content`**. Hidden `value`, `error` and `additionalContexts` are not alternative sources for that text. A failed/unknown child or cancellation still raises a tool error, with a receipt where available. Initial metadata-save failure is reported separately, not turned into an automatic delivery attempt.

首次正常返回只表示子调用的观察结果；外层策略还可能拒绝、取消或改写内容，不能据此提前发送成功消息。首次失败／未知／取消不会被 pending 包装成成功。

### Root settlement stores metadata only / 等根调用结束，只记元数据

The official `tools/result` observer follows this `legion_call` token through every parent to the root, saving one terminal observation **only after the root result arrives**. It retains call IDs, names and states, never child/parent result bodies. It sends no HTTP and does not mutate the already-returned pending receipt. Without complete root evidence, success remains unconfirmed. Observer write failure cannot change the Host result and can leave recovery pending/unknown.

`transport` 是 **DSH 外层调用链状态，不是网络投递状态**。子调用和所有祖先都成功才记 `native.state: "succeeded"`。祖先失败／取消时，子调用即使成功也只能保持 `unknown`；子调用明确失败则保留 `failed`。

| Receipt field / 回执字段 | Meaning / 含义 |
|---|---|
| `version`, `task_ref`, `operation_id`, `recipient`, `tool_name` | `version: 2` and operation identity / v2 回执及本次操作身份 |
| `native.state` | Initially `unknown`; later `succeeded` only with successful child and ancestor evidence, or `failed` for an observed child failure / 不把子调用成功当外层成功 |
| `native.observed.state` | Child observation: `succeeded`, `failed` or `unknown` / 子调用本身的观察 |
| `native.result`, `projection` | First invocation only: bounded content projection and omission/truncation facts; **not persisted or replayed** by the v2 ledger / 不入 v2 账本，不随恢复返回 |
| `transport.state` | `pending`, `succeeded`, `failed` or `unknown`; native enclosing-call state, not HTTP / 外层调用链状态 |
| `transport.outcomes` | When recorded: ordered `{ call_id, name, state }` for this call through the root; no bodies / 逐层终态元数据 |
| `delivery` for new v2 operations | `{ acknowledgement: "not_attempted", automatic: false, method: "legion_message" }`; no automatic message key / 新操作从未自动投递，不代表旧 v1 历史从未发送 |
| `delivery` when recovering v1 | Historical ACK metadata with `historical: true`, `attempted_now: false`; not the new-v2 `not_attempted` default / 只读保留历史投递事实，不在本次发送 |
| `persistence`, `persistence_error` | Initial metadata-save failure: `"failed"` and a sanitized reason; not an execution or delivery verdict / 初次元数据落盘失败的独立事实 |
| `consumed_by_model_confirmed` | Always `false` / 不把执行或入邮箱当消费 |
| `reused` | `false` on the first receipt; `true` when reading existing metadata / 是否读既有操作状态 |
| `legacy_version`, `recovery_note` | Legacy v1 recovery without authoritative ancestor evidence / 旧版缺证据的说明 |

### Step 2: decide after the Host's final result / 第二步：看到最终结果后另行发送

Only after the **enclosing call's final result is visible** should DSH make a separate decision to call `legion_message` for the original `task_ref` and recipient. Send only the shareable content the Host actually showed, with honest failure/uncertainty. **Do not combine execution and success feedback inside the same `run_code` or another still-running parent.** This is the skill/use protocol, not a runtime interceptor for arbitrary programs.

下面是两次独立调用的参数模板，不是可连写在同一 `run_code` 的脚本。占位符换成原任务／收件人／可见工具，`arguments` 按真实工具 schema 填写；第二次必须等 Host 最终结果可见后再决定。

First, `legion_call` / 先执行：

```json
{
  "task_ref": "<task_ref>",
  "recipient": "<recipient_task_id>",
  "operation_key": "local-result-1",
  "tool_name": "<visible_non_legion_tool>",
  "arguments": {}
}
```

**Wait for the enclosing call to finish and inspect its actual final result.** If sharing is appropriate, a later `legion_message` / **等待外层最终结果，再按实际情况单独发送**：

```json
{
  "task_ref": "<task_ref>",
  "recipient": "<recipient_task_id>",
  "operation_key": "share-local-result-1",
  "text": "<shareable text from the Host's actual final result>"
}
```

The explicit message uses its **own stable operation key** and separate acknowledgement. It does not update the new v2 `legion_call.delivery`, which stays `not_attempted`. A received acknowledgement is not remote-model consumption. Delivery does not wake/resume terminal tasks; explicit new work still uses `legion_submit` with `previous_task_ref` and a new task key.

执行与消息分开后，消息失败不能被说成本机没执行；也不能拿发送错误去补发旧缓存正文。实际消费仍要看原任务后续运行事实。显式消息 ACK 中字符串、字段名和诊断路径的 data URL 清理已修复并通过回归，包括右括号／单引号边界；这不等于所有媒体编码或 ACK 路径均已验证安全。

### Same-key recovery: no execution or body replay / 同键恢复：不重做、不回正文

The same task/key and matching recipient, tool and arguments recover **metadata only**, not another native call or result body. Changed input fails. Existing reservations are checked before target visibility, so recovery works after the **target capability plugin** is disabled/uninstalled, provided Legion Bridge, the original session/state and authorization remain available. A reservation without saved metadata is unknown, possibly in flight or interrupted; do not switch keys to bypass it. This is local duplicate suppression, not cross-machine exactly-once.

v1 records have no authoritative ancestor evidence: cached success cannot establish `native.state: "succeeded"`, and no old text is replayed; an explicit old failure may remain `failed`. A recovered receipt returning normally does not itself mean execution succeeded. Legacy files are not automatically deleted.

**Legacy delivery is a separate historical fact, now preserved on recovery.** A v1 record reads its original message ACK and returns only allowed metadata, with `historical: true` and `attempted_now: false`. Valid `received`, `rejected` and `unconfirmed` states are retained with `record_state: "available"`. Missing, unreadable or invalid ACKs return `unconfirmed` with `record_state: "missing"`, `"unreadable"` or `"invalid"`, never an invented “not sent” conclusion. Recovery does not resend, rewrite the old records or replay `server_response`/result bodies.

允许返回的可选 ACK 字段只有有效 HTTP 状态和脱敏、至多 500 字符的 `reason`；畸形可选字段省略并附 `record_warning`。v1 祖先证据不足与历史消息投递是两件事：前者不能报原生成功，后者不再抹掉旧 `received`。这项修复已纳入当前全套；仍不证明消费、不授权重发，也不等于完整 Host 卸载／恢复旅程通过。

### Local images are not remote media / 本机图片不等于远端媒体

The content projection has a **12,288-byte budget** plus string, shape and depth limits, not a budget for the entire receipt. Explicit image/audio/video content, data URLs and explicitly marked media/encoded fields are omitted. Ordinary long strings and hash identifiers are not classified as base64 by length or appearance; they still obey the existing truncation budget. `media_return` states `text_metadata_only; media cannot be returned in full`. Redaction is not a universal secret detector or a complete markup/URI parser.

Local successful image content is forwarded through DSH user context; additional contexts and turn completion stay on the native path. They are **not** attached to the explicit remote text message. 本机图片、结构化输出、回合结束和后续消息需分别在真实 Host 复验；已有官方 Runtime 隔离证据，不能从投影、元数据回执或全套通过推断作者实际收到或完整协作通过。

## 7. Optional Legion configuration / 可选个人服务配置

These are user/operator settings, not model task parameters. The token value is read only from the Host environment; unknown configuration fields, including inline token values, are rejected.

以下是用户／运营者配置，不接受任务参数改地址、塞令牌或增加权限。

| Setting / 字段 | Contract / 默认与边界 |
|---|---|
| `baseUrl` | Falls back to `LEGION_BASE_URL`, then loopback port 8000; does not start a service. HTTPS remotely, HTTP only on loopback; no URL credentials/query/fragment. / 回退地址不代表提供后端。 |
| `tokenEnv` | Defaults to `LEGION_PERSONAL_TOKEN`; an environment variable **name**, not the secret itself. / 只能填变量名。 |
| `stateDirectory` | Falls back to `DSH_LEGION_STATE_DIR`, then `legion-state` under `DSH_HOME` or the user's `.dsh` directory. Relative paths use the Host working directory; prefer a private explicit directory and retain it. / 状态目录须保持私有。 |
| `candidateHarnesses` | Ordered user-selected array; non-empty becomes `plan.team_policy.candidate_harnesses`. Omission/`[]` omits `plan`; raw `null` fails. No default or fallback. / 候选不由连接器代选。 |
| `projectBindingFile` | User-configured absolute path to JSON at most 16 KiB, containing only `workspace_root`, an absolute directory already authorized by the operator. / 不授予权限，不上传工作区。 |
| `requestTimeoutMs` | Default 30,000 ms, bounds the local wait, not remote task runtime. / 只限制本地等待。 |
| `maxResponseBytes` | Default 4 MiB for a JSON response or dispatch SSE event. / 单次 JSON 响应或接单事件上限。 |
| `maxArtifactBytes` | Default 50 MiB per download. / 单文件下载上限。 |
| `maxEvents` | Default 100, configurable 1–500 per returned page. / 事件分页上限。 |

API routes retain the configured service path prefix; this has offline coverage, **not real reverse-proxy acceptance**. Optional bindings become `project_context`; they do not let the model choose a different authorized workspace. / 路径前缀离线覆盖不能代替实服反代验证；绑定不能被模型用来另选目录。

## 8. Existing task lifecycle / 原有任务生命周期

### Identity, submit and progress / 身份、派单与进度

- `task_ref` is a local 32-hex reference scoped to the configured service and DSH session. The saved `team_id` / `session_id` identify the Legion team/conversation; they are not authorization credentials. `legion_list` only reads the local index. / 换 DSH 会话不会自动继承这些引用。
- Before dispatch, the store atomically reserves the reference and input digest. Same key/input reuses it without another POST; changed input fails. Candidate order contributes to the digest. This is local duplicate-send suppression, not server-enforced or cross-machine exactly-once. / 丢状态或换候选不能作为安全重投依据。
- Submit POSTs `/api/legion/dispatch` with `question`, saved team/session identities, `mode: "auto"`, `allow_direct_model: false`, and optional configured binding/candidates. Only a matching SSE `meta` (`team_id`, `sid`) confirms acceptance; then the local reader closes. / 关闭接单读取不取消远端工作，也不启动第二个循环。
- `submission: "accepted"` means acknowledged, not completed. HTTP 4xx except 408 records `rejected`; HTTP 5xx, 408, timeouts, disconnects or absent/mismatched acknowledgements stay `unconfirmed`. Keep the same key/ref, recover via `list`, and query `status` rather than redispatch. / 未确认不等于未执行。
- Status GETs `/api/legion/team?team_id=…` and `/api/legion/events?team_id=…&after=…`. It checks both saved team and `conversation_id`; missing/mismatched conversation identity fails. Replay must also name the same team. Task IDs come from task-map keys, not nested content. / 不放宽身份核对。
- Events use numeric `event_id`, `next_event_id` and `more_events`; an empty visible page alone is not end-of-history. Omitting the cursor starts at zero. Status and events are not an atomic snapshot. / 保留分页与观察时点差异。
- Returned status/events are sanitized and bounded, not full traces. Error/failure-stage text remains observable where supplied. Runtime, artifacts and `experience_verification` stay separate facts. / 不把诊断可见或服务自评当总验收。

### Commander mailbox observation / commander 来信观察

- `status.mailbox` projects only `mailboxes.commander` from the same identity-checked `/team` response, with `source: "team.mailboxes.commander"` and `trust: "untrusted_source"`. It does not call `/team/messages`, whose default behavior marks messages read. / 复用已核对 team 与 conversation 身份的回包，不另走默认标读接口。
- Optional `after_message_id` is a non-negative safe integer, defaulting to `0`, independent of `after_event_id`. Messages with larger IDs are returned in ascending order, at most `maxEvents` (default `100`) per page. When `more_messages: true`, pass `next_message_id` as the next `after_message_id`; `total_messages` counts the entire returned commander mailbox, not only this page. / 消息与事件各用自己的游标；省略消息游标始终从第一页开始，不保存或自动推进消费位置。
- Pagination is a local projection of the bounded `/team` snapshot, not server-side pagination or an atomic history view; it does not reduce the HTTP response size. / 仍受原有响应字节上限限制，翻页不代表取得全部历史。
- Messages retain `id`, `from`, `to`, `text`, `ts` and, when supplied, the original `read_at`. Timestamps remain service seconds; absent `read_at` stays absent. `read_receipts_modified: false` and `model_consumption: "not_observed"` mean observation neither writes read receipts nor proves model consumption. It does not execute message text or resume work. / 已有 `read_at` 只是原始 UI 已读事实；显示、翻页、读回都不能标为模型已消费，也不自动执行或唤醒。
- `state: "available"` with `messages: []` is an observed empty page. Missing/invalid mailboxes instead return `state: "not_returned"` / `"invalid"`, `messages: null` and a diagnostic; unknown counts/continuation remain `null`, not an empty-mailbox claim. Sanitization remains in force: `truncated`, `text_truncated`, `artifact_refs_truncated` and `projection` retain clipping facts. `text_source: "inline_preview"` marks a referenced long-body preview, not a fetched full body; artifact references expose bounded non-path metadata only. / 缺失或畸形不报“空邮箱”；脱敏、正文预览和分页截断如实保留，不跟随私有路径取全文。

### Follow-up, mailbox, recovery and cancellation / 续作、邮箱、恢复与取消

| Action / 动作 | Contract / 契约 |
|---|---|
| `continue` / submit with `previous_task_ref` | New key, same Legion session, **new team**; explicit new work, not retry or reconnect. / 同会话开新一轮。 |
| `message` | POST `/api/legion/team/message` with saved `team_id`, `recipient`, `text`, fixed `sender: "commander"`; receipt does not establish model consumption. / 仅投递，不自动唤醒。 |
| `resume` | POST `/api/legion/team/resume`; requests recovery of interrupted recoverable work, not rerunning completed work. `no recoverable tasks` is not successful recovery. / 终态新工作不能用恢复冒充。 |
| `cancel` | POST `/api/legion/cancel`; `ok: true` → `requested`, `ok: false` → `rejected`, no explicit `ok` → `unconfirmed`; `stopped_confirmed` remains false. / 已请求不等于进程已停。 |

Message/resume reserve `operation_key` and an input digest before sending. Same key restores only whitelisted ACK metadata without resending, replaying old response bodies or rewriting records; changed input fails. Missing/corrupt ACKs stay unconfirmed, not “never sent.” Recovery rechecks cancellation/disposal after the asynchronous read. JSON `ok: false` is rejected; HTTP/transport uncertainty follows the submission rules. Only minimal sanitized acknowledgements are stored, not arbitrary raw replies. Cancel has no operation-key ledger; its HTTP/transport errors are raised directly. Returned `runtime.cancel_requests`, if present, are observations, not proof of process termination.

消息／恢复也不能换键绕过未知结果。取消错误直接报错，不造回执。本地中断、停用或卸载不会自动取消远端工作。

## 9. Formal exports and retained data / 正式导出与数据保留

Exports are discovered in authenticated task results/events (`artifacts`, `discovered_artifacts` and `artifact_ready`). `legion_download` accepts only the observed `artifact_id`, re-reads live task authorization and rechecks metadata. It does not accept arbitrary URLs or destination paths. Only same-origin formal export routes qualify, without URL credentials, query/fragment or redirects; configured service prefixes are retained once.

下载必须来自任务中观察到的正式导出，实时复核权限和元数据，不能拿历史本地记录当新授权。

An export needs valid SHA-256 in `sha256` or `provenance.sha256`; when both are present they must each be valid and agree. Declared sizes must also be valid. Downloaded bytes are bounded, written privately to a temporary file and renamed only after matching hash and any declared size. Success reports `integrity: "sha256_verified"` and `experience_verification: "not_performed_by_plugin"`: integrity is not file safety, correct behavior or experience acceptance. Service verification text remains attributed to the service.

来源文件 hash 是固定源码整文件观察；生成包 hash 是预期写入值；下载 hash 是已收字节与服务声明的比对。三者不能混为同一种“验收通过”。

Local state retains references, keys/digests, minimal receipts, an event cursor and export metadata. The **v2 native-call ledger saves status metadata only, not result bodies**. Old v1 files are not automatically erased; task text or images may remain in earlier records, actual tool results, both systems' sessions and user files. Raw tasks/full histories are not separately copied into the recovery index. Artifact observations are atomic per `artifact_id`; legacy `artifacts.json` remains readable, with per-ID entries taking precedence. These records are not live authority. User files and state are **not deleted on uninstall**.

两端会话、返回文本、生成工程和下载文件各有数据保留范围；不作“零留存”承诺。状态和用户文件卸载后仍保留。完整边界见[安全说明](SECURITY.md)。
