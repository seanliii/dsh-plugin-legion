# 独立军团核心与 DSH 接线实施计划

> **For agentic workers:** 使用 executing-plans 在本会话逐项执行；每项先写失败测试，再实现、验收和提交。

**Goal:** DSH 不再只有连接器：让用户能安装独立军团核心，查看真实成员与能力，经原生工具完成任务、成果下载和继续。

**Architecture:** DSH 继续负责用户入口及本地工具权限；复用独立核心现有 meyo.py、personal_runtime、server、legion_core 和正式成果出口。成员沿现有 harness_onboard 按需接入，不另造调度器、质量裁判或通用“源码自动转工具”算法。

**Tech Stack:** Node >=24.9.0；DSH 与原生 Runtime 固定 0.2.1-rc.2；Python 3.12；现有个人核心源码布局。

**Spec:** 当前用户目标与本仓 docs/ECOSYSTEM.md；独立核心 README.md、LOCAL-CANDIDATE.md。

## 全局约束

- 公开连接器仓库与私有核心源码分开，不将公司大仓整包上传。
- 核心公开许可未确定；本轮可制作私有本地可携带包，但不能借连接器 MIT 给它改换许可证。
- 不复制实例数据、密钥、历史会话、模型权重或原公司 Git 历史。
- 保留个人身份、项目绑定、取消、去重与导出授权。已注册、可安装、已配置、实际运行分别陈述。
- 本轮不恢复暂停的 Lumi 游戏，不修改原大仓的历史工作区。

## 1. 接通现有个人凭据文件

**文件：** index.js、lib/client.js、新增 lib/credentials.js、test/credentials.test.js、test/plugin.test.js。

**接口：** 用户配置 `tokenFile` 为绝对路径；配置它时仅使用该文件，不回退 `tokenEnv`。`LegionClient.token()` 保持同步接口；当前及此前实际使用的令牌只在内存用于脱敏。

- [x] 测试实际 HTTP Authorization、原地轮换、旧值与新值脱敏、文件缺失不占用派单键。
- [x] 测试拒绝符号链接、非普通文件、非本人文件、非私有权限、过长及多行内容。
- [x] 实现仅本人可读的有界普通文件读取；不让模型参数指定凭据路径。
- [x] 跑连接器和官方 Cordis 组合测试；阶段提交统一记在第 4 项。

## 2. 非秘密配置输出与真实运行事实

**文件：** 核心 release/legion-service/personal_runtime.py 及其 bootstrap 测试；插件 lib/client.js、index.js、lib/commands.js 及对应测试。

**接口：** `meyo.py dsh-config --state-dir <实例>` 返回 `{plugin, config:{baseUrl,tokenFile}, verification}`，复用实例身份校验，不输出密钥、不访问网络、不修改 Host profile。`legion_runtime({view})` 只读取原有 members / capabilities / catalog 端点，不强制探活。

- [x] 先验证现有命令拒绝 dsh-config、新工具未注册的失败现场。
- [x] 测试配置幂等、不泄密、不替代模型可用性验证，损坏实例不回退。
- [x] 保留 API 的 warming / stale / error / provider_verified 等事实及来源；查询失败不伪造空清单。
- [x] 在新的隔离实例启动现有 server，经 DSH 原生工具读取。

## 3. 私有可携带核心与按需能力

**文件：** 独立核心现有发行入口与新增打包/校验脚本、测试及安装文档。

- [x] 复用固定 Git 提交和现有 retained-tools 导出清单；打包真正的核心代码，不只记录旧开发目录链接。
- [x] 用 Git 归档固定字节，附逐文件 hash、版本与私有分发范围，拒绝脏树、符号链接、未声明的第三方子模块及运行数据。
- [x] 解包到新目录，重新建立实例并验证源码与原目录没有运行依赖。
- [x] 保留原有 harness_onboard、runtime manifest、研究/上下文/协作/恢复/经验/正式成果模块；成员 CLI、媒体模型、设备和账号按需配置。
- [x] 用真实任务完成正式导出和同会话继续，下载字节核对 hash；模拟协议与真实模型证据分开。

## 4. 用户思想与最终交付

**文件：** README.md、README.zh-CN.md、docs/ECOSYSTEM.md、docs/PLAN.md、新增 docs/CORE.md。

- [x] 列明超级协作层、世界对标、意图理解、动态研究、原生协作、互学、失败回流、连续返工、真实交付分别对应的已有核心。
- [x] 明确任意仓库要经过理解接口、实际适配、安装与验证；注册不会自动变工具。
- [x] 修正已经推送/已合并投稿却仍显示未发布的过时状态，注明原始证据日期。
- [x] 实际打开原生界面、操作、保存并逐张查看截图；独立审查与最终回归。
- [x] 阶段提交；公开源码权属未确认前不发布核心，未验部分不标完成。

## 本地验证记录与剩余边界

记录日期为 2026-10-28（UTC）。勾选表示上面这一项的限定工作已完成，不代表整个生态全部就绪。

- 最初失败现场：`dsh-config-red.log`、`new-interface-red.log`；修复后的核心相关组合为 `core-final-combination.log`，322 项通过。
- 最新连接器串行回归：Node 24.20.0，`closeout-connector-tests.tap`，440 项通过，失败、取消、跳过均为 0；`closeout-connector-syntax.log` 记录语法检查。测试 HOME、实例目录与缓存均隔离。
- 实际安装的连接器来自 `connector-notice-download` 包，28 个文件，包含浏览器入口 `client/index.js`；不是之前缺少该入口的 27 文件候选包。该包与 DSH 已安装目录逐文件一致，之后的候选变化仅为说明文档。
- 实跑私有核心固定为 `5a26f9cf3dae083686fce8af7dae0ec8aedb898e`；后续说明提交不替换已验的程序包。
- 真实作品为“军团能力地图”，经原生派单、续作、图片反馈返工和正式下载；重启恢复、下载字节与手机／桌面操作分别留证。详见 [发布与验收状态](../../PLAN.md)。
- 指定连接器差异已完成独立审查，回执为 `connector-independent-final-review.json`。上述证据保存在操作者的私有验收目录，不随 npm 包公开。
- 阶段提交已落在各自功能分支：连接器 `852b957a3c932121ef9e8c43c4aa738835f71109`；核心验收说明 `11995663c7a8f07d749a4ba5d5196fecd4596c27`。没有推送或发布；已验核心程序包仍固定为上面的 `5a26f9cf`，本计划的提交记录不改变安装包字节。

仍需单独处理：连接器 0.3.0 的公开推送与读回、核心公开许可及第三方分发依据。全部可选成员、无人自治及普遍胜过单家的能力仍未证明；本计划完成不能替它们勾选。`file://` 被工具安全策略拒绝，未绕过，也未列为通过。
