# 发布与验收状态

**更新日期：2026-10-29（Asia/Shanghai）。** 本页区分 **0.4.0** 原生工作台的已存验收、固定版本公开发布记录、0.2.0／0.3.0 历史证据和当前私有核心。目录收录、安装、真实调用和完整作品不是同一件事；更新说明的时间不算重新验收。

目标是：DSH 用户入口 → 可独立安装的军团核心 → 按需安装的成员、工具、媒体和设备。不是只提供一篇理念介绍，也不是把整个公司大仓上传。

## 0.4.0 原生工作台：已验范围与发布记录 / Native workbench status

**2026-10-29 的私有回执已记录原生工作台、配置保存／重载、成员选择、能力发现、原生开关及正式 TGZ 安装后的真实调用。** 不再把已修复的配置接线或已经实跑的 Marked 链路列为未验。最新任务状态定位增量、最终发布回归与固定公开版本安装由主线程另行验收，不在本页提前宣布通过。公开授权仅覆盖连接器；本次采用 **Git/tag `v0.4.0`，不是 npm publish**。

**October 29 receipts cover the native workbench, saved settings/member preferences, discovery, native switches and real tool calls from a formally exported TGZ.** The latest task-status positioning change, final release regression and installation from the public fixed version are tracked separately and are not declared passed here. Connector publication is authorized via **Git/tag `v0.4.0`, not npm publish**; local acceptance does not predeclare public-installation success.

| 范围 / Scope | 当前事实 / Current facts | 还不能声称 / Not yet established |
|---|---|---|
| 原生安装与五页 | 已在 DSH 安装启用并打开侧栏 **军团 / Legion**。五页为 **我的军团 / My Legion、找能力 / Discover、添加能力 / Add capabilities、接入任务 / Integration tasks、连接与配置 / Connection**；使用真实 DSH 工作会话。 | 以下只确认有回执的操作，不等于所有控件、所有视口或最后定位增量已验，也不代替公开 `v0.4.0` 安装。 |
| 无核心与搜索 | 原生回执记录工具／Skill 搜索、切来源清旧结果、市场未启用提示、启用但无索引提示，以及配置索引后的正向搜索。核心故意不可达时，截图仍显示本会话工具，能力包列表仍可读，配置随后恢复。公开 GitHub、读源及包装入口也不依赖核心。 | 无核心回执证明本地发现／列表，不冒充这时重新执行工具或完成了全部 GitHub 旅程；市场搜索未据此安装结果。发现不等于授权或运行。 |
| 明确安装与开关 | **安装 / 更新**仍调用官方 `pluginManager` 的 `enabled:false`：新包不自动选择启用，更新保留已有开关。已记录新装、整包／子插件开关与工具可见性；正式下载 TGZ 的安装和真实调用见下节。 | 若不希望更新后的代码运行，先在下方停用对应包。安装、选择启用、实际加载、构建批准和真实调用分别确认；恢复／取消请求仍复用原生接口，不是第二个安装器。 |
| 成员、配置与委托 | 原生浏览器记录修改 `tokenEnv` 后保存、重载、恢复原值，以及选择 Codex 后保存。`candidateHarnesses` 留空由军团选人；可编辑任务经 Host 提交给既有核心，固定来源仅作上下文。 | 勾选不安装或授权，保存不证明模型可用；不将一次配置读写扩大成全部轮换／冲突场景已验。适配方式由执行者决定，不保证任意代码自动转成工具。 |
| 原任务状态与下载 | 修复前大 runtime 吃尽共享投影预算，缺失字段曾被显示成假零。修复后真实原任务显示 **8 条历史成果记录**，保留 `artifact_archive_unsupported`；中文说明从工作台正式下载，字节／hash 与来源一致。运行、成果、拒绝原因、游标和截断事实分别展示。 | 8 条记录不是 8 件独立新作品；不完整不能称零。**下载文件**复用原 `/legion download`，保存到 DSH 主机，不是浏览器下载；不扩大根或授权。最新定位增量的浏览器验收单列。 |
| Host 与恢复边界 | `/legion-panel` 使用真实命令会话、`recordInput:false`、只读工具 metadata 和显式大小投影。凭据每次读取检测变化；已绑定身份改变后停止旧连接器并要求重载。 | 新身份不继承旧任务索引，也不删除旧记录；本地等待结束不取消远端任务。任务列表是本地索引，不是实时完成证明。 |
| 发布记录 | 已获公开连接器发布授权，安装入口固定为[Git `v0.4.0`](MARKET.md#v040)。主线程在本次文档收口前读回：`origin/main` 仍为 `b749f7c`，当时尚无 `v0.4.0`；社区 PR #740 已合并。 | 这是 **2026-10-29 发布前快照**，不预报推送或安装成功。固定版本公开安装回执随本次发布记录单列；不把目录合并、授权或本地安装当成最终公开安装。 |

上述浏览器事实来自私有 `browser-acceptance.json`、`no-core-native-acceptance.json`、`original-task-projection-and-text-download.json` 与 `workbench-session-isolation.json`。切到另一工作会话后，原任务及下载回执不显示；不将该次检查扩大成最新定位增量的迟到回包／焦点验收。本次只读回已有记录，不重复安装、操作浏览器或调用模型。

<a id="formal-marked-acceptance"></a>

### 正式出口 → 安装 → 原生开关 → 真实调用（2026-10-29）

- 原 TGZ 未导出的确切原因是 **`artifact_archive_unsupported`**，不是仅凭推断认定的收尾竞态或项目身份缺失。原失败记录保留；核心补齐原内容检查中的受限 TGZ 支持后，沿原 checkpoint 续作，续作任务正式导出并通过工作台原下载入口取回。没有扩大下载根、伪造授权或跳过扫描。
- 正式下载 `@local/dsh-marked-tools` **0.1.0** TGZ 为 **27,224 字节**，SHA-256 **`d1a788370043ed7912ab30ecc34fdb31621f530727114540fa32a1776c8d8966`**。来源与下载字节一致，安装后的 **18/18 文件**又与该归档逐一一致，不是拿另一份工作目录包补报。
- 两个原生子插件停用后搜索结果为 **0 个工具**，启用后为 **2 个**；更新已启用包可继续 active，`enabled:false` 不撤销旧选择，原生 `stage=enable` 不是凭空的旧 UI 状态。
- 原会话 **turn 2** 的 seq **222／224** 分别真实调用 `marked_render_markdown`、`marked_extract_tokens`，结果均 `isError=false`；HTML 与本次输入相符，`token_count=3`，summary 与标题和两项列表一致，seq **230** 为 `completed`。HTML 的 `sanitized=false` 如实保留，不能当作可信 HTML 注入保证。
- 提供方／模型选择 **`legion-qa / gpt-5.4`**只是回执层身份，不是远端权重认证。主线程已亲看相应截图；这里只引用该窄链路，不声称全家可用、任意项目自动适配或无人自治。

私有依据为 `formal-tgz-download-acceptance.json`、`final-formal-tgz-installed-bytes.json`、`final-formal-tgz-native-switches.json`、`final-formal-marked-agent-execution.json`。这些回执、会话、截图与生成包**不放入公开连接器**。

### 自动测试按执行时的 hash 记账

| 已存记录 | 实际范围 | 版本边界 |
|---|---|---|
| 工作台早期组合 | 此前主线程报告 **125 项通过**。 | 早期接线记录，不覆盖后续增量，也不和其他批次相加。 |
| `final-verification/plugin-all-tests.log` | **529 项通过**，失败／取消／跳过为 0；`results.json` 保存执行命令和源文件 hash。 | 当时 client hash 前缀为 `5a996a2b`、Host workbench 为 `c097622b`；是旧源码快照，不是最终公开字节或最新 UI 文案的全量验收。 |
| `final-verification/core-archive-export-http.log` | **230 项通过**：归档安全、项目成果导出及预期 hash 三个定向测试文件。 | 当时扫描器 hash 前缀 `a33d510c`、导出模块 `5c6e4c2a`；按该批字节归属，不补报为后来 `c8f10c6` 打包后的全量重跑。同期 quick selfcheck 的 tests 为 `skipped`，不另算通过数量。 |
| `install-semantics/green.json` | 新安装文案红测 **2 failed** 后，双语文案及既有安装参数定向 **3 passed**，保留 `enabled:false`，控制器逐字未变。 | 该次 client hash 为 `0cfdb252dc3d37c537ce9db3da5cb3a58326e927bef4bf896214190760d3c7c4`；只证明该增量，不含重复焦点测试或最终发布回归。 |

本页整理时没有重跑上述测试。主线程的最终回归、最新定位增量及公开安装结果须对应最终文件／提交另存，不能把旧测试数改名成最新全量。

<a id="current-private-core"></a>

## 当前私有核心包：c8f10c6（2026-10-29）

固定提交 **`c8f10c60a9836c03aa693b37d5c1e76c86d358ff`**，**602 个源码文件**，整包 SHA-256 **`b2cf08bdb903b8d3093570b07a50eee630ccfa0692c84bee511f70e5d57c16b4`**。`core-archive-release/build-physical-path.json`、`verify.json`、`extract.json` 与 `.sha256` 一致；原实例升级回执保留私有配置、工程、团队、任务记忆、成果、原生 checkpoint、会话、原工作文件与正式下载，包文件无 hash 差异。

这版的新增真实链路是上面的正式 TGZ 续作、导出、安装与调用，不把 `60872ced` 的互动网页、手机／桌面操作或旧重启结果当成在此包重新执行。当前仍为 **`private-local-only`**，包清单的 `public_license_granted=false`、`member_execution_verified=false` 不因单次成功而改写。文件数不是工具数，连接器公开授权不包含核心。

## 上次公开核验：0.2.0（2026-10-28）

- 公开仓库：[`seanliii/dsh-plugin-legion`](https://github.com/seanliii/dsh-plugin-legion)，默认分支 `main`，topic `dsh-plugin`。
- 2026-10-28 读回的公开提交为 `b749f7c0d324b0a4ef0d66611c1c57a8623b2774`；此前已从匿名公开 Git 读回并核对该提交的 43 个文件字节。
- 上次记录的社区目录投稿 [PR #740](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/pull/740) 已于 **2026-10-28 10:48:37 UTC** 合并。原先“仓库为空、未推送、未投稿”的记录已过时；本次文档子项未联网，主线程本轮发布前读回另列上表。
- 这是社区目录收录，不是 DeepSeek 官方背书、npm 发布或全部后端能力验收。

## 0.3.0 基础能力与独立核心的历史记录

以下保留各自固定版本的旧验收，不归到 0.4.0 新工作台。核心的许可和既有窄链路证据没有因新增侧栏而扩大。

| 范围 | 已实现／已核实 | 仍需区分 |
|---|---|---|
| 个人身份接线 | 插件新增 `tokenFile`；核心新增不打印令牌的 `dsh-config`。错误配置不会悄悄回退身份。 | 配置成功不证明模型实际调用成功。 |
| 真实成员与能力 | `legion_runtime` 读取原成员／能力／目录端点，保留预热、过期、错误与提供方未验证等事实。 | 不安装全家，也不把目录名称变成可运行工具。 |
| 核心程序 | 原研究、编排、协作、恢复、经验、工具与正式交付模块保留在独立程序中；修复独立布局下研究图谱的源码定位。 | 已保留源码不等于全部成员、工具、设备与动态协作已真跑。 |
| 媒体上下文 | 去掉“工具已配好 key”的无依据提示。实际发现个人配置缺少图片输入声明；同模型、提供方和凭据的图片请求成功后，经随包配置入口声明 `text`／`image`，原任务作者随后看图返工。 | 原生 trace 有同一调用的 `view_image` 和 `input_image` 返回；未认证每次远端出站图片，也不是全模型视觉质量证明。 |
| 连接器回归 | 已保存的最终组合记录为 **440 项通过**，失败／取消／跳过均为 0；独立审查未发现指定 0.3.0 差异的新阻断项。 | 协议与隔离 Runtime 回归不等于全部真实用户场景；发布前仍须核对最终提交和包内容。 |
| 核心相关回归 | 旧作品包相关组合 **322 项通过**；三处接线修复的相关组合 **414 项通过**；后续长期方向配置相关组合 **204 项通过、1 项跳过**，独立原失败及兼容复核 **19 项通过**。 | 各次范围不同，不相加成覆盖数；不是原大仓全部测试，也不是所有成员、平台、媒体和设备的实测。 |
| 私有核心发行 | 旧作品包 `5a26f9cf` 有 **596 个源码文件**；三处接线包 `ee247d7a` 有 **599 个**；该轮 `60872ced356b6a078aee656256e8ce9711a5ac1e` 有 **601 个**，完成固定字节打包、校验和全新目录解包。 | 当前 `c8f10c6` 包见上节，不借用这些旧验收。源码文件数不是工具数；核心公开许可与第三方分发范围尚未确认，不随连接器 MIT 发布。 |
| 长期方向与工作现场 | 保留工具授权现场及已选择的近期经验；独立实例可用 `configure-goals --file`／`--clear` 明确采用或撤回长期方向，不从旧仓自动带入。 | 方向默认不采用；原继续分支最多选择一条 500 字方向，不保证首轮、首脑直接继续或全部成员收到／采用。 |
| DSH → 核心 → 作品 | 新 DSH profile 原生安装连接器并委托 Codex 制作互动网页；旧包完成首次作品与恢复验收。该轮 `60872ced` 包在同一实例、身份、模型配置和原 checkpoint 上续作，完成看图返工、正式下载、手机／桌面检查和再次重启读回。 | 真跑的是一个个人实例、一个原生成员与一件作品；有监督者回交失败现场，不证明所有顶尖 Harness 已就绪、无人自治或动态协作普遍更强。 |
| 原生工具协作旧证据 | 原 DSH 会话已完成真实 `legion_call` 读文件，再独立 `legion_message`；同键恢复只返回元数据，未重做工具。 | ACK 不证明远端模型消费，不自动唤醒终态任务；这份旧证据不与新核心作品验收混算。 |
| `marked` 示例 | 保留此前固定源适配、隔离官方 Runtime 和包装读回证据。 | 本行仅属旧版本；2026-10-29 正式 TGZ 安装、开关与真实调用已在[本轮窄链路](#formal-marked-acceptance)另列，不再笼统写成 Marked 未验，也不由包装回执替代调用。 |

**上次公开读回对应 0.2.0；0.3.0 的旧本地证据与当前 0.4.0 目标版分开记录。** 本轮未据此推断线上最新状态；发布 0.4.0 后需重新匿名读回固定提交。DSH 运行契约仍固定 **`0.2.1-rc.2`**，不把研究过的新候选版本当成已完成兼容升级。

## 新接线修复包验证到哪里

核心提交：`ee247d7a686ae6770db6cfbfdd289ce70991c2cb`。包内 **599 个源码文件**逐个核对 hash；整包 SHA-256 为 `10508eb5c09f333c9c50dbd27343b229057fe40ca2ae3732e5b04728c6217896`。本轮用此包解压到全新目录重放，不再依赖旧开发树的路径。

| 原来的断点 | 新包实际验证 | 不能扩大成的结论 |
|---|---|---|
| 成员接入报告遇到本包未携带的历史模式检查 | 从新包实际导入 `harness_onboard.py`，使用现有 `openhands` 目录项。第七项保存 `SKIP / not_included`，整体 `PARTIAL`，主入口和测试进程均退出 2；前六项结果保留，目录文件 hash 未变。 | 安装、探测、派单池、工具题和测速五个外部边界用了模拟结果；只证明报告传递与保存，不证明 OpenHands 安装或实跑成功。 |
| 无 `.git` 的正规核心包无法沿原入口记录源码自审 | 真实 CLI `audit-source record → show` 两次退出 0；原账本读回同一条 `core-package:ee247d7a686ae6770db6cfbfdd289ce70991c2cb` 引用及源文件 hash。 | 记录状态仍为 `claimed`、`learning.recorded=false`；不是审核结论已证实，也没有写入共享成功经验、伪造 Git 或扩大可读根。 |
| 可选视频工具的安装目录与消费位置不一致 | 原 `harness_onboard --key openmontage --build-only` 在新的隔离根实际取得固定版本；`probe_build`、`source-check`、源码状态查询和媒体消费入口发现同一目录。安装的三个 Git 步骤均退出 0。 | `install_scope=source_only`、`runtime_acceptance=not_run`；未调用 `video_provider_status()`、未加载视频提供方、未配置账号、未生成视频。 |

OpenMontage 本次取得的版本为 `cd9f3c1f03368be87b140af494914b8ee4e3c7a4`；已读取该版本的 `LICENSE`，标明 **AGPL-3.0**，未改成连接器的 MIT，也未把其源码放进公开连接器。源码检查过程未导入上游模块。

对应私有回执为 `core-wiring-repair/new-package.json`、`core-wiring-repair/new-package-replay/a-result.json`、`b-result.json`、`c-result.json`，以及同目录的报告、命令输出和退出码。修复后的相关组合保存在 `core-wiring-repair/closeout-combination.log`（414 项通过、退出 0），独立复核见 `ab-independent-review.json` 与 `c-independent-rereview.json`。这些是限定范围证据，不随公开连接器分发；读取已存回执不算重跑测试。

**本节 `ee247d7a` 包没有重跑下节的完整作品旅程。** 后来的 `60872ced` 包有独立的续作与重启证据，见[历史 60872ced 续作与重启验收](#historical-60872ced)。版本分开记账；本节三项接线验证不证明全部成员就绪、视频生成或无人自治。

## 真实作品验收到哪里

验收作品是“军团能力地图”互动网页，用来检验接线、续作和交付，**不是 Lumi 游戏，也不代替军团整体质量验收**。本节保留首次验收：使用旧核心包 `5a26f9cf3dae083686fce8af7dae0ec8aedb898e`，整包 SHA-256 为 `145c87a5e10d592ad9daf59208b0b7d192cbce0964b99e913f42b3d41a800158`；本节结果不归到其他版本。

- 原任务作者在收到真实手机截图后，识别到原来首屏没有三层操作入口，并自行修改作品；主线程没有代写这个网页。
- 正式导出的 HTML 为 **30,676 字节**，SHA-256 为 `d4fdbe99e9f3ddebae755ddcd325539ba889b17f1f43187665f2595741a5a9e2`；配套 README 为 **3,441 字节**，SHA-256 为 `c4f4bd927044c444eecd370df5f88b89798d53a2cd383d051ed2db8f869ee766`。
- 四条导出记录实际对应两份相同 HTML 和两份相同 README，不是四件独立作品。预览使用正式下载字节，不是另取工作目录副本。
- 在 **390×844** 和 **1280×900** 浏览器视口实际操作：三层切换、示例展开／收起、键盘焦点与 Enter／Space 激活、刷新保留、清除后刷新、桌面布局和控制台检查；8 组检查通过，截图已逐张查看。
- `file://` 打开被浏览器工具的 URL 安全策略拒绝，未绕过，**文件协议仍未验收**；已完成的是本地 HTTP 浏览器旅程。

私有证据保存为 `core-final-package-verify.json`、`core-final-combination.log`、`final-connector-tests.tap`、`image-input-provider-probe.json`、`image-input-configuration-fix.json`、`native-vision-trace-projection.json`、`native-vision-bytes-verified.json` 和 `native-vision-browser-acceptance.json`，位于操作者的私有验收目录，不随公开连接器分发。读回这些旧记录不等于重新运行测试。

<a id="当前包续作与重启验收"></a>
<a id="historical-60872ced"></a>

## 历史 60872ced 包续作与重启验收

本节固定核心提交为 `60872ced356b6a078aee656256e8ce9711a5ac1e`，包 SHA-256 为 `dda2652fefe1d5f73a70a041dc95578e9b5ba443c10a68d947955310a0c2b2a5`。build、verify、extract 均退出 0，601 个源码文件 hash 相符。包内没有 `.git`，不依赖旧开发目录的快捷链接；仍为 `private-local-only`。以下作品和重启事实只属于这份历史包，**不冒充当前 `c8f10c6` 重跑**。

这次没有另建实例或重新开始任务：在原虚拟环境、实例、身份、个人 Responses 模型配置和 DSH 会话中，使用新包启动原服务，沿原 Codex checkpoint 继续同一件作品。真实请求记录的模型为 `gpt-5.4`；这是请求与原生 trace 中的名字，不是远端权重认证。

| 核验项 | 实际结果 | 保留的边界 |
|---|---|---|
| 续作及工作目录 | 作者曾误写安装包根；监督者回交正确工程位置、旧字节和截图后，作者在原 checkpoint 中把修订写回正确工程。收尾时包根没有误写的 `index.html`，包文件 hash 全部相符。 | 错写真实发生过，不能只保留最终 `done`；这次纠正依赖监督反馈，不是无人自治。 |
| 作者看到的图片 | 原生 `view_image` 与同一 call 的 `input_image` 返回能够对应，之后作者通过 `exec_command` 修改原作品。 | 只证明这次原生工具返回的图片及后续操作；没有完整逐请求出站证明，不声称所有模型或所有视觉判断可靠。 |
| 正式作品与下载 | 最新 HTML **25,198 字节**，SHA-256 `84ff3bc2d3b9a6d4ca01aeb4b36eca8685260d4eda37b751c5f64be750c92d6f`；README **6,617 字节**，SHA-256 `bc74c9aa216c8a7d9a8b137d6a82db65952aa9d90059cd1c254f2e2743d8af9d`。工作文件、正式导出及正式下载三处一致。 | 预览来自正式下载字节；两份文件不是两次独立能力验证。 |
| 最新作品体验 | 在 **390×844** 手机和 **1280×900** 桌面视口操作三层切换、详情展开、Enter／Space 和刷新保留；检查无横向溢出，逐张查看截图。手机首屏三个入口完整显示，桌面核心说明可读。 | 最新版未重新验证“清除记忆”；`file://` 仍被 URL 安全策略拒绝，未绕过。收尾只读回已有操作记录、截图和字节，不冒充又重跑整套。 |
| 重启恢复 | 原实例正常停启后，配置、工程身份、团队、任务记忆、会话、原生 checkpoint、工作文件、正式存储、正式下载 **9 组状态**保持一致；原 DSH `commands/execute` 再查状态、下载两份文件，均 HTTP 200、`ok=true`。 | 这次重启的是本验收核心，没有重新初始化；旧包的 Host 重启证据仍只属于旧包。不是所有成员或无人值守测试。 |

私有回执为 `core-wiring-repair/goals-release-20261029/new-package.json`、`native-cwd-repair-native-trace.json`、`native-cwd-repair-bytes-verified.json`、`goals-final-browser-acceptance.json`、`goals-final-restart-preservation.json` 和 `goals-final-post-restart-{status,download-html,download-readme}.json`。原失败与误写稿保留，不随连接器包公开。

在本节旧核心验收记录的时点，连接器程序未因那次说明更新而改变，复用当时已经保存的 440 项组合测试，没有重复调用模型；**这不是当前 0.4.0 工作台代码未变或已经验收的声明**。长期方向相关测试见 `core-wiring-repair/goals-final-20261029/green.json` 及相邻输出，独立复核见 `core-wiring-repair/goals-review/final-run.json`。这些测试与上述真实作品证据分别记账，不相加、不互相替代。

## 仍未完成／未证明

1. **最终发布字节对应的回执。** 固定公开版本的 push／tag、匿名提交读回及安装结果随本次发布记录单列；最新任务状态定位增量与最终回归由主线程单独验收，本页不预报通过。已经记录的配置、搜索、开关及 Marked 真调用不再作为笼统未完成项。发布不需要另找一次连接器授权，也不包含 npm publish。
2. 最终 Git tree、包内容、文档与实际发布提交一致性，按发布回执归档；历史测试和本次文档更新不是最终字节的自动验证。
3. 核心的公开发行。必须先确认第一方公开许可与第三方分发依据，不能用连接器发布授权代替权属证明。
4. 全部可选 Harness、媒体、设备及开源项目的实际接入。目录和保留源码不等于已安装、已授权、已运行。
5. 完全无人值守、所有场景自动返工与“超过顶尖单家”的普遍结论。历史截图反馈来自监督者；正常续作已验证，旧后台自动修复仍有独立身份要求，见[核心边界](CORE.md#军团的核心没有变成一句宣传语)。

安装、启用与构建脚本遵守原生权限。保留许可证、合法项目身份、导出授权、取消与恢复边界，不通过假成功或扩大下载根“接通”成果。

## 使用文档

[中文入门](../README.zh-CN.md) · [English](../README.md) · [核心能力与安装](CORE.md) · [理念与生态](ECOSYSTEM.md) · [协议](PROTOCOL.md) · [安全](SECURITY.md) · [发布路线](MARKET.md)
