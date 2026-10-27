# Protocol / 协议

This describes the current client, not a promise that every Legion deployment implements its API. As of **2026-10-27**, the official rc.2 local Host and native command path have been exercised. A real Codex task reached `done`, and a native command downloaded a 2123-byte formal export with matching SHA-256. Model-invoked tools, successful recovery, browser interaction and real reverse-proxy acceptance remain unverified. See [Plan](PLAN.md) for the validation record.

本文描述当前 client 契约，不保证任意 Legion 部署都兼容。截至 **2026-10-27**，官方 rc.2 本地 Host 与原生命令通路已实测；一轮真实 Codex 任务达到 `done`，原生命令下载正式导出成功，2123 字节、SHA-256 一致。模型主动调用工具、真实恢复、浏览器交互与实服反代仍未验收。验证记录见 [PLAN](PLAN.md)。

## 1. Package and configuration / 包与配置

The manifest targets Node `>=24.9.0`, DSH exactly `0.2.1-rc.2`, and `dsh.bundle.patch: "./cordis.patch.yml"`. The actual patch only inserts this row:

manifest 的版本要求与 patch 如上；实际 patch 只插入以下入口，不修改 DSH 主循环：

```yaml
- insert:
    - id: legion
      name: dsh-plugin-legion
```

User configuration is separate from task arguments. `baseUrl` falls back to `LEGION_BASE_URL`, then loopback port 8000; it does not start a service. `tokenEnv` defaults to `LEGION_PERSONAL_TOKEN` and names an environment variable, not a token value. `stateDirectory` falls back to `DSH_LEGION_STATE_DIR`, then a `legion-state` directory under `DSH_HOME` or the user's `.dsh` directory. Relative paths resolve against the Host working directory; prefer an explicit private absolute path and retain it across session reopens. API routes retain the configured path prefix; this has synthetic-test coverage, not real reverse-proxy acceptance.

地址、令牌变量名、状态目录属于用户配置，不接受模型通过任务参数改写；令牌值只从 Host 环境读取，回退地址不会启动服务。相对状态路径按 Host 工作目录解析，宜明确设置私有绝对路径，重开原会话时保留。API 路由保留配置的路径前缀；合成测试已覆盖，但不代表真实反代部署验收通过。

The current source also implements optional user configuration `candidateHarnesses`, an ordered string array such as `["codex"]`, not a model argument. Non-empty input is passed as `plan.team_policy.candidate_harnesses`; omission or `[]` omits `plan`. Dispatch still uses `mode: "auto"` and `allow_direct_model: false`. The bridge supplies no default candidate or fallback and grants no new permissions. Raw `null` is rejected rather than treated as omission. **Local configuration regressions pass; the third live run with an explicit Codex candidate completed and its formal export was downloaded. This does not establish that the earlier missing-helper automatic-planning failure was fixed.**

当前源码已实现可选用户配置 `candidateHarnesses`，值为有序字符串数组，例如 `["codex"]`，不是模型参数。非空时只透传为 `plan.team_policy.candidate_harnesses`；省略或 `[]` 不发送 `plan`。派单仍用 `mode: "auto"`、`allow_direct_model: false`，插件不设默认候选、不添加兜底、不增加权限。原始 `null` 会被拒绝，不会当作省略。**本地配置回归通过；第三轮显式 Codex 候选的真实任务已完成并下载正式导出，但不因此宣称早先自动规划缺 helper 的问题已修复。**

Optional `projectBindingFile` is a user-configured absolute path to JSON of at most 16 KiB, containing **only** `workspace_root`: an absolute directory already authorized by the Legion operator. It is sent as `project_context`; it does not upload a local workspace, grant new access, or let the model select another directory.

可选 `projectBindingFile` 是用户指定的绝对路径，文件至多 16 KiB、只含 `workspace_root`。该目录必须已获服务运营者授权；它作为 `project_context` 传递，不上传工作区、不新增权限，也不允许模型自行选目录。

| Client setting / 字段 | Default / 默认 |
|---|---|
| `requestTimeoutMs` | 30,000 ms; bounds a local HTTP wait, not remote task runtime / 只限制本地等待 |
| `maxResponseBytes` | 4 MiB for JSON responses or a dispatch SSE event / JSON 响应或单条接单 SSE 事件 |
| `maxArtifactBytes` | 50 MiB per download / 每个下载 |
| `maxEvents` | 100 events per returned page; configurable 1–500 / 每页默认 100 条 |

The current entry point registers these seven tools. The model schema is not the positional slash-command grammar; `start` and `continue` both map to **`legion_submit`**.

当前源码注册七个工具；模型参数不是斜杠命令的位置参数。`start` 与 `continue` 都对应 **`legion_submit`**，不是两个独立模型工具。

| Tool / 工具 | Required parameters / 必填参数 | Optional / 可选 |
|---|---|---|
| `legion_submit` | `key`, `query` | `context`, `previous_task_ref` |
| `legion_list` | None / 无 | None / 无 |
| `legion_status` | `task_ref` | `after_event_id` |
| `legion_message` | `task_ref`, `operation_key`, `recipient`, `text` | None / 无 |
| `legion_resume` | `task_ref`, `operation_key` | None / 无 |
| `legion_cancel` | `task_ref` | `reason` |
| `legion_download` | `task_ref`, `artifact_id` | None / 无 |

### Human commands / 人类命令

| Command / 命令 | Mapping / 对应行为 |
|---|---|
| `/legion start <key> <task>` | `legion_submit`: new task / 新建任务 |
| `/legion list` | `legion_list`: local references / 本地引用 |
| `/legion status <ref> [cursor]` | `legion_status`: live state and events / 实时状态与事件 |
| `/legion continue <ref> <new-key> <feedback>` | `legion_submit` with `previous_task_ref` / 原会话中的明确续作 |
| `/legion message <ref> <opkey> <taskid> <text>` | `legion_message`: task mailbox / 任务邮箱 |
| `/legion resume <ref> <opkey>` | `legion_resume`: request recovery / 请求恢复 |
| `/legion cancel <ref> [reason]` | `legion_cancel`: request cancellation / 请求取消 |
| `/legion download <ref> <artifact-id>` | `legion_download`: eligible formal export / 符合条件的正式导出 |

Execution identity and cancellation come from the DSH invocation, not model arguments. Human `/legion` commands register only where the Host supplies `commands`; `/legion help` describes their usage. `ref` is explicit, `latest` is rejected, and attachments are not accepted. RPC-level success alone does not establish model-tool execution or backend completion; the live task and download observations above are separate evidence.

会话身份与本次取消信号由 DSH 调用上下文提供，不接受模型参数伪造。人类命令只在 Host 提供 `commands` 时注册，`/legion help` 可查看用法；必须明确 ref，不支持 `latest` 或附件。单看 RPC 成功不证明模型工具调用或后端完成；上面的真任务和下载结果是另外核对的事实。

Known rc.2 Web limitation, reproduced by maintainers: a session with command results but no chat messages can have its view hidden even when commands return `success` and session persistence works. No chat-view fix is claimed.

维护者已复现 rc.2 Web 上游限制：仅有命令结果、没有聊天消息的会话会隐藏视图，即使命令返回 `success`、会话正确保存。这里不宣称聊天视图已修复。

## 2. Identity and submission / 引用与派单

- A `task_ref` is a local 32-hex reference scoped to the configured service and **DSH session ID**. `team_id` and `session_id` are the corresponding Legion identities. These are references, not authorization credentials.
- `list` reads the local index only. Reopening the same DSH session with the same state directory preserves access; a different DSH session does not automatically inherit it.
- Before the dispatch POST, the store atomically reserves the reference and an input digest. The same key and input reuse that reference without another POST; different input under that key fails. Keep keys short and non-sensitive: keys themselves are saved.
- A configured candidate list, including its order, contributes to the input digest. Changing candidates under an existing key does not redispatch; recover the existing reference instead.
- This is **local duplicate-send suppression**, not server-enforced or cross-machine exactly-once. Missing/moved local state, another DSH session or another machine must not be treated as a safe retry.

`task_ref` 是按服务和 DSH 会话隔离的本地引用，不是权限凭据。发送前先原子落盘；同 key、同输入不重投，换输入会报错。候选列表及顺序也计入输入摘要；换候选不能用来重投原 key，应找回原引用。这里不保证服务端或跨机器只执行一次；丢失本地状态也不是可以重新派单的证明。

`start` calls the client's `submit` with `key`, `query` and optional caller-provided `context`. The client POSTs `/api/legion/dispatch` with `question`, saved `session_id`/`team_id`, `mode: "auto"` and `allow_direct_model: false`, plus the optional operator binding and candidate plan described above. It waits for an SSE `meta` event whose `team_id` and `sid` match the reserved identities, then closes the local reader. It does not hold the DSH main loop open to run a second agent loop.

`start` 经 client 提交任务；只有匹配已保存身份的 SSE `meta` 才算接单回执。SSE 按分块 UTF-8、事件边界及大小限制读取；关闭本地流不表示取消远端执行。

`submission: "accepted"` means acknowledged, not completed. For HTTP 4xx **except 408**, the client saves `submission: "rejected"` with `http_status` and a sanitized reason, then raises the HTTP error. HTTP 5xx (including 500), HTTP 408, connection loss, timeouts or missing/mismatched acknowledgements remain `unconfirmed`: the service may already have accepted work. Reusing the key returns the saved receipt without another POST. **Recover the same reference with `list` and query it with `status`; do not replace the key to reconnect.**

`accepted` 只表示收到接单确认。HTTP 4xx（**408 除外**）先保存 `rejected`、状态码和脱敏原因，再抛出错误；HTTP 5xx（包括 500）、408、断线、超时或回执缺失/不匹配仍是 `unconfirmed`，因为服务可能已经接单。同 key 找回原回执，不再次 POST。**丢回执先查同一 ref，不换新 key 重试；必要时由运营者核对原 team。**

## 3. Progress and replay / 进度与重放

`status` GETs `/api/legion/team?team_id=…` and `/api/legion/events?team_id=…&after=…`. It requires **both** `team.team_id === ref.team_id` and `team.conversation_id === ref.session_id`; a missing conversation ID also fails. Replay must name the same team. The keys of the service's `tasks` map are authoritative `task_id` values; nested task content cannot override them.

`status` 同时核对已保存的 team 与 Legion conversation；`conversation_id` 缺失也会报错，不降级成只核 team。事件重放同样核 team；任务 ID 以服务 `tasks` 映射的键为准，不采信嵌套正文里声称的另一个 `task_id`。

Events are ordered by numeric `event_id` and paged with `next_event_id` and `more_events`. The latter accounts for local truncation, the service's flag and full/filtered pages; an empty visible page is not by itself end-of-history. Pass `next_event_id` onward; omitting the cursor starts at zero. Team and event reads are not an atomic snapshot.

事件按 `event_id` 排序分页；`more_events` 同时考虑本地截断、服务标记与满页/过滤页，不能把可见事件为空当成历史结束。继续翻页要传 `next_event_id`；省略 cursor 从零开始。状态与事件是两次读取，不承诺原子快照。

Legacy events are a **sanitized, bounded projection**, not a full raw trace. Sensitive fields and keys containing recognized secrets are omitted; known secrets, sensitive URL parameters and omission/truncation diagnostic paths are cleaned. Task-map IDs are attached before cleaning; strings and depth are limited. Covered JSON errors use fixed source labels instead of raw input fragments. This is not universal secret detection; see [Security](SECURITY.md). Runtime observations, artifacts and `experience_verification` remain separate facts.

旧版事件只返回清理并限量后的投影，不是完整 trace。敏感字段和含可识别秘密的键会省略，秘密值、敏感 URL 参数和诊断路径也清理；先附上任务 ID，再整体清理。已接入封装的 JSON 错误不回显原文片段。这不是万能秘密识别，详见[安全说明](SECURITY.md)；运行状态、文件观察与体验验收仍分列。

The command summary includes returned event `error`, `failure_stage` and `outcome.failure_stage`. The original failed task was replayed after the native CLI PATH adjustment: `/legion status` returned HTTP 200 and displayed the original `Missing optional dependency` error. This verifies diagnosis visibility, not a change of that old task to success.

命令摘要展示事件中的 `error`、`failure_stage` 与 `outcome.failure_stage`。原生 CLI PATH 调整后已重放原失败单，`/legion status` 返回 HTTP 200 并显示原始 `Missing optional dependency` 错误；这证明诊断可见，不把旧失败单改记为成功。

## 4. Follow-up, message, resume and cancel / 后续、消息、恢复、取消

| Operation / 操作 | Contract / 契约 |
|---|---|
| `continue` | Calls `submit` with a **new key** and `previous_task_ref`; retains the original Legion `session_id` and creates a **new team**. Explicit follow-up work, not reconnect/retry. / 原 session 新 team，只用于明确的后续工作。 |
| `message` | POST `/api/legion/team/message` with saved `team_id`, `recipient`, `text` and fixed `sender: "commander"`. `acknowledgement: "received"` is a service reply, not proof of model consumption; `consumed_by_model_confirmed` remains false. / 只投递邮箱，收到回复不等于模型消费。 |
| `resume` | POST `/api/legion/team/resume` for the saved team. Requests recovery of interrupted, recoverable work; does not rerun completed work. / 只请求恢复可恢复的中断任务。 |
| `cancel` | POST `/api/legion/cancel`: `ok: true` → `cancellation: "requested"`; `ok: false` → `"rejected"`; no explicit `ok` → `"unconfirmed"`. Returned `stopped_confirmed` is always false. / 拒绝不是已请求，已请求也不是进程停止。 |

Keep the RPC envelope, command result and service observations separate. A command/RPC can succeed while the service reports `no recoverable tasks`; that is **not successful recovery**. The later real Codex task and command download succeeded, but did not validate recovery. The earlier planner-helper and pre-model CLI startup failures remain documented in [Plan](PLAN.md), not reclassified as success.

RPC 外层、命令结果和服务任务状态要分开看。命令调用成功，但服务回复 `no recoverable tasks`，**不是恢复成功**。后来的真 Codex 任务与命令下载已成功，但没有验证恢复。早先自动规划缺 helper 和模型请求前 CLI 启动失败的经过保留在 [PLAN](PLAN.md)，不改记为成功。

`message` and `resume` reserve `operation_key` and an input digest before sending. Reusing the same key restores the recorded receipt without resending; changed input fails. JSON `ok: false` records `acknowledgement: "rejected"`; HTTP refusals and uncertainty follow §2, including HTTP 500 remaining `unconfirmed`. Stored receipts retain the state, bounded sanitized reason and HTTP status when available, not the raw reply. Check the original team instead of choosing another operation key to bypass uncertainty.

`message`、`resume` 也先落操作 key 和输入摘要；同 key 找回原回执、不重发，换输入报错。JSON `ok: false` 记为 `rejected`；HTTP 拒绝与未确认的区分同第 2 节，500 不算明确拒绝。回执只保存状态、有限脱敏原因和已有 HTTP 状态码，不存原始回复。不确定时先查原 team，不换操作 key 绕过。

Cancellation has no operation-key ledger. Its HTTP/transport errors are raised, not converted into a cancellation receipt. `status` exposes sanitized `runtime.cancel_requests` when supplied by the service; these remain observations, not evidence that processes stopped.

`cancel` 不使用操作 key 账本；HTTP/连接错误直接报错，不伪造取消回执。服务提供 `cancel_requests` 时，`status` 会清理后放入 `runtime`，但取消记录仍不证明进程已停止。

Local abort, plugin disposal, disabling or uninstalling closes local readers only; remote work is not automatically cancelled. / 本地中断、停用或卸载只关闭本地读取，不会自动取消远端任务。

## 5. Formal exports and storage / 正式导出与保存

The client discovers export metadata in authenticated task results/events: `artifacts`/`discovered_artifacts` arrays and single `artifact_ready` events are supported. It returns an `artifact_id`; `download` requires that ID and re-reads live task status before checking the saved export again. Only same-origin export routes are eligible, without URL credentials, query/fragment or redirects. Callers cannot supply arbitrary URLs or filesystem paths.

client 从已认证任务中收集导出，既读 `artifacts`/`discovered_artifacts` 数组，也读单条 `artifact_ready`。下载要传返回的 `artifact_id`，并重新核实时任务与元数据，只接受同源正式导出；不能传任意 URL 或本地路径。

Service-relative and already-prefixed same-origin export URLs normalize under the configured `baseUrl` prefix **once**: the prefix is neither dropped nor duplicated. This is covered by synthetic tests only, not a real reverse-proxy deployment.

服务相对路径和已带前缀的同源导出 URL，都会归到配置的 `baseUrl` 前缀下，既不丢前缀，也不重复加。这里仅有合成测试证据，真实反代仍待验证。

An eligible export needs a valid SHA-256 from `sha256` or `provenance.sha256`; if both exist, both must be valid and agree, ignoring letter case. Invalid or conflicting hashes leave the export ineligible for download. Size metadata, when supplied, must also be valid. Bytes are written to a bounded temporary private file and renamed only after hash and any declared byte count match. Success reports `integrity: "sha256_verified"` and **`experience_verification: "not_performed_by_plugin"`**. Service verification text is attributed to the service, not adopted as the bridge's verdict.

SHA-256 可来自 `sha256` 或 `provenance.sha256`；两者都有时必须各自有效且一致（忽略大小写），冲突就不能下载。下载成功只证明字节与服务声明一致，不证明文件安全、内容正确或体验合格。服务自带验证文字仍是服务的说法，不变成插件总判决。

In the third live run, `connection-check.html` was downloaded through the native command: 2123 bytes, matching SHA-256. Another export without a valid SHA-256 was rejected. Browser `file://` access was denied by the validation tool's safety policy and was not bypassed, so HTML button behavior remains untested.

第三轮已用原生命令下载 `connection-check.html`：2123 字节、SHA-256 一致；另一条无有效 SHA-256 的导出被拒。浏览器 `file://` 访问被验证工具安全策略拒绝，未绕过，因此 HTML 按钮行为仍未实测。

The local store keeps immutable references, keys/input digests, minimal acknowledgement records, a delivered-event cursor and export metadata. It does not separately save raw queries, full histories or raw operation replies. Those contents can still exist in DSH/Legion sessions and returned projections. Downloaded user files live under the task's state directory; **uninstall does not delete records or artifacts**.

本地保留最小恢复记录与导出元数据，不另存原始任务、完整历史或原始操作回复；这些内容仍可能存在于两端会话及返回内容。下载文件属于用户，卸载不删除状态或文件。

Export observations are atomically stored per `artifact_id` in `artifacts/<artifact_id>.json`, so different IDs do not replace one shared snapshot. Reads also include legacy `artifacts.json`; a per-ID file overrides the matching legacy entry. The read/write interface is unchanged. This accumulated history is **not live authorization**; every download still checks the service.

成果观察按 `artifact_id` 原子写入 `artifacts/<artifact_id>.json`，不同文件 ID 不再互相覆盖整份快照。读取兼容旧 `artifacts.json`，同 ID 以新文件为准，读写接口不变。这只是累积的历史观察，**不是实时授权**；每次下载仍核服务。
