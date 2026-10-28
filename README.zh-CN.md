# Legion Bridge

[English](README.md) | 简体中文

把开源能力带进 **DeepSeek Harness（DSH）**，需要时再与你自己的 Legion 服务协作。`dsh-plugin-legion` **0.2.0** 帮助 DSH 找工具、按固定提交读公开源码，并把作者已适配的代码包装成一包内可独立启停的多个插件。

**搜索、读源和包装不需要 Legion token。** 协作才需要有权使用的兼容服务和本人的个人令牌，安装包不含后端。DSH 保留对话、工具选择和权限；这是独立社区插件，不是 DeepSeek 官方产品。

**[当前发布与原生安装状态](docs/PLAN.md)** · [生态用法](docs/ECOSYSTEM.md) · [精确协议](docs/PROTOCOL.md) · [安全说明](docs/SECURITY.md)

## 可以做什么

| 需求 | 入口 | 实际边界 |
|---|---|---|
| 找已有能力 | `legion_discover` | 当前 Agent 可见工具、用户已配置原生市场、公开 GitHub；不是全机器清单。 |
| 读真实接口和许可证 | `legion_source` | 固定源码、文件 hash、有限预览；保留读取不完整的事实。 |
| 包装作者已适配的代码 | `legion_bundle` | 写入工作区文件及元数据，不安装、不执行。 |
| 安装或开关能力 | 官方 `plugin_manager` | 原生安装、审批、整包选择及各插件独立开关。 |
| 用本机工具帮助军团任务 | 先 `legion_call`，再单独 `legion_message` | 执行与投递分两次决定；邮箱回执不是模型消费。 |
| 跟进远端任务 | `legion_status` | 任务状态、事件、commander 来信和正式导出；不自动执行消息。 |

启用连接器后，可以在普通 DSH 对话里说：

```text
帮我找能完成这件事的现成插件。先给来源和限制，不要安装。
```

也可以让 DSH 研究一个公开仓库、按真实接口编写适配，再按可独立使用的能力拆包。**这不是任意应用的一键转换器。** 按需加载的 `legion-ecosystem` 技能提供工具入口与原生开发参考。

## 安装已审查的本地副本

需要 **Node.js >=24.9.0** 和官方 npm DSH **`0.2.1-rc.2`**。按用途开放相应原生工具：生成文件用 `write`，安装用 `plugin_manager`，查询已配置索引用可选的 `plugin_market`。斜杠命令另需 Host 的 `commands` 服务。

已有审查过的本地副本时，通过官方 `plugin_manager` 安装。把下方占位符换成 **bundle 的绝对目录**，路径里的空格原样保留：

```json
{
  "action": "install_bundle",
  "target": "file:<absolute bundle directory>",
  "enabled": false
}
```

这是参数模板，不是已发布包的地址。公开固定 Git 安装与社区投稿见[发布路线](docs/MARKET.md)。

- 建议用 `file:` 按包安装并处理声明依赖。裸目录可能成为开发 `link:`，不会递归安装链接目标的依赖；本地目录可变，不是内容 hash。
- 新装时先保持禁用。**禁用不等于禁止依赖构建脚本**：检查原生警告与 `pendingBuilds`，构建许可独立处理。
- 核对安装结果后，用 `set_bundle` 管理总开关。先从 **`list_plugins` 读取真实 `entryId`**，再用 `set_plugin` 独立启停；声明 `rowId`／模块名不是运行 ID。禁用的 bundle 可以没有运行条目。
- 选择 bundle 可能加载其中所有默认启用条目。安装、选择、激活和真实调用是不同事实；保留 `application`、`changed`、警告及重启要求，不推断加载失败已回滚选择。

Host 插件在 **agent 沙箱之外运行**，启用前须信任实际代码与依赖。详见[安全说明](docs/SECURITY.md)。

## 可选：与你自己的 Legion 服务协作

在 DSH Host 环境中私下配置。JSON Environment 编辑器需要**带双引号的 JSON 字符串**；普通进程环境变量使用普通字符串。

| 变量 | JSON 值示例 |
|---|---|
| `LEGION_BASE_URL` | `"https://legion.example.invalid"` |
| `LEGION_PERSONAL_TOKEN` | `"<你的个人令牌>"` |

令牌不要放进聊天、命令、插件配置或 Git。远端地址要求 HTTPS，只有回环地址允许 HTTP。安装连接器不会启动服务；可选成员、项目绑定与私有状态设置见[协议](docs/PROTOCOL.md#7-configuration)。

```text
/legion help
/legion start page-1 制作一个含状态文字和按钮的 HTML 页面。
/legion status <task_ref>
/legion download <task_ref> <artifact_id>
```

使用工具实际返回的引用和产物 ID，不要照抄占位符。另有 `list`、`continue`、`message`、`resume`、`cancel`。`legion_submit.tool_names` 可分享选定工具的可见 schema，不授予远端执行权限。

### 分两步分享本机结果

1. 用 `legion_call` 传原任务引用、收件人、稳定操作键及选定原生工具。首回执是 **pending**，不是外层调用成功。桥接器不发 HTTP 或消息，被选中的工具仍可能有自己的联网行为。
2. **等外层 Host 调用结束**，DSH 再决定是否用 `legion_message` 和消息自己的稳定操作键，分享最终实际可见且允许发送的内容。不要把执行和成功消息塞进同一个 `run_code` 或尚未结束的父调用。

官方结果观察器只记录祖先链的**状态元数据**。同键同输入恢复不重做工具、不回放旧正文；目标能力停用后也可恢复，前提是连接器、原会话和状态仍在。未知结果不是换键重做副作用的许可。

消息回执与执行分开，**不证明原任务模型已消费，也不自动唤醒已结束任务**。桥接文本投影省略媒体二进制；本地 DSH 图片转交不代表远端收到整图。详见[两步协议](docs/PROTOCOL.md#6-two-step-collaboration)。

## 限制、数据与许可

仓库正文、市场描述和任务消息是不可信材料，不是指令或授权。源码 hash 标识内容；包装不证明可运行，下载完整性也不证明文件安全。脱敏有范围，不是万能秘密检测器。

恢复状态应保持私有。新 v2 原生调用记录只存元数据，但旧记录及两端会话仍可能留有正文；卸载不会删除用户文件或取消远端工作。

[MIT](LICENSE) 只覆盖连接器。依赖、来源项目、生成适配包和可选后端各自保留许可要求。生成示例和私有验证产物不随连接器分发。
