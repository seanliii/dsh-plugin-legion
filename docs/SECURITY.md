# Security and trust / 安全与信任

**Scoped review, not production-wide certification.** As of 2026-10-27, an independent offline review found no new blockers in the reviewed snapshot. This does not establish universal secret detection, production-wide safety or complete Host/service acceptance.

**有限范围复核，不是生产安全认证。** 截至 2026-10-27，独立离线复核在所审快照内未发现新阻断；这不证明能识别所有秘密、生产环境普遍安全或完整 Host/服务验收通过。

## A trusted Host plugin, not an agent sandbox / Host 插件不是 agent 沙箱

Legion Bridge is independent community code. An installed DSH bundle executes with the Host's access to files, environment and network, outside the agent's sandbox. Review the complete pinned commit and its dependencies before enabling it. DSH's approvals and sandbox are not a guarantee that an installed plugin is harmless.

本插件是独立社区代码。DSH bundle 在 Host 权限下访问文件、环境和网络，不能把 agent 沙箱当作插件隔离边界。安装前审查完整固定 commit 与依赖，不因有审批或沙箱就假定插件安全。

Official sources: [DSH safety statement](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/SAFETY.md), [plugin publication and trust](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md#L161-L185).

## User configuration and existing authority / 用户配置与已有权限

- Only the user/operator supplies the service address and personal token. Task arguments are not a way to change the endpoint, inject a token or grant access.
- The token is read from the Host environment (`LEGION_PERSONAL_TOKEN` by default). `tokenEnv` selects an environment **name**, not a secret value. Do not put tokens in chats, slash commands, plugin configuration objects, tracked files or public reports.
- Remote service URLs require HTTPS; HTTP is limited to loopback. URL credentials, query strings and fragments are rejected. Reverse-proxy path-prefix handling has **synthetic-test coverage only; real deployment is unverified**.
- The service operator remains responsible for token scope, per-task authorization, allowed workspaces and any remote execution. The bridge operates only within that existing authority; it does not provision a backend or make a private service public.
- Optional `projectBindingFile` must be deliberately configured by the user. Its sole `workspace_root` field describes a directory already authorized by the service operator; it is not an access grant or a workspace upload.

服务地址和个人令牌只由用户配置；任务不能改服务地址、塞令牌或创造权限。个人令牌只经 Host 环境读取，`tokenEnv` 只是变量名。远端要求 HTTPS；反代路径前缀仅合成测试通过，实服反代未验证。服务运营者继续负责令牌范围、任务授权、工作区与执行权限；项目绑定不授予新权限，也不复制整个工作区。

Local references are scoped to the configured service and DSH invocation's session, not model-supplied identity. `status` matches the service's `team_id` **and** `conversation_id` against the saved Legion team/session binding; a missing or mismatched conversation ID is rejected. Task IDs come from the service's task-map keys, not nested task text.

本地引用按配置服务与 DSH 调用会话隔离，不采信模型自报身份。`status` 同时核 team 与已绑定的 Legion conversation，`conversation_id` 缺失或不符就报错；任务 ID 取服务映射的键，不让任务正文覆盖。

Use a dedicated, least-privilege personal credential. If exposed, have the operator revoke/rotate it and update the Host environment privately. Do not test another user's token or another team's access.

使用专用、最小权限的个人令牌；泄露后请运营者撤销或轮换，并私下更新 Host 环境。不要以联调为名试用他人令牌或访问他人任务。

## Transport and downloads / 网络与文件

All client fetches reject redirects. Downloads must come from export metadata observed for the authenticated task, pass same-origin/export-route checks and have a valid SHA-256. The client re-reads live task status before downloading and rechecks stored metadata; local state is not a new authority. Callers cannot supply an arbitrary download URL or destination path.

所有 fetch 均拒绝重定向。下载只接受已认证任务中观察到的正式导出，要求同源、允许的导出路径和 SHA-256；下载前重新查询任务并复查本地记录。调用方不能指定任意下载 URL 或落盘路径，本地记录也不能创造服务端权限。

Export URLs retain the configured service prefix once, rather than falling back to the proxy's site root. The URL and its decoded form are checked for configured credentials; a match is refused, not rewritten into a usable link. SHA-256 can come from `sha256` or `provenance.sha256`; if both exist, invalid or conflicting values block download.

导出 URL 保留配置的服务前缀，不退回代理站点根，也不重复加前缀。URL 及其解码形式若含配置凭据就拒绝，不先抹掉秘密再拿去下载。`sha256` 与 `provenance.sha256` 都提供时必须有效且一致，否则不能下载。

Response, event and download limits bound local reads. A local HTTP timeout or DSH abort closes the connection, **not the remote job**. For submission/message/resume, HTTP 500/408 and transport failures stay `unconfirmed`, not definite rejection; keep the original reference/key and check the team before any further action.

响应、事件和下载有读取限制。本地超时或 DSH 中断只关闭连接，**不证明远端任务停止**。派单、消息或恢复遇到 HTTP 500/408、断线时保持未确认，不能认定服务没执行；保留原 ref/key，先核原 team。

Cancellation is `requested` only when the reply has `ok: true`; `ok: false` is `rejected`, and no explicit `ok` is `unconfirmed`. HTTP/transport errors are raised rather than fabricated as a receipt. Neither an acknowledgement nor a returned `cancel_requests` record proves OS processes stopped.

取消只有 `ok: true` 才记为已请求；`ok: false` 是拒绝，没有明确 `ok` 则未确认。HTTP/连接错误直接报错，不伪造回执。取消回执或 `cancel_requests` 记录都不证明进程已停止。

Verified hash/size means transport integrity relative to the service's declaration, not a trusted signature, malware scan or experience test. Treat downloaded files as untrusted user content; inspect them before opening or executing them.

hash/字节数一致仅表示与服务声明匹配，不是可信签名、病毒扫描或体验测试。文件仍应按不可信内容处理，打开或运行前自行检查。

## What is retained / 数据保留

| Data / 数据 | Location and limit / 位置与边界 |
|---|---|
| Task, context, follow-up and message text / 任务与反馈 | Naturally present in DSH and Legion sessions. Not separately copied as raw inputs into the bridge recovery index. / 两端会话自然保留，恢复索引不另存原文。 |
| Personal token / 个人令牌 | Host environment and authenticated transport; not intentionally written into bridge state. Host environment storage is outside this promise. / 不写入插件状态；不对 Host 自身环境保存方式作零留存承诺。 |
| References and observations / 引用与观察 | Keys, identifiers, input digests, minimal receipts (including bounded sanitized reasons/status codes), cursor and export metadata in `stateDirectory`. These are sensitive local records, not anonymous telemetry. / 私有记录含有限脱敏原因和状态码，不是匿名统计。 |
| Status and legacy events / 状态与旧事件 | Sanitized/bounded values returned to DSH; may still contain task content. / 经清理和限制后返回 DSH，仍可能含任务内容。 |
| Downloaded artifacts / 下载文件 | User files cached in the task's state directory; retained after disabling or uninstalling. / 属于用户，停用或卸载后仍保留。 |

Artifact observations use separate atomic files per `artifact_id`, with legacy `artifacts.json` still readable and per-ID entries taking precedence. Different IDs no longer overwrite a shared snapshot. This history does **not** grant current download rights or replace live service checks.

成果观察按 `artifact_id` 分文件原子保存；仍读旧 `artifacts.json`，同 ID 以新文件为准。不同 ID 不再覆盖同一份快照；这些历史观察不是实时下载权限，不能替代服务复核。

Current cleaning applies to the bridge's returned projections and covered error paths:

- Selected sensitive fields are omitted. An entry is also omitted if its key contains a recognized secret; omission/truncation diagnostic paths are cleaned too. These are projection paths, not a blanket removal of filesystem paths.
- Task-map IDs are attached as `task_id` **before** the task is cleaned, so the displayed ID is covered, not just the nested task content.
- Text cleaning replaces the configured token and its URL-encoded form, recognizable bearer strings, HTTP(S) URL credentials and values of recognized sensitive URL parameters such as `share`, `token` and `signature`. Other parameters may remain. A cleaned URL is display text, not a newly authorized download link.
- Covered JSON parsing failures in service responses, dispatch acknowledgements, project bindings and saved bridge data use fixed source labels instead of quoting raw input fragments. This does not certify every possible exception path.

当前清理覆盖插件返回的投影和已接入的错误路径：

- 省略选定的敏感字段；键名本身含可识别秘密时，整项省略。省略/截断诊断中的路径也会清理，但这些是投影路径，不代表自动删除所有文件系统路径。
- 先从服务映射附上 `task_id`，再清理整个任务，避免只清正文却漏掉显示的任务 ID。
- 替换配置令牌及其 URL 编码形式、可识别的 bearer 字符串、HTTP(S) URL 内嵌凭据，以及 `share`、`token`、`signature` 等已识别敏感参数的值；其他参数可能保留。清理后的 URL 只是显示文本，不是重新授权的下载地址。
- 服务响应、接单回执、项目绑定和本地恢复数据中，已接入统一封装的 JSON 解析失败只报告固定来源标签，不回显原始片段；这不代表所有异常路径都已验证。

**This is not a universal secret or personal-data detector.** Unknown credentials, unfamiliar encodings and sensitive free text can survive these rules. Cleaning does not erase the underlying DSH/Legion sessions, existing records or downloaded file contents. Review diagnostics before sharing them.

**这不是万能秘密或个人信息识别器。** 未知凭据、其他编码方式和任意正文中的敏感信息仍可能漏出。清理不会抹掉两端原会话、已有记录或下载文件内容；公开前仍须人工检查。

New state directories/files request restrictive permissions (0700/0600); that is not encryption or isolation from the same OS account or privileged software. Choose a private `stateDirectory`, protect backups and avoid shared/synchronized directories unless their access is understood. Use non-sensitive task keys.

新建状态目录/文件使用 0700/0600 权限，但不是加密，也不能隔离同一系统账户或高权限软件。状态目录与备份应保持私有，key 不要夹带敏感信息。

## Verification status / 验证状态

The maintainer-run suite passed **110/110**, with 0 failures; `npm run check` exited 0. A separate reviewer ran **13+7 independent offline cases**, all passing, and found no new blockers in the reviewed scope. The additional seven cases are distinct from the maintainer's seven secret-echo regressions; the reviewer inspected those recorded red/green results rather than rerunning them. These checks do not prove production-wide safety.

维护者亲跑全套 **110/110 通过、0 失败**，`npm run check` 退出码 0。独立复核另跑 **13+7 条离线用例**，全部通过，本次范围无新阻断。补充 7 条与主线程 7 条秘密回显回归不同；复核者对后者核的是原始红/绿记录，并非再次执行。这不是生产环境普遍安全证明。

The operator reloaded the personal Legion service through its existing `launchd` lifecycle, only prioritizing the signed local native Codex path in `PATH`; no model, credential or source change was part of that reload. An isolated DSH Host loaded the updated plugin. The next real Codex task reached `done`: a native command downloaded `connection-check.html` (2123 bytes, SHA-256 matched), while an export without a valid SHA-256 was rejected without relaxing checks. These live observations were reported by the maintainer, not established by the offline review.

操作者沿个人 Legion 原有 `launchd` 生命周期重载，仅在 PATH 前置已签名的本机原生 Codex 路径；这次重载未改模型、凭据或源码。隔离 DSH 已加载最新插件。其后第三轮真实 Codex 任务达到 `done`，原生命令下载 `connection-check.html` 成功（2123 字节、SHA-256 一致）；另一条无有效 SHA-256 的导出仍被拒，未放宽校验。这些实服事实由维护者提供，不是独立离线复核得出的结论。

Browser `file://` navigation was denied by the validation tool's safety policy and was not bypassed. HTML button interaction, model-invoked tools and successful real recovery remain unverified. Package allowlists and documentation links must be rechecked on the final release payload; an older reviewed package does not certify later documentation or packaging changes.

浏览器 `file://` 访问被验证工具安全策略拒绝，未绕过；HTML 按钮、模型主动调用工具与真实恢复仍未验收。最终发布包仍需核白名单与文档链接，旧审查包不为后续文档或打包变更背书。

## Stop, remove and report / 停止、卸载、反馈

If remote work must stop, explicitly request cancellation and inspect the original team's state with the operator. Disabling/uninstalling the plugin does not perform that cancellation or delete downloaded user files. Retain recovery records while a submission or operation is unconfirmed; deleting them does not establish that retrying is safe.

需要停止远端工作时，应明确请求取消，并与运营者核对原 team。卸载不会代办取消或删除用户文件；回执不明时保留恢复记录，删除记录不代表重试安全。

Before sharing diagnostics, remove tokens, service-specific sensitive addresses, task text and user file contents. Do not place unredacted logs or credentials in a public issue. Report suspected credential exposure privately to your operator.

公开反馈前去除令牌、敏感地址、任务正文和用户文件内容；不要向公开 issue 上传未脱敏日志。疑似凭据泄露先私下联系运营者。

## License boundary / 许可范围

MIT covers this connector package only. The backend is not included; its license, availability and operator authorization are separate.

MIT 仅覆盖连接器包。后端不随包提供，其许可、服务可用性和运营者授权另行确认。
