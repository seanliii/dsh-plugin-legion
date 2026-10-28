# 军团核心：不是只接一个壳

想象 DSH 是你的工作台，军团是能接任务的团队，各家 Harness 和工具是团队能使用的专长。连接器负责把它们接通，**不是把所有人的代码压成一个巨型插件，也不是登记一个名字就假装获得了能力。**

当前交付分三层：

| 层 | 放什么 | 不混淆什么 |
|---|---|---|
| 本公开插件 | 原生工具与配置、开源发现、读源、适配包装、任务接续、正式文件下载 | 不含后端、用户数据、模型权重或公司大仓历史。 |
| 独立军团核心 | 原服务、编排与协作、持久会话、研究与知识入口、正式成果出口及选定共享工具源码 | 独立安装的真实程序；当前只做个人私有预览，不借插件 MIT 公开核心。 |
| 按需成员和能力 | 原生 Harness、CLI、MCP、skill、媒体模型、浏览器与设备 | 各自安装、配置、授权和验证；目录有名字不表示已经可用。 |

当前实测与尚未完成部分统一见[状态表](PLAN.md)。本页介绍架构和安装接口，不把愿景当作运行证明。

## 军团的核心没有变成一句宣传语

以下是独立核心中的实际程序入口，不是本插件重新实现的一套指挥系统。模块路径相对于**核心包根目录**，不是本连接器仓库。

| 用户的理念 | 程序承载 | 在工作中意味着什么 |
|---|---|---|
| 先理解人想得到什么 | `release/legion-service/quality_context.py`、`legion_core.py` | 保留原始需求、意图与作品上下文，不把一句话缩成工具关键字。 |
| 看世界上的好东西，再决定怎么做 | `research_pipeline.py`、`quality_context.py` | 研究入口与来源事实可进入当单上下文；URL、正文与失败状态各有意义，不是搜索返回成功就算做过研究。 |
| 小而完整、真正有用的首个作品 | `quality_context.py`、`legion_core.py` | 保留完整纵切的上下文；范围、媒介和验收由当单需求决定，不硬编码游戏、PPT或网站答案。 |
| 最合适的成员协作，不是每题全家上 | `legion_core.py`、`collaboration_runtime.py` | 复用原有派单和协作。新个人实例默认先用已显式配置的 Codex；这不是所有成员自动获权。 |
| 接力不能失忆 | `team_state.py`、`task_memory.py`、原生成员 checkpoint | 原任务、工程和已知事实随合法续作保留；不复制旧 UUID 或权限冒充新身份。 |
| 出问题自己看到并返工 | 原执行器、协作事件与 `legion_core.py` | 工具结果、运行错误、当前产物和反馈回到工作现场。保留续作能力不保证每次模型都能自主修好。 |
| 大家互学，不靠投票拼答案 | `delivery_knowledge.py` | 历史案例先提供索引，按当单选择再展开；记录存在、成功召回和真的被模型采用仍是不同证据。 |
| 做出来还必须交得出来 | `project_context.py`、`artifact_delivery.py`、`artifact_store.py` | 合法工程身份、允许导出范围、实际文件与正式清单相接。运行 `done` 不能替代正式导出。 |
| 生态按需扩展 | `runtime_manifest.py`、`external_agent_registry.py`、`harness_onboard.py` | 原成员目录、安装和探测入口保留，实际安装与运行各自核对。 |
| 不止写文字，也能操作工具和设备 | `capstack_bridge.py`、共享工具总线、`cloud_desktop.py`、`agentbay_mobile.py` | 媒体和设备沿原能力入口接入；仍需要真实软件、模型、账号与明确授权。 |
| 能长期工作，也能准确停下 | 原会话持久化、取消及进程登记机制 | 工作与恢复状态保存在独立私有实例，不通过杀掉未知进程或丢失历史“重置问题”。 |
| 修传递，不另造质量裁判 | DSH 原生运行时 ↔ 本插件 ↔ 原军团服务 | 让执行者看到情况与反馈，而不是在上层加一个固定评分器替它答题。 |

表中除首行明确写出的前缀外，核心模块位于 `release/legion-service/`。共享工具的选定源码在 `runtime/core-sources/auto-tools`，`retained-tools.json` 记录文件版本、hash与调用范围。已验固定包保留 155 份共享工具源码，但只声明 `duckdb_query`、`ijson_stream`、`sympy_calc` 三个调用绑定，不能把源码文件数宣传成可用工具数。

`capstack_bridge.py` 是共享工具调用桥，不是经验学习引擎。随包模式只开放已声明、可调用且依赖就绪的工具；源码数量不是工具数量，保留实现也不自动启用旧 Auto 引擎。

**普通任务续作与旧验收中心后台自动修复不是同一条入口。** 个人 Responses 模式下，`verification_workflow.py` 的修复入口需要上游鉴权后传入 `user_id` 与 `conversation_id`。旧调用只传 `actor`、缺少身份字段时，会在派单前返回 `planner_identity_required`，不借服务所有者身份，也不回退默认 `cc`。`actor` 只是显示／审计信息，此处的非空检查不代替鉴权。这不表示普通任务都不能续作，也不证明个人模式无人自动修复已闭环。

**“世界最强团队”的定位是产品目标，不是已证明的排名。** 单成员成功不能证明动态协作胜出；代码保留不能证明无人自治。是否完成，要回到同一用户需求的真作品、操作、继续修改及文件读回。

## 为什么不是把全部仓库复制进去

核心应保留的是研究、执行、协作、记忆、恢复、工具和交付能力，而不是无差别打包所有历史。独立包保存真实程序字节，不靠一个指向旧开发目录的链接运行；第三方 Harness 的原生 CLI 与依赖仍沿各家入口安装。

以下内容不应随公开连接器搬走：

- 公司来源项目的完整 Git 历史、无关业务代码和内部资料。
- 用户会话、产物、工作区、令牌、设备凭据与运行数据库。
- 未取得分发依据的第三方源码或模型权重。
- 机器专用 `.venv`、`node_modules` 和指向旧开发树的快捷链接。

私有包的文件 hash 解决“这一包到底是什么”；不是安全认证或公开分发许可证。第一方公开许可与第三方通知确认后，才可另行提供公共核心发行物。**现在没有可冒充正式公共核心下载地址的链接。**

核心包清单明确记录以下分发事实：

```json
{
  "distribution": "private-local-only",
  "public_license_granted": false,
  "member_execution_verified": false
}
```

连接器的 MIT 不覆盖私有核心。这些字段记录**打包时事实**，不会因后续某个成员成功就把 `member_execution_verified` 改为 `true`，更不会因此新增公开许可。

后续已经独立完成一条窄链路验收：从固定提交 `5a26f9cf3dae083686fce8af7dae0ec8aedb898e` 打包并在新目录安装，经 DSH 原生入口委托 Codex 制作互动网页、正式下载核对 hash、原任务续作，并核验重启恢复。作者随后通过原生图片工具查看手机截图并返工；正式下载的修订版通过手机和桌面浏览器操作检查。具体字节和限制见[真实作品验收](PLAN.md#真实作品验收到哪里)。

这是单实例、单成员与一件作品的证据，不是全成员、无人自治或所有功能质量的认证。包校验、随包回归与真实作品验收仍各自记录，互不代替。

## 安装自己的实例

以下供已合法取得并审查过**私有核心包**的操作者使用。打包器及精确打包／校验／解包参数随核心的 `scripts/package_core.py --help` 和 `docs/core-private-package.md` 提供。使用包的已知 SHA-256 核对并解包到全新目录，再从该目录操作；不要把旧开发环境当成“全新安装”。

### 1. 独立环境与基础依赖

需要 Python 3.12；以下启动入口面向 macOS/Linux。依赖安装串行执行：

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r release/legion-service/requirements-core.txt
```

不使用 `--system-site-packages`，不复制旧虚拟环境。基础依赖不会安装所有 Harness、GPU模型或设备服务。需要 Auto/DeepAgents Python 依赖时，才另装 `release/legion-service/requirements-auto.txt`，并验证相应能力；不是默认全部启用。

### 2. 新建私有实例

选择源码目录之外、仅本人访问的目录，端口不能占用已有服务：

```sh
.venv/bin/python -I meyo.py init \
  --state-dir "/绝对路径/我的军团实例" --user my-user --port 8015
```

初始化只在本机建立身份，不创建云端账号；重复初始化不会重置历史。登录凭据在实例的 `login-token.txt`，不要发到聊天、版本库或公共文件服务器。

### 3. 配置本人模型

先确认自己的 `codex --version` 可以正常执行，再使用本人提供方实际支持的模型与 **Responses** API；不能把 Chat Completions 地址当成同一协议。

```sh
.venv/bin/python -I meyo.py configure-model \
  --state-dir "/绝对路径/我的军团实例" \
  --model "提供方实际支持的模型ID" \
  --base-url "https://本人提供方的API基础地址/v1" \
  --api-key-file "/绝对路径/本人所有的0600密钥文件"
```

这条个人配置只显式绑定 Codex，不授权所有成员，不借用其他登录或环境密钥。配置保存不等于真实请求验证；换提供方也不自动把旧会话发给它。

#### 图片输入需要真实的能力声明

需要成员看图时，先核实**同一提供方、同一模型和同一授权**确实接受图片请求，再在上面的 `configure-model` 命令中显式增加：

```sh
--input-modality text --input-modality image
```

这只是随包原生配置入口的选项，不是单独执行的命令。不要猜模型支持图片，也不要为了消除报错把不支持的能力标成支持。已运行的服务需重新加载该配置。

本次真实故障是图片声明缺失：提供方图片请求已成功，但原生执行环境尚未声明图片输入。补齐声明后，同会话作者的 `view_image` 调用返回了 `input_image`，作者据截图修正了作品。配置保存回执仍为 `provider_verified: false`，真实请求与工具 trace 另行保存，不把“写了配置”变成“调用已验证”。

### 4. 接到 DSH 并启动原服务

```sh
.venv/bin/python -I meyo.py check --state-dir "/绝对路径/我的军团实例"
.venv/bin/python -I meyo.py dsh-config --state-dir "/绝对路径/我的军团实例"
.venv/bin/python -I meyo.py serve --state-dir "/绝对路径/我的军团实例"
```

`dsh-config` 只输出 `baseUrl` 与 `tokenFile` 等非秘密接线信息。把其 `config` 对象填入本插件配置，不粘贴整份回执，也不把令牌内容填进去。`check` 不调用模型；`serve` 启动原 `server.py`，不是另造调度器或自动公网部署。

DSH 与核心不在同一机器时，核心文件路径不可直接使用；保留 HTTPS 服务地址及 Host 私下配置的 `tokenEnv` 方式，见[协议](PROTOCOL.md#7-configuration)。

#### 随包自检的范围

需要运行随包关键回归时，在核心包根目录复用现有入口：

```sh
.venv/bin/python release/legion-service/harness_selfcheck.py \
  --distribution private-core --run-tests
```

这是显式的独立包模式，不依赖解包目录有 `.git`，也不做真实成员体检。范围仅为 `release/legion-service/tests/` 下的 `test_core_distribution.py`、`test_personal_runtime_bootstrap.py`、`test_harness_selfcheck.py`；应随包测试缺失仍硬失败，不按现存文件缩小范围。

大仓历史测试缺失项列入 `historical_tests.not_included`，未验证项保留在 `historical_tests.not_verified`；真实成员的 `live_harnesses.status` 仍为 `not_verified`。不加 `--run-tests` 只列范围，不能算通过；退出码 0 也仅表示随包关键回归通过，不代表大仓全量、真实成员或用户作品已验收。这里的 `private-core` 是自检模式名，不改变包的 `private-local-only` 分发标记。

### 5. 真正走一遍，而不是只看绿色灯

从 DSH：

```text
/legion runtime members
/legion runtime capabilities
/legion start first-work 制作一个我能实际打开和使用的小作品，保留可继续修改的工程。
```

任务引用来自真实回执，接着查状态、下载正式成果，并用 `continue` 回到原会话修改。重新启动核心后，再查看同一任务与文件。分别记录：

1. 服务能启动、目录能读取。
2. 具体成员实际完成请求。
3. 真实文件出现在正式成果清单并成功下载。
4. 下载 hash 匹配且作品实际能打开、操作。
5. 同会话续作与服务重启后，原任务和文件仍可恢复。

其中任何一项都不能替代其他项；演示任务也不能证明所有顶尖 Harness、所有专业场景或整套自治能力已验收。`legion_runtime` 返回的过期、预热、错误与未安装事实应保留，不能包装成“全生态已就绪”。
