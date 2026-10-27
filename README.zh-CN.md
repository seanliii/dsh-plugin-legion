# Legion Bridge

[English](README.md) | 简体中文

把开源能力带进 **DeepSeek Harness（DSH）**，需要时再和你自己的 Legion 服务协作。`dsh-plugin-legion` **0.2.0** 能找现成工具／插件、按固定 commit 读公开 GitHub 源码、包装作者已适配的代码，并通过“本机调用、再显式发消息”两步把选定结果交回 Legion 任务。

**普通用户从开源能力接入开始，不必先配置 Legion token。** 搜索、读取公开源码和包装代码都不需要它；只有 Legion 协作才需要你有权使用的服务及本人的个人令牌。安装包不包含后端。

DSH 保留自己的对话、主循环、工具选择和权限。安装与启停交给官方 `plugin_manager`，不另造运行器。这是独立社区插件，不是 DeepSeek 官方产品，也不代表官方背书。

## 先从一个想用的能力开始

连接器安装并启用后，在普通 DSH 对话里说：

```text
帮我找能完成这件事的现成 DSH 插件。先给来源和限制，不要安装。
```

如果需要适配，把 `<owner>/<repo>` 换成你要查看的公开仓库：

```text
按固定 commit 读取 <owner>/<repo> 的真实接口和许可证。为我需要的能力编写适配代码，再把能独立使用的能力包装成一包里的多个插件。安装前先给我看文件。
```

这是让 DSH 研究并编写适配工程，**不是承诺自动转换任意项目**。Host 提供 skills 服务时，DSH 可按需阅读 `legion-ecosystem` 技能。

| 你想做什么 | 入口 | 实际提供什么 |
|---|---|---|
| 找已有能力 | `legion_discover` | 当前 Agent 可见工具、用户已配置的原生市场、公开 GitHub；失败不会伪装成空结果。 |
| 看懂公开项目 | `legion_source` | 固定 commit 的真实源码、README、依赖和许可文本；明确保留分页与截断。 |
| 包装作者已适配的代码 | `legion_bundle` | 工作区文件与原生 bundle 元数据；**只写入，不安装、不执行**。 |
| 安装或开关能力 | 官方 `plugin_manager` | DSH 原生安装、审批和各插件独立开关。 |
| 为 Legion 任务调用本机工具 | `legion_call` | 一次明确的原生调用，首次回执是 **pending**；桥接器不发 HTTP 或消息，仍需协作配置。 |
| 看到最终结果后再分享 | `legion_message` | 下一次明确发送，单独返回投递回执；不证明远端已消费。 |

搜索里的“已安装”只指**当前 Agent 可见工具**，不是全机器清单。市场搜索需要启用可选的官方市场工具，并由用户配置索引；没有内置的全网总目录。GitHub 和远程索引读取需要网络，但不需要 Legion token。详见[生态用法](docs/ECOSYSTEM.md)和[精确参数](docs/PROTOCOL.md)。

## 环境与安装

- Node.js **>=24.9.0**，官方 npm DSH **精确为 `0.2.1-rc.2`**。
- 按需让当前 Agent 看见相应原生工具：写文件用 `write`，安装用 `plugin_manager`，市场搜索可选 `plugin_market`。
- 斜杠命令还需要 Host 的 `commands` 服务。0.2 新增的四个入口是模型工具，不是新的 `/legion` 子命令。

启用前审查固定提交的代码和依赖：DSH bundle 在 **agent 沙箱之外，以 Host 权限运行**。见[安全说明](docs/SECURITY.md)。

**尚未公开发布。** 当前未配置 Git remote；公开仓库、公开固定 Git 安装、索引、目录投稿／收录与 npm 发布均未完成。代码权属、发布权限和外发授权仍待确认。仓库公开并审查提交后，可使用以下安装模板：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#<PUBLIC_FULL_COMMIT_SHA>'
```

这**还不是可直接执行的发布命令**。占位符须替换为真实公开提交的完整 40 位 SHA；保留 `-w`，使用其他 profile 时替换 `web`。提交中必须已有可运行 JavaScript 和 bundle patch。

固定 Git 安装、官方 Discover 自托管索引、1024Store 目录收录是不同路线。已审商店源码快照的一键安装是 **npm-only**；没有 npm 发布时，条目可以是 **browse-only（只可浏览）**。Git 安装不要求 npm 发布账号。详见[发布路线与待补证据](docs/MARKET.md)。

## 生成的插件包是什么

作者先依据真实接口，用 DSH 原生插件 API 完成适配；`legion_bundle` 再包装这些文件。它不会把任意库或应用一键变成可用插件。

- 按**可独立使用的能力**拆分，不按源文件机械拆分；共用代码可以继续共用。
- 安装单位是整个 bundle。每项 `<package>/<id>` 有独立原生插件行、export、显示名称／说明和图标元数据，因此可以分别启停；它们不是各自独立的 npm 包。
- 生成 `package.json`、`cordis.patch.yml`、locale、简单原创 SVG 图标、README、`provenance.json` 和 `SOURCE-NOTICE.md`。工具会重新读取来源事实，缺失和部分读取不会被抹掉。
- 调用方提供的 `LICENSE` 原文保留，不替上游编造许可，也不套用连接器的 MIT。依赖只能声明固定完整版本，不从 imports 自动猜运行环境。

请选择独立的普通工作目录，不要选 DSH profile 目录；原生 `write` 可能覆盖已有同名文件。成功返回 `written_not_installed`，列出的 hash 只是预期写入内容，**不是独立读回结果**。之后由 DSH 使用官方 `plugin_manager` 安装该目录，先保持禁用，检查真实警告和构建审批，再启用需要的 bundle 与各项插件。安装状态、激活状态、真实调用仍须分别验证。

## 可选：和你自己的 Legion 服务协作

只有这一部分需要已获授权且可用的 Legion 服务及个人令牌。安装连接器不会提供或启动服务。

请在 DSH Host 环境中私下设置。JSON Environment 编辑器中的值是**带双引号的 JSON 字符串**：

| 变量 | JSON 值示例 |
|---|---|
| `LEGION_BASE_URL` | `"https://legion.example.invalid"` |
| `LEGION_PERSONAL_TOKEN` | `"<你的个人令牌>"` |

真实值由你和服务运营者私下配置。令牌**不要放进聊天、命令参数、插件配置或 Git**。普通进程环境变量使用普通字符串，不额外包一层 JSON。远端服务要求 HTTPS，只有回环地址允许 HTTP。

如果服务支持，可选用户配置示例：

```json
{
  "candidateHarnesses": ["codex"]
}
```

这是用户配置，不是模型参数。非空列表按原顺序传给服务；省略或 `[]` 不发候选计划，连接器不选默认成员、不添加兜底。私有状态目录和项目绑定选项见[协议](docs/PROTOCOL.md)。

```text
/legion help
/legion start page-1 制作一个含状态文字和按钮的 HTML 页面。
/legion status <task_ref>
/legion download <task_ref> <artifact_id>
```

使用返回的 `task_ref`，从 `status` 中选择可下载的 `artifact_id`，不要照抄占位符。`list`、`continue`、`message`、`resume`、`cancel` 仍保留。

通过 `legion_submit` 提交时，可选 `tool_names` 只传你明确选中的可见工具说明和参数格式，不授予远端执行权限。DSH 自己选择本机工具、参数和收件任务，沿用原生权限；仓库文字和远端消息不是执行授权。

### 分两步分享本机结果

**第一步只执行，不发消息。** 例如对 DSH 说：

```text
用 legion_call 为原任务调用选定的本机工具，先给我看 Host 最终结果，不要发任务消息。
```

`legion_call` 自身**不发任何 HTTP 请求或消息**；被选中的原生工具可能有自己的联网行为。首次回执只是子调用观察：`native.state: "unknown"`、`transport.state: "pending"`，可附子调用最终 `content` 的限长投影，不能证明外层 DSH 调用成功。等根调用结束后，官方 `tools/result` 观察器只保存**状态元数据**，不存正文、不回改首次回执，也不发送结果。

**第二步要等外层调用的最终结果真正可见，再单独决定是否发送。** 例如：

```text
现在用 legion_message 把 Host 实际展示、允许分享的结果发给原任务和收件人；失败或未知也要如实写出。
```

**不要把执行和成功消息写进同一个 `run_code` 或仍未结束的父调用。** 这是使用协议，不代表连接器能拦截所有此类程序。消息使用自己稳定的 `operation_key`，其回执单独记录；它不会更新**新 v2 操作**的 `legion_call.delivery`，后者仍是 `not_attempted`、`automatic: false`；这不意味着可以抹掉 v1 的历史投递回执。

**分享仅限经限长、脱敏处理的文本／结构化数据，不含图片、音频、视频二进制。** 代码在本地 DSH 通路转交图片和原生上下文，不代表远端能收到整图。只能使用 Host 最终实际展示的内容，不能取隐藏的子调用值或旧缓存正文补发。投递回执不证明远端模型已消费，也不会自动唤醒终态任务。

**结果不明时保留原 key。** 保留状态目录，重开同一个 DSH 会话，用 `/legion list` 找回引用，再查原 `status`；不要换 key 或候选来“重连”。同键、同参数的 `legion_call` **只恢复元数据，不重做、不回放旧正文**。即使目标能力已停用／卸载，仍可恢复；前提是 Legion Bridge、原状态／会话和授权仍可用。v1 旧记录缺少祖先终态证据，不能据此确认成功；缺结果保持未知，不是重做副作用的许可。这只是本地去重，不保证跨机器只执行一次。`continue` 明确新建后续工作，`resume` 只请求恢复中断；取消不证明进程已停。

## 验证状态：0.2.0

**离线验证已通过：** Node **v24.20.0** 下，`npm run check` 与 `npm test` 均退出 0，全套 **331/331 通过**。记录时间为 **2026-10-27 20:25:16 UTC／2026-10-28 04:25:16 Asia/Shanghai**，源码前后哈希一致。范围是隔离单测和官方 rc.2 Runtime，不是真实 Host 旅程；本次文档更新只复用证据，没有重跑测试。

显式消息 ACK 嵌入 data URL 的泄漏和旧 v1 投递 ACK 恢复，已在覆盖的用例中修复并通过回归；这不保证所有返回格式或执行路径都已验收。

**真实 Host 验收仍未完成。** 作者已实际使用 `legion_bundle`，但原 `marked` 双插件包仍缺 `tools` 注入，未修复、未安装、未调用。当前等待的仍是原 `plugin_manager list_bundles` 审批，不是安装审批。具体阻断，以及安装、独立开关、执行、消息和消费各自的待验事项，见[当前实现与验收计划](docs/PLAN.md)。

## 数据与许可

恢复记录包含引用、key／摘要和最少回执；**v2 原生调用账本只存状态元数据，不存结果正文**。旧 v1 文件不会自动删除，两端会话和用户文件仍可能保留实际正文或图片，**不是匿名统计**。生成／下载文件各有保留范围；卸载既不取消远端工作，也不删除用户文件。

下载 hash 校验只证明传输完整，不证明文件安全或体验合格。脱敏不是万能秘密识别器；分享诊断、运行适配代码或导出物前，请读[安全说明](docs/SECURITY.md)。

MIT 仅覆盖连接器。拟公开范围仅为这个独立新写的插件、合法依赖声明和文档，不含公司／后端源码、凭据、私有证据或用户产物。每个来源项目、依赖、作者适配代码和可选 Legion 后端仍各自保留许可与授权要求。
