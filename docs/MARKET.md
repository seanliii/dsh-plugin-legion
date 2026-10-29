# Installation and publication / 安装与发布路线

当前是否已发布、实装或收录，只以[状态表](PLAN.md)为准。以下是操作路线和模板，不是完成声明。

**本次连接器发行版本为 0.4.0，走 Git/tag，不做 npm publish。** 2026-10-29 的私有回执已记录原生工作台配置与成员选择、发现能力、原生开关，以及正式导出 TGZ 安装后的真实工具调用；不再把这些已验项写成“UI／Marked 未验”。公开连接器发布已获授权；最终标签读回、固定版本公开安装、最新任务状态定位增量与最终回归分别记录，不由上述本地结果代替。私有核心仍为 `private-local-only`，不在公开范围内。

**0.4.0 uses Git/tag distribution, not npm publish.** October 29 private receipts cover workbench settings and member selection, discovery, native switches, and real tool calls after installing a formally exported TGZ. Connector publication is authorized. Final tag readback, installation from the public fixed version, the latest task-status positioning change and final regression are tracked separately and are not declared passed here; local acceptance does not establish those results. The private core remains `private-local-only` and is excluded.

**发布前读回快照（2026-10-29，主线程核对）：** `origin/main` 仍为 `b749f7c0d324b0a4ef0d66611c1c57a8623b2774`，当时尚无 `v0.4.0` 标签；社区 PR #740 已合并。这个发布前快照不预报推送成功，也不覆盖随后发布结果。**固定版本公开安装回执随本次发布记录单列。**

## 分清三种分发方式

| 路线 | 提供什么 | npm 是否必需 |
|---|---|---|
| 官方 CLI 固定 Git 标签／提交 | 使用 `v0.4.0` 或已审查的完整提交手动安装，不是市场收录。 | 不要求将此包发布到 npm；依赖获取仍可能联网。 |
| 官方 Discover 自托管索引 | 用户添加可信索引，安装其中声明的 Git 来源。 | Git 来源不要求此包先发 npm。 |
| 社区目录／1024Store | 提交一份目录 JSON；无 npm 可 **browse-only（仅浏览仓库）** 收录。 | 不是投稿前提；一键安装以商店实际提供的方式为准。 |

社区目录、姐妹站安装界面与官方管理器是不同系统。已保存的姐妹站源码中，常规安装按钮主要提供 npm 路线；底层官方 CLI／命令转发不能概括成“npm-only”。GitHub 元数据也不证明有 Git 一键按钮。不要把来源说明、按钮存在、实际安装或官方背书混为一谈。

## 固定 Git 安装

<a id="planned-v040"></a>
<a id="v040"></a>

### 固定版本 v0.4.0 / Fixed version v0.4.0

**安装前核对公开标签及发布记录中的已审查提交。** 标签可用性和公开安装结果以本次发布回执为准，下面的命令本身不是成功证明。`web` 是示例 profile，换成你自己的名称；保留 `-w`：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#v0.4.0'
```

这是公开 Git 标签安装，不是 `npm install dsh-plugin-legion@0.4.0`，也不是已经有“一键市场安装”的证明。Git 标签可以移动；严格复现优先下方完整 commit SHA。依赖下载仍可能联网。

**Check the public tag against the reviewed commit in the release record before installing.** Availability and public-installation results belong to that record; the command is not a success receipt. Replace the example `web` profile as needed, but retain `-w`. This installs from Git, not an npm release or a proven marketplace button. Tags can move; use a reviewed full commit for reproducibility. Dependencies may still require network access.

### 已核完整提交 / Reviewed full commit

**先有真实公开仓库和经过审查的提交，再使用此模板。** 将占位符换为实际公开的完整 40 位 SHA，并选择自己的 profile：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#<PUBLIC_FULL_COMMIT_SHA>'
```

保留 `-w`。提交中必须已有可运行 JavaScript、`package.json` 和 `dsh.bundle.patch` 指向的 patch 文件；不能依赖缺失的构建产物。模板中的目标地址不是“仓库已发布”的证明。

已有本地副本或 `legion_bundle` 生成包时，使用[原生本地安装](ECOSYSTEM.md#native-installation)：`target` 为 `file:` 加绝对目录或受支持的本地安装包路径，请求 `enabled:false`。这表示新包不自动选择启用，**更新保留已有开关，不会强制停用**；不希望更新后运行时，先停用对应能力包再更新。本地安装与公开发布是不同操作。

## 安装后的入口 / After installation

1. 在 **DSH 原生插件页 / DSH Plugins** 核对 Legion 整包和实际运行条目的启用／加载状态；安装回执不代表插件已经激活，`restart-required` 应按原生提示处理。
2. 启用后，从侧栏 **军团 / Legion** 打开原生五页工作台，选 **当前工作会话 / Working session**。没会话就先新建对话，再刷新会话；不需要另开网页服务或输入内部命令。
3. 没有核心也可以在 **找能力 / Discover** 查当前 DSH 工具／Skill、公开 GitHub、已配置市场。要真实委托，再到 **连接与配置 / Connection** 填本人合法使用的核心地址与凭据引用，保存后刷新成员。
4. 安装其他现成包使用 **添加能力 / Add capabilities → 检查来源 / Inspect source → 安装 / 更新（Install / update）**，仍由官方 `pluginManager` 处理 `enabled:false`。新包不会自动选择启用；更新保留已有开关，已启用包可能继续运行。**若不希望更新后的代码运行，先在下方停用对应能力包，再安装更新。** 整包与子插件开关分别确认。检查通过不等于可信，禁用不禁止依赖构建，`pendingBuilds` 在原生插件页批准。工作台不能从自身页面停用 Legion 连接器。
5. **检查并交给军团 / Inspect & delegate** 只准备可编辑任务；明确点 **交给军团接入 / Delegate integration** 才提交到配置的核心／模型，可能产生费用。任务回执不代表适配完成；查看实际加载与调用结果。

Check actual bundle/plugin loading state in **DSH Plugins**, then open **Legion** in the sidebar and choose a **Working session**. Core-free discovery remains available. Connect a separately authorized core only for delegation; enter a token variable name or Host file path, never a token value. **Install / update** keeps the official manager's `enabled:false`: new bundles are not automatically selected, while updates preserve existing switches. Disable a bundle before updating if you do not want the updated code to run. Source-project inspection only prepares a task; **Delegate integration** is the explicit submission step and may incur model costs, not proof of a working adapter.

原生配置和插件开关影响同 profile，不是会话私有；安装、启用、真实执行分别确认。详见[工作台操作与限制](ECOSYSTEM.md#native-workbench)，凭据轮换与重载见[中文连接说明](../README.zh-CN.md#连接你独立安装的军团核心)／[English connection guide](../README.md#connect-your-independently-installed-legion-core)。

## 官方 Discover 索引

启用可选官方市场后，用户自行添加可信索引 URL；连接器没有默认中央目录，也不自动添加索引。官方索引与社区目录 JSON 格式不能混用。

| 层级 | 字段 |
|---|---|
| 根 | `format: 1`、`title`、`plugins` |
| 插件 | `name`、`versions` |
| 版本 | 实际包版本、`publishTimestamp`（Unix 秒数）、`source` |
| Git 来源 | `type: "git"`、公开 `.git` URL、完整 `commit`；子目录包可另加 `path` |

索引需以可匿名直接读取、无跳转的静态 JSON 提供；时间填真实发布时间，不编造索引地址或发布记录。兼容声明应与包的 `engines.dsh: "0.2.1-rc.2"` 一致。索引读取与实际 Git 安装分别验证。

## 社区目录：只提交一份 JSON

目标为 [imsai-sh/awesome-deepseek-harness-plugins](https://github.com/imsai-sh/awesome-deepseek-harness-plugins) 的 `main`，不是姐妹站源码仓库。按下方固定规则快照：

1. 公开仓库同一 revision 必须包含声明 `dsh.bundle.patch` 的清单及对应 patch；作者自行测试实际兼容性，并添加 `dsh-plugin` topic。
2. 只新增 `catalog/plugins/seanliii--dsh-plugin-legion.json`；不得同时改生成 README、workflow 或脚本。
3. 严格保留七字段，双语描述客观具体，`added` 填**实际投稿日**。下面只是结构模板，日期占位符不能直接投稿：

```json
{
  "$schema": "../schema/plugin.schema.json",
  "id": "seanliii/dsh-plugin-legion",
  "name": "Legion Bridge",
  "repository": "https://github.com/seanliii/dsh-plugin-legion",
  "category": "tools",
  "description": {
    "en": "A native DSH workbench for member preferences, tool and Skill discovery, public GitHub source, explicit native bundle management, and optional integration tasks through a personal Legion service.",
    "zh": "DSH 原生军团工作台：选择成员、查找工具与 Skill、搜索公开 GitHub、明确安装与开关原生能力包，并可选委托个人 Legion 服务接入能力。"
  },
  "added": "<YYYY-MM-DD>"
}
```

不要额外添加 `source`、`npm`、SHA 或 `rights` 字段，`repository` 保持仓库根 URL。目录元数据贡献采用 **CC0-1.0**，该目录的代码贡献采用 MIT；这不重新许可外部插件。连接器的 MIT 声明也不是上游分发权保证。

目录仓库的 `npm run plugin:review` 对应 `scripts/review-plugin-submission.mjs`；完整审查还需要 PR/base/head 和 GitHub API 上下文，单独解析 JSON 不等于它已通过。非 draft、仅新增一条且通过 `Plugin submission review / static-review` 的 PR，在此快照的流程中会自动 squash merge；更新或删除需维护者审阅。已有目录条目时不能重复新增；PR #740 的合并与本次版本更新分别记账，上方 0.4.0 描述模板不表示现有目录已同步更新。

审查只检查材料和必要文件，不安装、构建、执行或评判第三方代码。发布、提交 PR、检查通过、合并、网站收录与真实安装分别确认。公开 Git 仓库可以满足无 npm 投稿的来源条件，**不是只要 push 就自动收录**。

## 分发内容与许可

只发布此独立连接器、合法依赖声明、许可和公开文档；不包含私有核心、用户数据、私有证据／日志／凭据、公司大仓及其历史、第三方上游全量源码、模型权重或另行生成的 Marked 验收包。核心仍为 `private-local-only`。最终 Git tree、包内链接与打包文件名单须与真正发布的字节一致；发布授权不等于所有成员已安装或无人自治。

本次不执行 npm publish；它仅是另行选择的分发路线，需要实际包名与发布权限。若以后选择 npm，发布后还需核对实际包内容及商店提供的安装目标，不能由 registry 条目推断同步完成。

## 已核规则出处

本页复用固定源码，不声称本轮重新抓取了线上规则或验证了商店界面。正式投稿前只需复核届时差异：

- 社区目录 `50684e4cde55722da7c6d19cf771b7e412b44ae2`：[CONTRIBUTING](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/50684e4cde55722da7c6d19cf771b7e412b44ae2/CONTRIBUTING.md)、[schema](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/50684e4cde55722da7c6d19cf771b7e412b44ae2/catalog/schema/plugin.schema.json)、[review workflow](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/50684e4cde55722da7c6d19cf771b7e412b44ae2/.github/workflows/plugin-review.yml)。CONTRIBUTING blob：`40a6acc056484b3b315a5df37cce92a75fcc35d4`。
- 姐妹站 `0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9`：[安装方法](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/web/worker/lib/install-methods.ts)、[原生命令分支](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/plugin/src/routes.ts)。
- 官方参考快照：[包发布](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md)、[市场索引](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/guide/plugin-market.md)。该源码快照含较新开发元数据；本插件运行契约以安装的 **npm rc.2** 为准。
