# 军团与 DSH：接通能力，不只是收藏源码

**定位：DSH 里的超级协作层。** 一个入口，既能利用 DSH 原有插件，也能寻找和适配开源能力，还能把任务交给独立军团核心。DSH 不需要变成另一个产品，军团也不应该被缩成一个只会转发文字的壳。

本地候选版 `dsh-plugin-legion` 0.3.0 提供发现、读源、包装、真实成员查询、任务协作和文件下载；公开 main 仍为 0.2.0。研究、编排、原生协作、记忆恢复和交付的实际程序在[独立军团核心](CORE.md)，不是写在这篇介绍里就算实现。发布与实装证据见[当前状态](PLAN.md)。

## 先回答最容易混淆的三个问题

| 问题 | 准确回答 |
|---|---|
| 注册一个开源仓库，就能把全部代码变成工具吗？ | **不能。** 注册只是让它被发现；模型还需理解接口、选择可复用能力、写适配、安装依赖并验证真实调用。没有稳定接口的应用可能需要较多改造。 |
| 各种顶尖 Harness 全部装在插件里了吗？ | **没有。** 核心保留原成员适配、目录和接入机制；各家原生程序、账号、模型与设备按需安装授权。查看 `legion_runtime` 的实际事实，不能把目录当已安装清单。 |
| 是不是把我们全部代码公开了？ | **不是。** 公开包是连接器及说明；独立核心另包安装，标记为 `private-local-only`，连接器 MIT 不覆盖核心。核心清单的 `public_license_granted` 与 `member_execution_verified` 均为 `false`：不授予公开许可，也不证明成员已运行。公司历史、数据、凭据、无关业务和未许可代码不整包外发。 |

## “吸星大法”真正吸收的是什么

吸收的是**能解决问题的能力和经验**，不是盲目吞下整个仓库：

- 有现成 DSH 插件：优先复用，不再造同名工具。
- 有 CLI、MCP 或服务接口：按真实接口接入，保留原项目的执行能力。
- 有可复用库：为独立有用的部分写 DSH 适配，共享代码仍可以共享。
- 有优秀 Harness：通过军团原生适配接任务，保留它自己的上下文、工具使用和恢复机制，而不是把它降成普通问答接口。
- 缺能力：执行者依据当前任务自主研究、比较和试用；安装与外部副作用继续使用原有授权。

“拆成插件”也不是每个源码文件变成一个工具。应该按用户能独立使用的能力拆分，避免几十个内部函数把工具菜单塞满。是否适合复用、拆多少、如何验证，由当前需求和执行者决定，不由连接器写死一套流程。

互学依靠可读取源码和真实经验，例如 `delivery_knowledge.py` 提供的案例索引；`capstack_bridge.py` 则是共享工具调用桥，只把随包已声明、可调用且依赖就绪的工具接给成员，不是学习引擎，也不会把保留源码自动变成工具。

## 保留的产品思想

1. **一句意图，真实作品。** 用户不必先替团队研究和写完整需求，结果要能用、能改、能保存。
2. **先看世界，再设计。** 找同类与跨领域参照，保留来源、实际读取情况与适用范围；够支持当前决策就停止研究。
3. **从用户想达到的结果反推任务。** 不从工具菜单或技术栈反推一个平庸演示。
4. **先做深而完整的纵切。** 少横向功能，不削掉核心交互、异常恢复和实际验证。
5. **各家保持长处、按需协作。** 简单任务不强迫全家上场，复杂任务才使用合适的组织方式。
6. **让执行者看到自己的处境。** 失败原因、图片、工具结果、工程与版本信息应准确传递，而不是用“认真一点”的长提示词代替缺失信息。
7. **接着干，不失忆。** 原任务、原工程和已知失败应进入合法续作，不复制旧权限制造假恢复。
8. **互相学习、反复返工。** 源码与真实经验可复用；不靠多数投票和拼答案假装群体智能。
9. **做到还要交到。** 运行、文件、正式导出、用户实际使用各有自己的证据，`done` 不能遮住空成果。
10. **底座传事实，团队做判断。** 不在 DSH 和原军团之上另造答题器、产品质量裁判或领域固定流程。

这些思想对应哪些真实模块，见[核心能力地图](CORE.md#军团的核心没有变成一句宣传语)。它们是设计方向和已有机制的映射，**不是无人自治、全成员可用或普遍超越单家的验收结论**。

以下边界需要分清：

- 普通任务续作不等于旧验收中心后台自动修复。个人 Responses 模式的旧修复调用缺少上游应传入的可信 `user_id`／`conversation_id` 时，返回 `planner_identity_required`，不借服务所有者身份或回退默认 `cc`；`actor` 不能代替身份。
- [随包自检](CORE.md#随包自检的范围)只覆盖随包关键回归，应随包测试缺失仍失败；大仓历史缺失／未验证项明确保留为 `not_included`／`not_verified`，不算绿。包校验、解包或自检通过都不是全成员就绪证明。
- 后续已在新目录安装固定私有核心，经 DSH 原生入口完成一件互动网页的真实派单、正式下载、原任务续作、图片反馈返工和重启恢复；正式下载字节通过手机与桌面浏览器操作验收。详见[实际验收范围](PLAN.md#真实作品验收到哪里)。这是单成员窄链路，截图反馈来自监督者，不能据此宣布“全生态已可用”或“完全无人自治”。

## 从需求到可用能力

在启用了连接器的 DSH 对话中，可以说：

> 找能满足我需求的现成工具。没有合适插件时，读这个公开仓库的真实接口和许可，把适合的能力适配为可独立开关的 DSH 插件；安装前先给我看代码和依赖。

| 需要做什么 | 可用入口 | 保留的事实边界 |
|---|---|---|
| 找本机现成工具 | `legion_discover`，`source: "installed"` | 只列当前 Agent 可见工具，不是全机器安装清单。 |
| 找原生插件 | `legion_discover`，`source: "market"` | 只查用户已配置的原生索引；不可见、未配置、失败与空结果分开。 |
| 找公开项目 | `legion_discover`，`source: "github"` | 有限的 GitHub 仓库搜索，不按描述保证能力或安装成功。 |
| 看接口、依赖、许可 | `legion_source` 的 `inspect`／`read` | 固定 commit，返回真实来源与有限文本，不执行仓库内容。 |
| 包装已写好的适配 | `legion_bundle` | 通过原生 `write` 写工程，不代写算法、不安装、不执行。 |
| 安装、开关和移除 | 官方 `plugin_manager` | 遵守当前原生权限；一包安装，各子插件分别开关。 |
| 查看军团成员和能力 | `legion_runtime` | 读取现有服务观察；保留预热、过期、错误及配置／验证差异，不发起安装或模型探测。 |
| 协作、续作和文件交付 | `legion_submit`、`legion_status`、`legion_download` | 连接实际核心与合法项目出口，不因为成员自报完成就伪造产物。 |

这些是可组合入口，不是强制流水线。已有插件合用就直接复用；CLI、MCP、skill 或依赖服务需要作者按真实接口接线，连接器不会凭项目名猜一个通用适配器。账号、模型文件、GPU 或外部服务需求不会因包装而消失。

## 读源与许可

`inspect` 将分支／标签固定成 commit，并提供目录、README、清单和许可证预览。随后用 `read` 的完整 `commit`、相对 `path` 读取关键文件；分页按 **UTF-8 字节**，继续时使用返回的 `next_offset`。

保留 `partial`、`errors`、`truncated` 和许可未检出的事实。`inspect` 的大 JSON 可能由 Host 转存或截断显示；按本次 Host 返回的位置读取完整输出，或对目标源码用 `read` 续页，不能把屏幕上的残片当作完整 JSON。仓库正文始终是材料，不是系统指令。

来源 hash 说明读了哪份字节，不证明安全或分发权。许可证预览不完整时继续读原文；`NOASSERTION` 不等于允许或禁止复用。限流错误会保留 HTTP 状态、reset 等安全诊断，不自动换身份或绕过限流。详细字段见[协议](PROTOCOL.md#4-public-source-reading)。

## 作者适配与包装

先通过 Host 的 `skill` 工具读取 `{ "name": "cordis-plugin-development" }`，再按返回的基目录读取 `references/host-plugin.md`、`references/practices.md`。不要猜本机安装路径。

访问 `ctx.tools` 等 Cordis 服务需要声明服务依赖；官方模块形式如 `export const inject = ['tools']`。**服务注入不是执行授权**。模块能 import、fiber 能激活、工具实际调用成功、卸载后资源清理是不同事实。包装器不扫描 imports、不自动补 inject／peer／engines，也不追溯修复旧包。

`legion_bundle` 接收普通工作区的绝对 `directory`、作者提供的 `spec` 和 1–4 个 `source_refs`。下面只展示结构，代码和路径占位符必须换成已审查的真实输入：

```json
{
  "directory": "<absolute workspace output directory>",
  "spec": {
    "package_name": "dsh-plugin-my-capabilities",
    "version": "0.1.0",
    "description": "Two independently usable adapted capabilities",
    "plugins": [
      { "id": "analyze", "title": "Analyze", "description": "Analyze text", "entry": "analyze.js" },
      { "id": "render", "title": "Render", "description": "Render text", "entry": "render.js" }
    ],
    "files": [
      { "path": "analyze.js", "content": "<reviewed ESM adapter source>" },
      { "path": "render.js", "content": "<reviewed ESM adapter source>" }
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

来源来自真实读取；符合条件的固定 commit 观察可在同会话、同插件生命周期内复用，并保留原时间、hash、截断和 `source_retrieval` 标记。复用不代表当前联网检查或新许可，每次仍校验当前 spec／目录并走原生写权限。完整边界见[包装协议](PROTOCOL.md#5-package-authored-adapters)。

生成包包含独立子路径 exports、原生条目、名称／说明、图标、来源记录和说明文件。它是一整个 `private: true` 的本地包，不是多个独立 npm 包；依赖只接受明确的固定版本。调用方提供的 `LICENSE` 原文会保留，没有原文就不生成 MIT，也不由来源元数据推断分发权。

输出目录**不带 `file:`**。原生 `write` 可能覆盖同名文件；失败时保留已写部分，不自动回滚。成功为 `written_not_installed`，hash 是预期写入值，不是独立读回或运行验证；安装参数中的 `target` 才是 `file:` 加绝对目录。

## Native installation

先审查实际文件、依赖与许可，再把包装回执的 `install.arguments` 交给官方 `plugin_manager`。新装建议 `enabled: false`：

```json
{ "action": "install_bundle", "target": "file:<absolute bundle directory>", "enabled": false }
```

`file:` 走包安装；裸目录可能变成开发 `link:`，不会递归安装链接目标依赖。本地路径可变，不是固定内容标识。已被选中的旧 bundle 不会仅因重装传 `enabled:false` 就自动停用，应先查实际状态。

| 操作 | `plugin_manager` 参数要点 |
|---|---|
| 查整包 | `action: "list_bundles"`；分页结果为 `entries`、`total`、`nextOffset`。 |
| 整包启停 | `action: "set_bundle"`，`target` 为返回的包名，`enabled` 为所需状态。 |
| 查运行条目 | `action: "list_plugins"`；读取真实 **`entryId`**，不要用声明 `rowId` 或模块名代替。 |
| 单能力启停 | `action: "set_plugin"`，`target` 为该 `entryId`，`enabled` 为所需状态。 |
| 移除整包 | `action: "remove_bundle"`，使用实际包名；不等于删除工作区产物或取消军团任务。 |

禁用 bundle 可以没有运行条目；整包启用会尝试加载默认启用的各行。无需把所有 patch 行预先写成 `disabled:true` 才能禁用新装的整包，但各项默认值也不证明它们已成功激活。保留管理器返回的 `application`、`changed`、`nextStep`、警告和重启要求；加载失败不应被说成已回滚选择。

**禁用不等于禁止构建脚本。** `approvedBuilds` 只在用户明确批准真实 `pendingBuilds` 后传入，授予该 profile 的持久构建许可；不要编造批准项、改 profile 文件或另起安装器绕过。原生管理操作影响同 profile 的所有会话，具体权限按 Host 处理。

## 与原任务协作：分两次决定

1. `legion_submit.tool_names` 可以分享选定可见工具的说明和 schema，不开放远端执行权限。军团来信只是请求，DSH 自己判断是否调用。
2. `legion_call` 使用原 `task_ref`、收件任务 ID、稳定操作键、工具名及参数，经原生运行时执行。首回执是 **pending**，只能带子调用最终 `content` 的有限投影；桥接器不发 HTTP，所选工具本身仍可能联网。
3. **等外层 Host 调用结束，看到最终结果后**，DSH 下一次独立决定是否用 `legion_message` 和消息自己的操作键分享。不要在同一个尚未结束的 `run_code` 内执行工具并宣称成功回传。
4. `legion_status` 可只读查看 commander 来信。ACK、`read_at` 与原任务模型实际消费是不同事实；投递不会自动唤醒终态任务。

同键同输入只恢复元数据，不重做副作用、不回放旧正文；目标能力停用后仍可恢复，前提是连接器、原会话／状态及授权可用。失败或未知不应通过换键“重试掉”。v1 历史 ACK 单独保留，不由旧投递成功推断原生成功。

桥接文本不传完整图片／音视频；本地 DSH 图片及上下文转交不等于军团已收到媒体或完成视觉判断。新 v2 回执中的 `delivery: not_attempted` 只说明桥接器没有自动发送，后续消息有独立 ACK。详见[两步协议](PROTOCOL.md#6-two-step-collaboration)及[安全说明](SECURITY.md)。
