# Installation and publication / 安装与发布路线

本页提供 **0.4.1** 的固定版本安装入口；详细操作范围、封包验证和历史证据见[状态表](PLAN.md)。程序发布、安装、启用和目录审核分别记账。

**本版安装目标为 `github:seanliii/dsh-plugin-legion#v0.4.1`，采用 Git/tag，不是 npm publish。** 标签发布后使用下方命令；封包时的验证不等于最终公开提交匿名新装已通过，后续结果见[仓库 main 的版本记录](https://github.com/seanliii/dsh-plugin-legion/blob/main/docs/PLAN.md#v041)与 [Release](https://github.com/seanliii/dsh-plugin-legion/releases)。私有核心为 `private-local-only`，不在公开范围内，也没有公共下载版本。

**The versioned installation target is `github:seanliii/dsh-plugin-legion#v0.4.1`, via Git/tag rather than npm.** Use it once the tag is published. Packaging-time checks do not establish a successful anonymous installation of the final public commit; follow-up receipts belong in the repository's `main` documentation and Release. The separate private core is excluded and has no public download release.

## 分清三种分发方式

| 路线 | 提供什么 | npm 是否必需 |
|---|---|---|
| 官方 CLI 固定 Git 提交／标签 | 本版使用 `v0.4.1`；发布后也可用版本记录中的完整程序提交复现，不是市场收录。 | 不要求将此包发布到 npm；依赖获取仍可能联网。 |
| 官方 Discover 自托管索引 | 用户添加可信索引，安装其中声明的 Git 来源。 | Git 来源不要求此包先发 npm。 |
| 社区目录／1024Store | 提交一份目录 JSON；无 npm 可 **browse-only（仅浏览仓库）** 收录。 | 不是投稿前提；一键安装以商店实际提供的方式为准。 |

社区目录、姐妹站安装界面与官方管理器是不同系统。已保存的姐妹站源码中，常规安装按钮主要提供 npm 路线；底层官方 CLI／命令转发不能概括成“npm-only”。GitHub 元数据也不证明有 Git 一键按钮。不要把来源说明、按钮存在、实际安装或官方背书混为一谈。

## 固定 Git 安装

<a id="v041"></a>

### v0.4.1：本版安装入口

要求 **Node.js >=24.9.0** 和官方 npm DSH **`0.2.1-rc.2`**。`web` 是示例 profile，换成你自己的名称，保留 `-w`：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#v0.4.1'
```

此命令以已经公开的固定标签为前提；标签尚不可取得时，不自动改装 `main` 或旧版本。安装完成后仍需在 **DSH 原生插件页明确启用连接器**。依赖下载可能联网；权限、警告与重启要求以实际安装回执为准，不借历史版本的结果代替。

### 发行代码与后续验证记录

最终程序提交记为 **R**：R 与 `v0.4.1` **原子公开**，标签永久指向 R。随后在全新环境中，匿名按 **R 的完整 40 位 SHA** 安装并核对字节；结果再由独立的纯文档 **B 提交**补入仓库 `main` 与 Release。B 不改变 R 的程序字节，也不移动 `v0.4.1` 或旧标签；封包文档不自引用尚未生成的自身提交 SHA。

**封包时没有上述公开 SHA 匿名新装的成功回执。** 已有本地候选验证、最终发行包身份、实际发布与发布后新装是不同事实；后续状态见[仓库 main 的版本记录](https://github.com/seanliii/dsh-plugin-legion/blob/main/docs/PLAN.md#v041)与 [Release](https://github.com/seanliii/dsh-plugin-legion/releases)，不以旧 0.4.0 回执代替。

<a id="planned-v040"></a>
<a id="v040"></a>

### 固定版本 v0.4.0 / Fixed version v0.4.0

**以下仅为 0.4.0 历史安装记录；本版入口是上方的 v0.4.1。**

**0.4.0 固定发行记录（2026-10-29）：** 程序提交为 **`42dc33e34f22ce94a6379fe829bc75abbad09bf0`**；annotated tag `v0.4.0` 的对象为 `d1c95da1e7acec818c6b3dd00498db97144ac846`，指向该程序提交。后续说明不改写该标签的程序字节，**不移动 `v0.4.0`**；该次发行未另建 GitHub Release。首次目录 PR #740 已合并；截至该日，新版说明 [PR #748](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/pull/748) 已通过静态检查，仍待维护者审核。

要求 **Node.js >=24.9.0** 和官方 npm DSH **`0.2.1-rc.2`**。下面固定到已经审查、匿名新装成功的完整公开提交。`web` 是示例 profile，换成你自己的名称；保留 `-w`：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#42dc33e34f22ce94a6379fe829bc75abbad09bf0'
```

这是公开 Git 安装，不是 `npm install dsh-plugin-legion@0.4.0`，也不是商店的一键安装。**装完后还需到 DSH 原生插件页明确启用连接器**。依赖下载可能联网；实装退出 0，但有 pnpm peer dependency warning，不能说零警告。

Use **Node.js >=24.9.0** and DSH **0.2.1-rc.2**. The full commit above was installed anonymously and read back successfully. Replace the example `web` profile as needed, but retain `-w`. **Explicitly enable the connector in DSH Plugins after installation.** The installation retained a pnpm peer-dependency warning. This is Git installation, not an npm release or a marketplace install button.

### 标签与固定字节 / Tag and pinned bytes

若选择标签，`v0.4.0` 已核对指向上述完整提交；严格复现仍优先完整 SHA。本次不移动该标签：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#v0.4.0'
```

公开提交已包含可运行 JavaScript、`package.json` 和 `dsh.bundle.patch` 指向的 patch 文件，不依赖另行补入构建产物。标签安装中的说明仍是该代码提交的版本；之后的文档提交可以补充已存在的代码 SHA 与安装回执，不反写或移动发行字节。

该版本的逐文件核对、浏览器操作、GitHub 限流与恢复、无核心新装范围均保留在 [2026-10-29 公开新装验收](PLAN.md#固定公开提交的新装验收2026-10-29)，不作为 0.4.1 重跑或发布的证明。

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

## 社区目录：更新已有的一份 JSON

目标为 [imsai-sh/awesome-deepseek-harness-plugins](https://github.com/imsai-sh/awesome-deepseek-harness-plugins) 的 `main`，不是姐妹站源码仓库。以下保留 **2026-10-29 已有投稿**的操作与结果，基于 `d87de872b119a9e058f5b619f71e9fac8eebfb83`，只更新已收录条目的双语说明，不代表已为 0.4.1 新建投稿：

1. 公开仓库同一 revision 必须包含声明 `dsh.bundle.patch` 的清单及对应 patch；作者自行测试实际兼容性，并添加 `dsh-plugin` topic。
2. 只修改 `catalog/plugins/seanliii--dsh-plugin-legion.json`；不重复新增，不同时改生成 README、workflow 或脚本。
3. 严格保留七字段和条目身份；`added` 保留首次投稿日 **2026-10-28**，不改为版本更新日。以下为本次已提交内容：

```json
{
  "$schema": "../schema/plugin.schema.json",
  "id": "seanliii/dsh-plugin-legion",
  "name": "dsh-plugin-legion",
  "repository": "https://github.com/seanliii/dsh-plugin-legion",
  "category": "tools",
  "description": {
    "en": "A five-page native DSH workbench for selecting Legion members, finding session tools and Skills, searching configured plugin markets and public GitHub, and explicitly installing or switching native capability bundles. Delegates source adaptation and collaboration to a separately configured, user-authorized Legion core; the core and external harnesses are not bundled.",
    "zh": "DSH 原生五页工作台：选择军团成员、查找当前会话工具与 Skill、搜索已配置插件市场和公开 GitHub，明确安装或启停原生能力包；可委托另行配置并获授权的军团核心适配源码和协作，不捆绑核心或外部 Harness。"
  },
  "added": "2026-10-28"
}
```

不要额外添加 `source`、`npm`、SHA 或 `rights` 字段，`repository` 保持仓库根 URL。目录元数据贡献采用 **CC0-1.0**，该目录的代码贡献采用 MIT；这不重新许可外部插件。连接器的 MIT 声明也不是上游分发权保证。

**本次投稿 [PR #748](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/pull/748)**，提交 `d514169653bf3b74a7742ee1978d26bbdfecab09`。本地调用上游条目和差异验证器，结果为 `manual-review`；验证器未变，复用其 6 组共 **99 项通过**记录。GitHub 的 `static-review` 已成功，`merge` 为 **SKIPPED**；Codex Review 已完成且未报告发现。**截至 2026-10-29，PR 仍为 OPEN，需维护者手动审核，不是新版已收录。**

目录仓库的 `npm run plugin:review` 对应 `scripts/review-plugin-submission.mjs`；完整审查还需要 PR/base/head 和 GitHub API 上下文，单独解析 JSON 不等于通过。非 draft、仅新增一条且通过静态检查的投稿可自动合并；本次是更新已有条目，不能走新增自动合并。首次 PR #740 的合并与本次更新分别记账。

机器人回执确认：没有 npm 包时，1024Store 对该插件为 **browse-only**，展示仓库链接但不提供安装命令。这不妨碍上方固定 Git 安装，也不表示已经验证了新版商店页面。

审查只检查材料和必要文件，不安装、构建、执行或评判第三方代码。发布、提交 PR、检查通过、合并、网站收录与真实安装分别确认。公开 Git 仓库可以满足无 npm 投稿的来源条件，**不是只要 push 就自动收录**。

## 分发内容与许可

只发布此独立连接器、合法依赖声明、许可和公开文档；不包含私有核心、用户数据、私有证据／日志／凭据、公司大仓及其历史、第三方上游全量源码、模型权重或另行生成的 Marked 验收包。核心仍为 `private-local-only`。最终 Git tree、包内链接与打包文件名单须与真正发布的字节一致；发布授权不等于所有成员已安装或无人自治。

本次不执行 npm publish；它仅是另行选择的分发路线，需要实际包名与发布权限。若以后选择 npm，发布后还需核对实际包内容及商店提供的安装目标，不能由 registry 条目推断同步完成。

## 已核规则出处

2026-10-29 投稿前已取得当时的目录基线并核对差异，验证器、schema 和规则未变。以下依据对应那次提交基线；姐妹站和官方参考仍为已保存的固定源码，不声称本轮重新核对了线上规则或商店界面：

- 社区目录 `d87de872b119a9e058f5b619f71e9fac8eebfb83`：[CONTRIBUTING](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/d87de872b119a9e058f5b619f71e9fac8eebfb83/CONTRIBUTING.md)、[schema](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/d87de872b119a9e058f5b619f71e9fac8eebfb83/catalog/schema/plugin.schema.json)、[review workflow](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/d87de872b119a9e058f5b619f71e9fac8eebfb83/.github/workflows/plugin-review.yml)。CONTRIBUTING blob：`40a6acc056484b3b315a5df37cce92a75fcc35d4`。
- 姐妹站 `0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9`：[安装方法](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/web/worker/lib/install-methods.ts)、[原生命令分支](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/plugin/src/routes.ts)。
- 官方参考快照：[包发布](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md)、[市场索引](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/guide/plugin-market.md)。该源码快照含较新开发元数据；本插件运行契约以安装的 **npm rc.2** 为准。
