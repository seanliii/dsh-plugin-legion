# Legion Bridge

[English](README.md) | 简体中文

`dsh-plugin-legion` 把**你已有权限使用的 Legion 服务**带进 DeepSeek Harness（DSH）会话。DSH 保留自己的对话、主循环和权限；插件负责委托任务、读取进度、找回原任务、下载正式导出，不另造执行器，也不评判作品质量。

**安装包不包含后端。** 使用前必须有运营者提供的服务地址和你本人的个人令牌。这是独立社区插件，不是 DeepSeek 官方产品，也不代表官方背书。

## 使用前准备

- Node.js **>=24.9.0**，官方 npm DSH **精确为 `0.2.1-rc.2`**。
- 已获授权且可用的 Legion 服务，以及运营者提供的个人令牌。安装插件不会提供或启动后端。
- 使用斜杠命令时，DSH Host 界面需提供 `commands` 服务。

启用前审查固定提交的代码：DSH bundle 在 **agent 沙箱之外，以 Host 权限运行**。见[安全说明](docs/SECURITY.md)。

## 安装：尚未公开发布

公开仓库、固定提交安装和市场投稿**尚未完成**。仓库公开并审查提交后，将占位符替换为完整 40 位 SHA：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#<PUBLIC_FULL_COMMIT_SHA>'
```

这是安装模板，不是已可用的公开发布地址。保留 `-w`；若使用其他 profile，请替换 `web`。提交必须包含包入口、预构建 JavaScript 和 bundle patch。

官方 CLI 手动 Git 安装、官方 Discover 自托管索引、1024Store 目录收录是三条不同路线。npm 对 Git 和目录投稿可选；未发 npm 时，1024Store 只能承诺 **browse-only（可浏览）**，不能承诺一键安装。详见[发布流程](docs/MARKET.md)。

## 私下配置

在 DSH Host 环境中设置以下变量。JSON Environment 编辑器中的值应是**带双引号的 JSON 字符串**：

| 变量 | JSON 值示例 |
|---|---|
| `LEGION_BASE_URL` | `"https://legion.example.invalid"` |
| `LEGION_PERSONAL_TOKEN` | `"<你的个人令牌>"` |

请私下填入运营者提供的真实值。令牌**只放环境变量**，不放聊天、命令参数、插件配置或 Git。普通进程环境变量使用普通字符串，不额外包一层 JSON。远端地址要求 HTTPS，只有回环地址允许 HTTP。

如果运营者支持 Codex，可选插件配置示例：

```json
{
  "stateDirectory": "/absolute/path/to/private/legion-state",
  "candidateHarnesses": ["codex"]
}
```

将示例路径换成私有目录，重开**同一个 DSH 会话**时保留该目录。`candidateHarnesses` 是用户配置，不是模型参数：非空列表按顺序传给服务，省略或 `[]` 不发候选计划。插件不设默认候选，也不自动兜底。

成功的实服运行使用了显式 Codex 候选；早先的自动规划失败仍保留在[进度记录](docs/PLAN.md)。状态目录默认值、`baseUrl`、`tokenEnv` 和可选项目绑定见[协议](docs/PROTOCOL.md)。

## 用法示例

```text
/legion help
/legion start page-1 制作一个含状态文字和按钮的 HTML 页面。
/legion status <task_ref>
/legion download <task_ref> <artifact_id>
```

使用返回的 `task_ref`，再从 `status` 里选可下载的 `artifact_id`。以上都是占位符，不是真实任务 ID。[命令与工具参考](docs/PROTOCOL.md)还列出了 `list`、`continue`、`message`、`resume`、`cancel`。

**一个 key 对应一单。** 发送前先保存引用。丢回执时，重开原 DSH 会话，用 `/legion list` 找回引用，再查 `/legion status <task_ref>`。**不要重投，也不要换 key 或候选来“重连”。** 这是本地防重复发送，不保证跨机器只执行一次。

`continue` 是明确新建后续工作；`resume` 只请求恢复中断任务；`message` 只投递邮箱。取消也只是请求，不证明进程已经停止。

## 已验证范围：2026-10-27

| 检查 | 实际结果 |
|---|---|
| 维护者本地全套 | **110/110 通过、0 失败**；`npm run check` **退出码 0**。 |
| 官方 rc.2 本地 Host | 安装、加载、停用/启用及原生命令 RPC 已做。 |
| 原生模型工具通路 | 普通聊天明确要求查询后，模型实际调用 `legion_list` 和 `legion_status`；调用与结果 ID 一一对应，两次 `isError: false`，对话正常完成。不据此宣称自主选题能力。 |
| 一轮真实 Codex 任务 | 达到 `done`；原生命令下载 `connection-check.html`，**2123 字节、SHA-256 一致**。另一条无有效 SHA-256 的导出被拒绝。 |
| 独立离线复核 | **13+7 用例通过**，本次范围无新阻断；不是生产环境普遍安全证明。 |

**仍未验收：**模型调用提交工具、真实任务恢复、HTML 按钮交互。浏览器 `file://` 访问被验证工具的安全策略拒绝，未绕过。rc.2 Web 另有仅命令结果会话的显示限制。持久日志中较长的 `legion_status` 正文被 Host 裁剪；已核成功回执，不把它写成完整正文无损往返。

真实反代和卸载验收仍待完成，路径前缀仅有合成测试。公开 Git 安装、索引、目录 PR、npm 发布均未发生。详细经过和剩余事项集中在[进度记录](docs/PLAN.md)。

## 数据与许可

恢复索引不另存原始任务或完整对话；这些内容自然存在于 DSH/Legion 会话，清理后的返回值也可能含任务内容。下载文件属于用户，**卸载不删除**；卸载也不会代办远端取消。

每次下载重新核服务权限。字节数和 SHA-256 一致只证明传输完整，不等于文件安全或体验合格。分享诊断、打开文件前请读[安全说明](docs/SECURITY.md)。

MIT 仅覆盖连接器。后端不随包提供，其许可、可用性与运营者授权另行确认。
