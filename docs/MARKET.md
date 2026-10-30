# Installation and publication / 安装与发布路线

**本版 0.4.2：通过固定 Git 来源安装连接器，按需接入独立军团核心。** 先看[安装目标](#v042)，装好后在 DSH 原生插件页启用；需要委托工作，再[下载已公开的核心 v0.1.0](CORE.md#public-core-install)建立实例。核心是另包安装的技术预览，不随连接器打包。

连接器标签可用状态、精确发行身份与发布后的新装回执统一更新在 [GitHub main](https://github.com/seanliii/dsh-plugin-legion/blob/main/docs/PLAN.md#v042)。本版文档说明安装目标，不把未来验收写进固定 tag，也不借用 0.4.1 的回执。

**0.4.2 uses Git distribution, not npm.** Install and enable the connector, then create your own instance from the public core v0.1.0 source archive. The core's first-party code is MIT, third-party licenses are retained, and post-release acceptance is recorded on GitHub `main`.

## 分清三种分发方式

| 路线 | 提供什么 | npm 是否必需 |
|---|---|---|
| 官方 CLI 固定 Git 提交／标签 | 本版目标为 `v0.4.2`；下方 0.4.1 固定提交仍保留自己的历史回执。 | 不要求将此包发布到 npm；依赖获取仍可能联网。 |
| 官方 Discover 自托管索引 | 用户添加可信索引，安装其中声明的 Git 来源；下方提供本版的发布后索引入口。 | Git 来源不要求此包先发 npm。 |
| 社区目录／1024Store | 提交一份目录 JSON；无 npm 可 **browse-only（仅浏览仓库）** 收录。 | 不是投稿前提；一键安装以商店实际提供的方式为准。 |

社区目录、姐妹站安装界面与官方管理器是不同系统。已保存的姐妹站源码中，常规安装按钮主要提供 npm 路线；底层官方 CLI／命令转发不能概括成“npm-only”。GitHub 元数据也不证明有 Git 一键按钮。不要把来源说明、按钮存在、实际安装或官方背书混为一谈。

## 固定 Git 安装

<a id="v042"></a>

### v0.4.2：本版安装目标

需要 **Node.js >=24.9.0** 和官方 npm DSH **`0.2.1-rc.2`**。标签是否可用请看 [GitHub main 发布回执](https://github.com/seanliii/dsh-plugin-legion/blob/main/docs/PLAN.md#v042)。`web` 是示例 profile，换成自己的名称，保留 `-w`：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#v0.4.2'
```

安装后在 **DSH 原生插件页**明确启用，保留实际警告、构建审批与重启要求。精确提交、包 SHA-256 和匿名新装结果由上述 `main` 页面记录；不沿用 0.4.1 的 R、TGZ hash 或 29/29 回执，目标不可读时也不静默改装 `main` 或旧版本。

要委托核心工作，再按[公开核心安装入口](CORE.md#public-core-install)取得 `v0.1.0` 源码包及相邻 `.sha256`，核对并建立自己的实例：**Python 3.12 全新环境 → `init` → `serve` → 另一终端 `dsh-config` → 插件保存连接**。实际委托前配置本人模型；外部 Harness、权重与账号按需安装授权。

<a id="v041"></a>

### v0.4.1：既有公开固定版本

以下安装和验收仅属于 **0.4.1**，不是 0.4.2 的发布或新装结果。

要求 **Node.js >=24.9.0** 和官方 npm DSH **`0.2.1-rc.2`**。`web` 是示例 profile，换成你自己的名称，保留 `-w`：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#v0.4.1'
```

该标签已公开并固定到下方的程序提交 R；固定来源无法读取时，不自动改装 `main` 或旧版本。本次新装初始停用，需在 **DSH 原生插件页明确启用连接器**，并保留 pnpm peer-dependency warning。依赖下载可能联网；权限、警告与重启要求以实际安装回执为准。

要复现本次已验字节，使用已匿名新装核对的完整 40 位提交：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#87a2f4dae1c61e2764b7748ecb10ea7b367fcf2f'
```

### 发行代码与后续验证记录

最终程序提交 **R = `87a2f4dae1c61e2764b7748ecb10ea7b367fcf2f`** 与 `v0.4.1` 已公开，标签固定指向 R。匿名全新 profile 按 R 安装退出 0，**29/29 个安装文件**与受审发行包一致；随后完成[限定的无核心原生 UI 检查](PLAN.md#public-r-acceptance)，不把安装和启用混为一谈。

**R 的受审 TGZ：169,604 字节，29 个文件，SHA-256 为 `db7b8391a6c3bb98aa7d35bf38ad24836c61c97b98bdc571f8a2e7f946de0cce`。** 原 TGZ 与 `SHA256SUMS` 已作为 [v0.4.1 Release](https://github.com/seanliii/dsh-plugin-legion/releases/tag/v0.4.1) 附件公开，发布后匿名下载的字节与 hash 均和受审文件一致。

后验纯文档 **B（`45e6efd2e3dab2e6f3562cc8fb80254888d03c6f`）** 已单独发布；0.4.1 阶段的 **C** 只补充发布、投稿与本地来源清单事实，当时不改程序、清单或版本，不移动 `v0.4.1` 与旧标签，也不替换 R 的受审 TGZ。从 B、C／`main` 重新打包会包含不同的文档字节，**不是这个已验 TGZ，不能沿用其 hash 或 29/29 核对回执**。封包文档与后验文档分别保留，C 记录时不自引用尚未生成的自身提交 SHA；本轮 0.4.2 文档与版本准备不改写这些历史身份。

0.4.1 目录投稿已更新，**同一 head 的 `static-review` 已成功，PR 仍待维护者审核、尚未合入**；具体提交、本地校验与 CI 分别见下方，后续状态见[仓库 main 的版本记录](https://github.com/seanliii/dsh-plugin-legion/blob/main/docs/PLAN.md#v041)。维护者的原始回执、日志和截图未公开，也不是 Release 附件；不借旧 0.4.0 回执证明新版。

<a id="planned-v040"></a>
<a id="v040"></a>

### 固定版本 v0.4.0 / Fixed version v0.4.0

**以下仅为 0.4.0 历史安装记录；既有公开版本 v0.4.1 与本版 v0.4.2 安装目标在上方分开列出。**

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
3. 没有核心也可以在 **找能力 / Discover** 查当前 DSH 工具／Skill、公开 GitHub、已配置市场。要真实委托，可连接本人已有且获授权的核心，或从[公开核心源码](CORE.md#public-core-install)建立并启动新实例。到 **连接与配置 / Connection** 填核心地址与凭据引用，保存后刷新成员；不填凭据值。
4. 安装其他现成包使用 **添加能力 / Add capabilities → 检查来源 / Inspect source → 安装 / 更新（Install / update）**，仍由官方 `pluginManager` 处理 `enabled:false`。新包不会自动选择启用；更新保留已有开关，已启用包可能继续运行。**若不希望更新后的代码运行，先在下方停用对应能力包，再安装更新。** 整包与子插件开关分别确认。检查通过不等于可信，禁用不禁止依赖构建，`pendingBuilds` 在原生插件页批准。工作台不能从自身页面停用 Legion 连接器。
5. **检查并交给军团 / Inspect & delegate** 只准备可编辑任务；明确点 **交给军团接入 / Delegate integration** 才提交到配置的核心／模型，可能产生费用。任务回执不代表适配完成；查看实际加载与调用结果。

Check actual bundle/plugin loading state in **DSH Plugins**, then open **Legion** in the sidebar and choose a **Working session**. Core-free discovery remains available. For delegation, connect an existing authorized instance or create your own from the public core source; enter a token variable name or Host file path, never a token value. **Install / update** keeps the official manager's `enabled:false`: new bundles are not automatically selected, while updates preserve existing switches. Disable a bundle before updating if you do not want the updated code to run. Source-project inspection only prepares a task; **Delegate integration** is the explicit submission step and may incur model costs, not proof of a working adapter.

原生配置和插件开关影响同 profile，不是会话私有；安装、启用、真实执行分别确认。详见[工作台操作与限制](ECOSYSTEM.md#native-workbench)，凭据轮换与重载见[中文连接说明](../README.zh-CN.md#连接你独立安装的军团核心)／[English connection guide](../README.md#connect-your-independently-installed-legion-core)。

## 官方 Discover 索引

在 DSH 中依次操作：

**插件 → 实验性插件的“更多” → 启用“自定义插件市场” → 返回插件 → 发现 → 添加索引源。**

维护者已在真实浏览器中核对上述设置路径。本版索引的**发布后入口**为：

```text
https://raw.githubusercontent.com/seanliii/dsh-plugin-legion/main/marketplace.json
```

**封包前该索引尚未创建，尚无索引读取或安装成功回执。** 发布可用状态、固定 Git 提交与实际安装结果请看 [GitHub main](https://github.com/seanliii/dsh-plugin-legion/blob/main/docs/PLAN.md#v042)，发布后再添加上述来源。

In DSH: **Plugins → More under Experimental plugins → enable Custom plugin market → back to Plugins → Discover → Add index source**. The maintainer verified this settings route in a real browser; the URL above is a post-publication entry, not an already-verified index or installation.

启用可选官方市场后，用户自行添加可信索引 URL；连接器没有默认中央目录，也不自动添加索引。官方索引与社区目录 JSON 格式不能混用。

| 层级 | 字段 |
|---|---|
| 根 | `format: 1`、`title`、`plugins` |
| 插件 | `name`、`versions` |
| 版本 | 实际包版本、`publishTimestamp`（Unix 秒数）、`source` |
| Git 来源 | `type: "git"`、公开 `.git` URL、完整 `commit`；子目录包可另加 `path` |

索引需以可匿名直接读取、无跳转的静态 JSON 提供；时间填真实发布时间，不编造索引地址或发布记录。兼容声明应与包的 `engines.dsh: "0.2.1-rc.2"` 一致。索引读取与实际 Git 安装分别验证。

## 社区目录：更新已有的一份 JSON

目标为 [imsai-sh/awesome-deepseek-harness-plugins](https://github.com/imsai-sh/awesome-deepseek-harness-plugins) 的 `main`，不是姐妹站源码仓库。**0.4.2 沿用 PR #748，当前仍为 OPEN、待维护者审核。** 后续更新回执见 [GitHub main](https://github.com/seanliii/dsh-plugin-legion/blob/main/docs/PLAN.md#v042)；以下保留 0.4.1 已提交的双语说明与回执，不改称 0.4.2 已投稿或 CI 已通过，历史 0.4.0 记录单列：

1. 公开仓库同一 revision 必须包含声明 `dsh.bundle.patch` 的清单及对应 patch；作者自行测试实际兼容性，并添加 `dsh-plugin` topic。
2. 只修改 `catalog/plugins/seanliii--dsh-plugin-legion.json`；不重复新增，不同时改生成 README、workflow 或脚本。
3. 严格保留七字段和条目身份；`added` 保留首次投稿日 **2026-10-28**，不改为版本更新日。以下为 0.4.1 已提交内容：

```json
{
  "$schema": "../schema/plugin.schema.json",
  "id": "seanliii/dsh-plugin-legion",
  "name": "dsh-plugin-legion",
  "repository": "https://github.com/seanliii/dsh-plugin-legion",
  "category": "tools",
  "description": {
    "en": "A five-page native DSH workbench to choose Legion members, discover session tools and Skills, search configured plugin indexes and public GitHub, and explicitly install or enable native capability bundles. Includes connection settings, task details, and separate run, artifact and download status. Source adaptation and collaboration use a separately configured, user-authorized Legion core; no core, external harnesses, models or credentials are bundled.",
    "zh": "DSH 原生五页军团工作台：选择成员、查找会话工具与 Skill、搜索已配置插件索引和公开 GitHub，并明确安装或启停原生能力包；提供连接配置、任务详情，分别呈现运行、成果和下载状态。源码适配与协作交给另行配置并获授权的军团核心，不捆绑核心、外部 Harness、模型或凭据。"
  },
  "added": "2026-10-28"
}
```

不要额外添加 `source`、`npm`、SHA 或 `rights` 字段，`repository` 保持仓库根 URL。目录元数据贡献采用 **CC0-1.0**，该目录的代码贡献采用 MIT；这不重新许可外部插件。连接器的 MIT 声明也不是上游分发权保证。

**0.4.1 更新仍为 [PR #748](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/pull/748)**，head 为 `4bd8cc6e5196de363149bff317a161833ad8f2db`，状态 **OPEN／MERGEABLE（未合入）**。本地基于可信上游 `50684e4cde55722da7c6d19cf771b7e412b44ae2` 调用条目与差异验证器，结果为 `manual-review`，只涉及上述一份 JSON，`git diff --check` 退出 0。该 head 的[工作流 40938539964](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/actions/runs/40938539964)中，`static-review=SUCCESS`，完成于 **2026-10-29 19:16:28 UTC**；`merge=SKIPPED`。这是该提交的目录 CI，不是合并成功或产品验收；仍需维护者审核合并。

**历史 0.4.0 投稿 [PR #748](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/pull/748)**，提交 `d514169653bf3b74a7742ee1978d26bbdfecab09`。本地调用上游条目和差异验证器，结果为 `manual-review`；验证器未变，复用其 6 组共 **99 项通过**记录。GitHub 的 `static-review` 已成功，`merge` 为 **SKIPPED**；Codex Review 已完成且未报告发现。**截至 2026-10-29，PR 仍为 OPEN，需维护者手动审核，不是新版已收录。**

目录仓库的 `npm run plugin:review` 对应 `scripts/review-plugin-submission.mjs`；完整审查还需要 PR/base/head 和 GitHub API 上下文，单独解析 JSON 不等于通过。非 draft、仅新增一条且通过静态检查的投稿可自动合并；本次是更新已有条目，不能走新增自动合并。首次 PR #740 的合并与本次更新分别记账。

机器人回执确认：没有 npm 包时，1024Store 对该插件为 **browse-only**，展示仓库链接但不提供安装命令。这不妨碍上方固定 Git 安装，也不表示已经验证了新版商店页面。

审查只检查材料和必要文件，不安装、构建、执行或评判第三方代码。发布、提交 PR、检查通过、合并、网站收录与真实安装分别确认。公开 Git 仓库可以满足无 npm 投稿的来源条件，**不是只要 push 就自动收录**。

## 分发内容与许可

连接器只分发自身程序、合法依赖声明、许可和公开文档；已公开的核心 v0.1.0 **不随连接器打包**。第一方核心、选定 auto-tools、打包器与文档以 MIT 公开，第三方许可保留；新包字段见[公开格式](CORE.md#public-core-next-steps)，旧 `private-local-only` 归档与证据保持不变。不包含用户数据、私有证据／日志／凭据、公司大仓及其私有历史、无关业务、第三方上游全量源码、模型权重或另行生成的 Marked 验收包。最终 Git tree、包内链接与打包文件名单须与真正发布的字节一致；发布授权不等于所有成员已安装、无人自治或行业普遍领先。

`npm whoami` 的已提供实查结果为 **`ENEEDAUTH`**；0.4.2 继续 Git 分发，本次不执行 npm publish，也不把未登录表述成已发布。若以后另行选择 npm，仍需实际包名与发布权限，发布后核对包内容和商店实际提供的安装目标，不能由 registry 条目推断同步完成。

## 已核规则出处

2026-10-29 投稿前已取得当时的目录基线并核对差异，验证器、schema 和规则未变。以下依据对应那次提交基线；姐妹站和官方参考仍为已保存的固定源码，不声称本轮重新核对了线上规则或商店界面：

- 社区目录 `d87de872b119a9e058f5b619f71e9fac8eebfb83`：[CONTRIBUTING](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/d87de872b119a9e058f5b619f71e9fac8eebfb83/CONTRIBUTING.md)、[schema](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/d87de872b119a9e058f5b619f71e9fac8eebfb83/catalog/schema/plugin.schema.json)、[review workflow](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/d87de872b119a9e058f5b619f71e9fac8eebfb83/.github/workflows/plugin-review.yml)。CONTRIBUTING blob：`40a6acc056484b3b315a5df37cce92a75fcc35d4`。
- 姐妹站 `0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9`：[安装方法](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/web/worker/lib/install-methods.ts)、[原生命令分支](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/plugin/src/routes.ts)。
- 官方参考快照：[包发布](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md)、[市场索引](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/guide/plugin-market.md)。该源码快照含较新开发元数据；本插件运行契约以安装的 **npm rc.2** 为准。
