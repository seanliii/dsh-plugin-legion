# Security and trust / 安全与信任

**0.2.0 is not a production-wide safety certification.** The final integrated record reports **357/357 passed** on Node **v24.20.0**, with `npm run check` and `npm test` both exiting 0, no failures/cancellations/skips, and unchanged source hashes before/after. It ran **2026-10-28 04:25:05–04:25:09 UTC / 12:25:05–12:25:09 Asia/Shanghai**. All 30 recorded code/test/manifest files still match; this reuses the same-byte integrated evidence rather than claiming another run. The scope is isolated tests and the official rc.2 Runtime, not a real Host or remote-consumption check.

**已修复并纳入当前回归：** 显式消息 ACK 嵌入 data URL 的脱敏、旧 v1 `received` 等投递事实的只读恢复，以及固定来源重试。另有来源重试独立 13 项复核通过，不与全套相加。这不表示所有格式、返回路径或未知秘密均被覆盖。一次 `plugin_manager list_bundles` 许可已用于查询，重复查询未获批，不包含安装／启用／重启。图片、结构化输出、取消、结束回合和后续显式发送仍需真实 Host 重放。

## 1. Start without a Legion credential / 开源接入不需要先交令牌

Discovery, public GitHub source reading and packaging do not require a Legion token. They still use network access where applicable and the Host's native tools. Only collaboration with a Legion service needs that service's existing authorization and your personal token; the connector does not provide a backend.

搜索、读公开源码、包装无需 Legion token；联网和本地工具权限仍按各自用途处理。协作才配置个人服务，不要求普通用户先提交凭据。

Only the user/operator configures the service endpoint. `tokenEnv` names a Host environment variable (`LEGION_PERSONAL_TOKEN` by default), not a token value. Keep tokens out of chat, commands, tool arguments, plugin configuration objects, generated files, Git and public reports. Use a dedicated least-privilege personal credential; revoke/rotate exposed credentials through the operator. Do not probe another person's token or task access.

服务地址和个人令牌由用户私下配置；不能靠任务参数改地址、塞令牌或增加权限。令牌泄露后应撤销／轮换，不以联调为名试用他人权限。

## 2. Host plugins are trusted code / Host 插件不是沙箱

When enabled and loaded, a DSH bundle executes with the Host's access to files, environment and network, **outside the agent sandbox**. Review the whole pinned commit and its dependencies before installation/enabling. Native approvals are not a guarantee that a plugin is harmless. Legion Bridge is independent community code, not an official DeepSeek endorsement.

启用并加载后的 bundle 以 Host 权限运行，不能把 agent 沙箱当成插件隔离边界。禁用安装仍可能涉及依赖解析和构建风险；安装原生插件意味着信任实际代码和依赖，不只是信任搜索结果里的说明。

DSH remains the decision maker and runs the official `plugin_manager`. The connector does not take over the main loop, install a second runner or automatically execute instructions from repositories or remote mailboxes. Repository text, tool descriptions, market entries and task messages are **untrusted data**, not system instructions, installation approvals or access grants.

远端文字只能提供信息；是否执行某个工具由当前 DSH 判断并遵守原生权限。不得把 README、市场描述或任务消息里的命令当成自动执行授权。

Pinned official references: [DSH safety statement](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/SAFETY.md) and [plugin publication and trust](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md#L161-L185). The fixed `SAFETY.md` body was verified against its Git blob on **2026-10-28 04:46:03 UTC**: 1,673 bytes, SHA-256 `62075bb51e0f7790441e7722ff12063107b4866019332e71ef01b63b6f880fee`. It describes an experimental developer preview that has not been security-audited. This verifies that one source file, not a deployed Host or all current marketplace rules.

## 3. Public sources, packages and installation / 公开来源、包装与安装

### Source reading / 来源读取

`legion_source` accepts public GitHub repositories, resolves a commit and checks commit/tree/blob identity before returning bounded text. It rejects redirects and does not follow private repositories, symlinks, submodules or binary files as source. A pinned commit/hash identifies the observed bytes; it does not establish the author's trustworthiness, absence of malicious code or redistribution rights.

固定提交和 hash 解决“读的是哪份内容”，不解决“作者可信、代码安全、允许分发”。部分目录、截断、未检测到许可证和请求失败都不能写成“不存在”。当前代码已补限流等白名单诊断事实，不透传响应正文、跳转地址或原始异常；原生作者是否收到这些诊断仍待复验，不能承诺所有错误事实已经完整。

For local tools and markets, `legion_discover` only sees the current Agent's tools and user-configured official market indexes; public GitHub search is a separate source. It cannot add an arbitrary index through `index_url`. Native market fetching follows the official market implementation; search success is not installation approval or a security audit.

插件只使用当前可见工具与已配置索引，不暗用隐藏市场。索引读取与后续安装是两件事。

### Packaging / 包装

`buildBundle` is a pure text/JSON packaging helper: no disk access, network, cache, installation or input-JavaScript execution. **The `legion_bundle` model tool is different:** it obtains actual public-source observations, or reuses eligible pinned facts, and invokes native `write` for the generated files. It does not turn arbitrary source into an adapter or prove that the supplied adapter is safe or runnable.

纯包装函数与有来源读取／原生写入行为的模型工具必须分开。模型／作者先适配接口，包装器只包装文件；语法、运行效果、外部环境和权限需求仍需核查。

Pinned-source reuse is limited to the same native session and connector instance/lifetime, keyed by supplied repository identifiers, full 40-hex commits and path lists. It retains at most **16 groups / 1 MiB**, clears on disposal/lifecycle abort, and contains no authored adapter, destination, native execution result or permission. Individual call cancellation does not clear earlier successful facts. Branches/tags/short or omitted refs and partial/errored observations—including nested `license.error`—are fetched again.

复用的是来源观察，不是授权；成功但截断的预览可复用，原 `fetched_at`、整文件 hash、截断和许可观察保留，明确标 `source_retrieval`／`retrieval`。它不重新确认当前 GitHub 可访问性、不证明读完全文或具备分发权。每次仍核当前 spec／目录并逐文件走当前原生写入与先读后写要求；错误重取、权限／父链／取消／卸载边界有隔离回归，不冒充旧 Host 已加载修复。

Path, duplicate, reserved-metadata, unknown-field and size checks are hard protocol protections, not code review or malware detection. Generated packages have no `prepare`, `postinstall` or other scripts and accept only exact direct dependency versions. This does **not** eliminate scripts or risks in transitive dependencies. No import scanning, automatic `peerDependencies`/`engines` generation or Host compatibility verification is performed.

文件路径和依赖格式合法，不等于代码安全。生成包无脚本，不等于依赖树无脚本；固定直接依赖也不能替代宿主 peer 兼容检查。

Use a dedicated ordinary workspace directory, not `DSH_HOME`/profile storage. Native `write` may overwrite same-path files; partial success is not rolled back. The output's hashes are expected content hashes, not independent readback. The generated package is `private: true`; packaging is not publication.

选择独立工作目录，避免覆盖已有工程。写到一半失败要保留已写清单，不能假称已回滚，也不能把文件清单当成安装成功。

### Installation / 安装

Use the official `plugin_manager` to `install_bundle` the reviewed directory, initially with `enabled: false`. Preserve its actual `application`, warnings, pending build approvals and restart requirements; never invent `approvedBuilds` or bypass it by editing profile package files. Each subplugin can be switched separately using native controls, but the bundle is one installation unit. These switches still need real native verification for a generated package.

作者已自行修好 `marked` 双插件的服务注入和 JSON 输出，官方 Loader／ToolRuntime 独立执行 20 次：14 次业务成功、6 次卸载后预期 `UNKNOWN_TOOL`。最新原生包装的 17 个文件已读回且 hash 一致，3 份业务源码与被测版相同；没有代补业务。它仍未在真实 Host 安装，依赖解析别名不证明安装后的布局。最后保存的包装回执也未带磁盘新版的 `source_retrieval`，不据此宣称 Host 已加载新代码；详见 [PLAN](PLAN.md)。

Installation needs its own current authorization; the consumed list-query permission cannot be reused. An initially disabled install still downloads/resolves dependencies and may carry dependency/build risks. It does not authorize enabling, restarting, publication or a permanent permission change.

The source code and supplied LICENSE text are preserved, not automatically sanitized. Do not supply private code, secrets or unrelated user files as adapter input. Provenance makes origins inspectable; it is neither a signature nor a license grant.

## 4. Local execution and remote return / 本机执行与远端回流

`legion_submit.tool_names` shares only selected current Agent-visible descriptions/schemas, not native execution tokens or remote access. `legion_call` still requires a current-session task reference, personal credential, explicit recipient, stable operation key and tool arguments. New execution requires a visible non-`legion_*` tool. It uses the native DSH runtime, not shell commands constructed from remote text.

**`legion_call` itself sends no HTTP or messages.** The selected native tool may have its own network behavior; this is not a blanket network sandbox. The first receipt is only a pending child observation, not proof that the enclosing call committed. Failed/unknown child execution and cancellation still raise tool errors; initial metadata-storage failure is reported separately.

远端可以提出需求，不能直接获得本机执行令牌。DSH 明确选工具和参数；首次 `native.state: "unknown"`、`transport.state: "pending"` 不能当成功收据。

The official `tools/result` observer follows the current call through all ancestors and saves terminal **metadata only** after the root finishes. It records call IDs/names/states, not child or parent bodies. It neither sends anything nor rewrites the first receipt. Child success plus successful ancestors can establish native success; ancestor failure/cancellation leaves child success unconfirmed. Here `transport` means native enclosing-call state, **not HTTP delivery**.

The first projection uses only the child's final policy-processed `content`, never hidden `value`, `error` or `additionalContexts`. The parent may still replace or reject it. **After the Host actually displays the enclosing call's final result**, DSH can make a separate decision to call `legion_message`, using only visible, shareable content. Do not combine execution and a success message in the same `run_code` or still-running parent. This is usage guidance, not a runtime interceptor for arbitrary code.

消息有自己的稳定操作键和回执；新 v2 `legion_call.delivery` 保持 `not_attempted`、`automatic: false`，不会因后续发送而更新。独立发送失败不代表本机没执行，也不应触发重做。两步设计与专项回归不能代替真实 Host 对待提交结构化输出的验收。详见[精确协议](PROTOCOL.md#6-return-one-native-result-to-a-task--把一次原生结果交回任务)。

Same task/key and matching arguments recover **metadata only**, without repeating native side effects or replaying result text. Changed arguments fail. Recovery checks the existing reservation before target visibility, so it remains possible after the **target capability** is disabled/uninstalled, provided Legion Bridge, the original state/session and authorization remain available. A reservation without saved metadata stays unknown; do not change keys to bypass it. Local duplicate suppression is not cross-machine exactly-once.

v1 记录没有祖先终态证据，旧“成功”不能确认原生成功，旧正文也不回放。已修复的恢复路径只读历史 ACK：有效 `received`／`rejected`／`unconfirmed` 保留，标记 `historical: true`、`attempted_now: false`；缺失、不可读或畸形 ACK 保持 `unconfirmed`，不说成未发送。仅白名单元数据可返回，不回原始响应、不改盘、不重发；异步读取后仍检查取消和卸载。历史收到不等于远端模型消费。

The bridge's content projection is bounded to **12,288 bytes**, with additional shape limits. Explicit image/audio/video content, data URLs and explicitly marked media/encoded fields are omitted. Ordinary long text or a hash is not treated as base64 by length or appearance; existing string/shape/byte limits still apply. Local image/user contexts, `additionalContexts` and turn completion use DSH's native forwarding path; they are not attached to the explicit remote text message. Only bounded, redacted text/structured data is intended for sharing, not full media transfer.

**远端文本不传整图，不等于本机作者可以丢图。** 独立官方 Runtime probe 已验证最终文本、本地图片／上下文转交、媒体／凭据省略、预算和仅元数据恢复；它不证明真实作者收到或远端消费。ACK 的 data URL 清理已覆盖右括号、单引号、header、SVG、编码及 base64 对照，保留分隔后的普通说明。它不是完整 URI／Markdown／HTML 解析器，也不是万能秘密检测，不能宣称所有返回路径已安全。

An explicit message's `acknowledgement: "received"` is a service receipt, not proof of remote-model consumption. `consumed_by_model_confirmed` remains `false` in native-call receipts. No mailbox watcher executes requests or wakes terminal tasks. Follow-up work must be explicit; recovery is for interrupted recoverable work, not a new run of a finished task.

投递 ≠ 消费；任务结束后不会因收到消息自动醒来。原生成功、投递成功、远端消费和有用的用户结果是四项不同事实。

## 5. Service transport and exports / 个人服务与文件下载

Remote Legion URLs require HTTPS; HTTP is restricted to loopback. URL credentials, query strings and fragments are rejected. The client rejects redirects. Service path-prefix handling has offline coverage only; a real reverse-proxy deployment remains unverified. Operators remain responsible for token scope, per-task access, workspaces and remote execution.

服务运营者继续负责真实权限；连接器不把私有服务变成公共服务。可选 `projectBindingFile` 只描述已授权的 `workspace_root`，不授予新权限，也不上传工作区。

Local references are bound to the configured service and DSH invocation's session. Status checks both the saved team and `conversation_id`; missing/mismatched identity fails. Task IDs come from the service's task-map keys, not nested task text. Historical local records never create current authorization.

本地引用不是权限凭据；服务 team／conversation 必须与保存的绑定一致。

Downloads require an observed formal `artifact_id`, live authorization recheck, same-origin export routes and a valid SHA-256. Callers cannot choose arbitrary download URLs or destination paths. URLs cannot contain credentials, query/fragment or redirects. If both `sha256` and `provenance.sha256` are present, they must be valid and agree. Declared size and downloaded bytes are also checked before the private temporary file becomes the final file.

下载只接受当前任务中的正式导出，不能靠本地历史或清理后的 URL 新造授权。hash／大小一致只证明与服务声明匹配，**不是可信签名、病毒扫描、内容正确或体验合格**。

Timeouts and local aborts stop a local wait, not necessarily remote work. HTTP 500/408 and transport failures during submission/message/resume stay `unconfirmed`, not proof that nothing ran. Keep the original keys and inspect the original task. A cancellation acknowledgement or `cancel_requests` record is likewise not proof that OS processes stopped.

## 6. Data retained and shared / 数据保留与分享

| Data / 数据 | Location and boundary / 位置与边界 |
|---|---|
| Discovery terms and public source reads / 搜索与读源 | Sent to GitHub or user-configured native indexes as needed; returned source text may enter the DSH conversation. / 查询并非无网络，但不需要 Legion token。 |
| Pinned-source observations / 固定来源观察 | Successful provenance, including bounded license observations, retained only in memory within the same connector lifetime/session scope, capped at 16 groups / 1 MiB. Original timestamps/hashes remain; disposal/lifecycle abort clears them. / 不缓存适配代码、目录、执行结果或权限；不是新鲜访问证明。 |
| Adapter files and provenance / 适配文件与来源记录 | Written into the selected workspace; includes supplied code, source facts and supplied license text. No automatic removal on uninstall. / 不替作者清除输入代码里的秘密。 |
| Task/context/messages / 任务与消息 | Present in DSH and Legion sessions. Raw inputs/full histories are not separately copied into the recovery index. / 不等于两端会话无留存。 |
| Native-call metadata / 原生调用元数据 | New v2 ledger stores identity and child/ancestor status, not result bodies; no automatic sending or body replay. / 新 v2 只存元数据，不回正文、不自动发送。 |
| Legacy records and visible output / 旧记录与实际输出 | Old v1 files are not automatically erased; DSH/Legion sessions and user files may still contain text or images. Later explicit messages have their own retention. / 不是零留存或匿名数据。 |
| References and observations / 引用与观察 | Keys, IDs, digests, receipts, bounded sanitized reasons/status, cursor and export metadata in private `stateDirectory`. / 不应公开的运行记录。 |
| Personal token / 个人令牌 | Host environment and authenticated service transport; not intentionally written to bridge state. Host environment storage is outside this promise. / 不承诺 Host 对环境变量零留存。 |
| Downloaded artifacts / 下载文件 | User-owned files retained in task storage after disable/uninstall. / 卸载不删文件。 |

Artifact observations are atomic per `artifact_id`, with legacy `artifacts.json` readable and per-ID entries taking precedence. Retained records support recovery; they do not replace live service checks.

Cleaning applies to bounded result projections and covered error paths: selected sensitive fields/keys, the configured token and its URL-encoded form, recognizable bearer strings, URL credentials and recognized sensitive URL parameters. Task-map IDs are added before cleaning. Covered JSON errors use fixed source labels rather than raw input fragments. Omission/truncation labels are also cleaned; this is not blanket filesystem-path removal.

清理覆盖已识别的秘密和已接入的路径，不是万能秘密或个人信息识别器。未知凭据、其他编码、任意正文仍可能漏出；清理不会删除两端原会话、已有记录或下载文件内容。**公开前仍要人工检查**，不能承诺“已脱敏就能安全公开”。

New state directories/files request restrictive 0700/0600 permissions. This is not encryption or isolation from the same OS account or privileged software. Keep state and backups private; use short non-sensitive task/operation keys. Deleting state while an operation is uncertain can lose recovery information without making a retry safe.

## 7. Stop, remove and report / 停止、卸载与反馈

To stop remote work, request cancellation explicitly and inspect the original team's state with the operator. Disable/uninstall does not do this for you or delete user files. Local/native cancellation behavior and remote task completion are separate facts.

停止远端工作要明确取消并核对，不能用卸载代替。需要分享诊断时，去掉令牌、敏感服务地址、任务正文和用户文件内容，不上传未脱敏日志。疑似凭据泄露先私下联系运营者；公开仓库／反馈入口尚未发布，不能把目标仓库地址当成已可用入口。

The new 0.2 real-Host loading, installation of the repaired adapter, independent UI switches, actual Host calls, later explicit messages, consumption, recovery, uninstall and user interaction need their own evidence. The author's repair, 20 official isolated-runtime calls and 17-file package readback are established within their recorded scope; they do not establish an installed dependency layout or general safety guarantee. The ACK/recovery/source-retry fixes have recorded regressions. Broader real-Host acceptance remains open; the author's two recorded adapter defects are no longer open.

## 8. License boundary / 许可边界

MIT covers **this connector only**. Each source project, dependency, author's adapter and optional backend keeps its own license and authorization requirements. A supplied LICENSE is preserved verbatim; absent text is not replaced with MIT. A provenance record or `license` string is a claim to inspect, not a grant made by the packager. Retain required notices and verify distribution rights before sharing a generated bundle.

MIT 不替上游、适配工程、依赖或个人服务授予许可。来源与具体 LICENSE 原文应按实际权利范围保留；`NOASSERTION` 不是允许或禁止复用的结论，拿不准时如实说明，不能用包装成功代替许可判断。

拟公开范围仅为独立新写的连接器、合法依赖声明和文档，不含公司／后端代码、私有证据或用户产物。当前未发布、Git remote 为空；代码权属、发布权限和外发授权仍待确认。
