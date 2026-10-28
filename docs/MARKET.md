# Legion Bridge — installation and publication / 安装路线与发布状态

**0.2.0 is not yet publicly released or listed.** No Git remote is configured. The public repository, reviewed public commit, public pinned-Git installation, self-hosted index, catalog PR/merge/listing and npm publication are all pending. The GitHub login `seanliii` has been verified, but the target `repos/seanliii/dsh-plugin-legion` last returned HTTP 404; code rights, publishing permissions and external-release authorization remain unconfirmed.

**0.2.0 尚未公开发布、投稿或收录，Git remote 为空。** GitHub 登录身份 `seanliii` 已核实，但目标 `repos/seanliii/dsh-plugin-legion` 的只读检查仍为 HTTP 404；代码权属、发布权限及外发授权仍待确认。以下是路线与模板，不是已完成记录。

Legion Bridge starts with open-source capabilities: `legion_discover`, `legion_source` and `legion_bundle` need no Legion token. Only optional task collaboration and `legion_call` require the user's authorized personal service. Packaging means wrapping **already-adapted code**, not automatically converting any library. A bundle keeps its native subplugins independently switchable and retains upstream license/provenance information; this connector's MIT license does not relicense the adapted code. See the [English quick start](../README.md) / [中文入门](../README.zh-CN.md).

普通用户先找能力、读真实源码、完成适配再包装；不必先配置个人服务或服务 token。一包可包含按能力拆分、分别启停的原生插件，保留各自来源和许可证，不是任意项目一键转换；军团协作是可选项。

Task-bound collaboration is **two-step**: `legion_call` executes the selected native tool but sends no HTTP/messages. After the enclosing Host result is visible, DSH may separately call `legion_message` with shareable text. Do not combine execution and a success message inside one `run_code`. The selected tool may have its own network behavior; this does not change the three publication routes below.

本机调用与发送消息分开，新 v2 只保存调用状态元数据、同键不重做也不回放正文。DSH 看到最终结果后再决定显式发送；投递不代表消费，不自动唤醒终态任务。

## 1. Choose the right route / 分清三条路线

| Route / 路线 | What it provides / 提供什么 | npm requirement / npm 前提 |
|---|---|---|
| Official CLI, pinned public Git commit / 官方 CLI 固定 Git | Manual installation from an actual reviewed public commit; not a store listing. / 手动安装，不是市场收录。 | No npm publishing identity needed; dependencies may still need network. / 不需要 npm 发布账号。 |
| Official Discover, self-hosted index / 官方 Discover 自托管索引 | Users add the author's index URL and install the declared Git source; no central approval or endorsement. / 用户自加索引，不是官方审核上架。 | Git-source index does not require publishing this package to npm. / Git 源不以发 npm 为前提。 |
| 1024Store directory / 1024Store 目录 | A catalog entry can be browse-only. At the reviewed snapshot, offered one-click installs are **npm-only**. / 收录不等于有一键安装按钮。 | npm optional for catalog admission, required for that npm-only button. / 目录投稿可不发 npm，一键按钮另有要求。 |

These descriptions refer to the pinned source snapshots below, **not a fresh live-store check**. The separate `anywhere-labs/dsh-desktop` community market is not the official DSH market; its provider manifest is not interchangeable with either index format.

下面的规则有固定源码出处，不代表已核所有线上商店实例。社区 Desktop 的市场协议也是另一套机制，不能混用。

Where README descriptions of GitHub support conflict, follow the actual offered-install implementation and its verified scope. Mentioning GitHub in prose or metadata does not establish a one-click Git install path. / README 对 GitHub 支持的文字有不一致时，以实际安装代码和已有核验为准，不扩大安装承诺。

## 2. Pinned Git installation / 固定 Git 安装

After the repository is public and the commit reviewed, replace the placeholder with its real full 40-character SHA:

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#<PUBLIC_FULL_COMMIT_SHA>'
```

Keep `-w`, select the intended profile, and use the **published commit**, not a moving branch or invented hash. The commit must contain runnable JavaScript, its manifest and patch; installation must not depend on a missing build step. Earlier local Host checks are not evidence that this public Git target installs correctly.

这是未来安装模板，当前不能照抄。公开后还要匿名读取固定提交中的文件，再独立验证安装；本地已有文件能运行，不代表公开 Git 链路通过。

For an adapter produced by `legion_bundle`, DSH instead uses the returned official `plugin_manager` `install_bundle` parameters for its workspace directory, initially disabled. This is local bundle installation, not publication of this connector or of the adapter. One bundle contains independently switchable native subplugins, not separate npm packages.

生成适配包的本地安装与连接器公开发布分开；包装器不负责投稿、上线或注册 npm 包名。

## 3. Official Discover and a Git-source index / 官方 Discover 与 Git 索引

The optional official experimental market ships disabled and has **no default index or central submission queue**. In Web **Plugins → More beside Experimental plugins → Custom plugin markets**, enable it, then add your chosen index URL in Discover. The current Agent must also have the native market tool available. Disabling the bundle removes Discover/the tool while retaining configured index sources.

官方实验市场默认未启用。用户自行开启并添加可信索引；这叫兼容官方索引机制，不叫“官方市场已审核收录”。

An author-hosted UTF-8 JSON index uses these fields:

| Level / 层级 | Required / 必需字段 |
|---|---|
| Root / 根 | `format: 1`, `title`, `plugins` |
| Plugin / 插件 | `name: "dsh-plugin-legion"`, `versions` |
| Version / 版本 | The released manifest's `version`, actual `publishTimestamp` as **a number of Unix seconds**, `source` |
| Git source / Git 源 | `type: "git"`, `url: "https://github.com/seanliii/dsh-plugin-legion.git"`, published full 40-hex `commit`; optional `path` for a package subdirectory |

The intended connector package is at the repository root, so no `path` is needed. If declaring compatibility, match the released manifest's exact `engines.dsh: "0.2.1-rc.2"`. Do not invent a publication timestamp or substitute the documentation date for a release event.

时间填真实发布时间，不以文档日期冒充。当前不提供虚构的索引发布地址或已发布 JSON。

Serve the index at an anonymously readable static URL that succeeds without redirects. Verify index retrieval and actual Git-source installation separately. `legion_discover` queries only indexes already configured by the user; it does not publish an index or silently add one. A 1024 API response or community Desktop manifest is not the official index format.

索引能读与插件能安装要分别验；不能把其他商店 API 当作官方索引直接填入。

## 4. 1024Store catalog submission / 1024Store 目录投稿

Submission target: [imsai-sh/awesome-deepseek-harness-plugins](https://github.com/imsai-sh/awesome-deepseek-harness-plugins), branch **`main`**, not the store implementation repository. At the pinned catalog snapshot, the workflow is:

投稿目标是**目录仓库的 `main`**，不是商店实现仓库。以下规则来自固定快照，真正投稿时应再核目标规则。

1. Publish/review the actual repository first. Prepare one regular file: `catalog/plugins/seanliii--dsh-plugin-legion.json`; do not submit a symlink or edit generated READMEs.
2. Keep exactly seven top-level fields: `$schema`, `id`, `name`, `repository`, `category`, `description`, `added`. The schema path is relative to the destination catalog. Do not add `source`, `npm` or SHA fields or append a commit to `repository`.
3. Describe the implemented open-source path and optional collaboration honestly. State that adapter code must already be written, licenses retained, and native 0.2 verification is in progress. Add the documented `dsh-plugin` topic when the public repository exists.
4. A non-draft PR adding only this file, passing `Plugin submission review / static-review`, is eligible for automated squash merge in the reviewed workflow. Updates/deletions require maintainer review; failures need correction.
5. After merge, independently read the live entry and record PR, merge and listing observations. Merge is not installability or execution acceptance.

先有真实公开仓库再投一条 JSON。测试通过、PR 合并、线上能看到、实际能安装和调用，各有自己的证据，不能互相代替。

**Local draft prepared on 2026-10-28 (Asia/Shanghai; the UTC observation was on October 27), not a submitted or published entry.** The `added` value below is this draft's date. Reconfirm or replace it with the actual submission date immediately before creating a PR, and verify the public repository first.

**这是上海时间 2026-10-28 准备的本地草稿，不是投稿或发布记录。** `added` 暂填本轮草稿日期；正式提交前按实际上海日期再核，跨日就更新，公开仓库也仍须实际验证。

```json
{
  "$schema": "../schema/plugin.schema.json",
  "id": "seanliii/dsh-plugin-legion",
  "name": "Legion Bridge",
  "repository": "https://github.com/seanliii/dsh-plugin-legion",
  "category": "tools",
  "description": {
    "en": "Discover DSH tools and open-source capabilities, read public source at a pinned SHA, and package author-adapted code as independently switchable subplugins in one bundle. Optional Legion collaboration separates native tool execution from explicit legion_message delivery; upstream licenses are retained. Native end-to-end acceptance and publication remain pending.",
    "zh": "搜索 DSH 原生工具与开源能力，读取固定 SHA 的公开源码，将作者已适配的代码包装为一包内可独立启停的多个子插件；可选军团协作把原生工具执行与显式 legion_message 投递分为两步，保留上游许可证。原生端到端验收与公开发布尚待完成。"
  },
  "added": "2026-10-28"
}
```

The static review checks entry fields/name/category/text/date, the public default-branch manifest, and existence of its `dsh.bundle.patch` file in the same Git tree. It does **not** pin an install commit, install dependencies, execute scripts, parse the patch, run the plugin, audit security or endorse quality.

静态审查仅核材料结构和必要文件存在；不是运行、安全或质量验收。

The reviewed 1024Store implementation can retain GitHub install metadata or verification labels in its API without offering a Git install button. Its offered one-click route remains **npm-only**. A repository without a published npm package may be admitted **browse-only**. Neither manual official Git installation nor a self-hosted index changes that button's requirements.

目录里写了 GitHub 元数据，不等于商店提供一键 Git 安装。无 npm 可收录、可浏览，但不能因此宣称一键安装完成。

This npm-only rule describes the **offered store buttons**, not every official installation path. In the reviewed store code, the page-command branch forwards syntactically validated official CLI arguments; the legacy id-only branch refuses GitHub source installs. The local official `@deepseek-ai/dsh-plugin-manager@0.2.1-rc.2` tool uses `action: "install_bundle"` and `target` (no `source: "npm"` parameter), and the manager accepts Git specs. Neither fact establishes that the store offers a Git button or that this connector's public Git installation has passed.

npm-only 说的是商店提供的按钮，不是官方 DSH 不能装 Git。商店的新命令转发分支与旧的仅 ID 分支行为不同；官方原生工具用 `target` 接收安装规格，不能把 README 的 `source` 说法直接当成工具参数。以上均为源码边界，不是原生安装验收。

Catalog metadata contributions are **CC0-1.0**; code contributions to that catalog repository are **MIT**. This does not require external plugins or their upstream source projects to adopt MIT. This connector independently uses MIT; source/adapted-code/backend licenses remain separate.

目录元数据的许可不覆盖外部代码；保留上游原许可，不擅自改授 MIT。

## 5. Optional npm publication / 可选 npm 发布

An authorized publishing identity, package-name rights and a reviewed complete payload are prerequisites. Do not invent ownership, login, registry/tarball URLs or a successful release. npm is optional for the Git routes and catalog admission; it is required for the reviewed npm-only one-click route.

没有 npm 发布身份不挡 Git 安装或目录投稿，但不能伪造包名权限或发布成功。

If npm publication is chosen later, publish the actual package with its `dsh.bundle` metadata, then verify the live directory exposes the correct npm install method/target. Registry existence alone is insufficient; detection/sync may lag. Generated adapter packages are currently `private: true`; packaging one does not publish it.

以后若选择发布 npm，还需核商店真实读回的安装方式和目标；包存在不等于商店已同步。

## 6. Release contents and evidence / 公开内容与验证记录

Keep only this independently written connector and its legitimate dependency declarations/docs in public Git and installation payloads. Exclude private validation records, logs, credentials, real personal filesystem paths, company/backend source and user artifacts. Recheck the **final** Git/packed file list and documentation links before a release; a previously checked payload does not certify later changes. Reuse existing tests for the same code snapshot rather than reporting an unperformed new run.

公开包只含连接器，不包含私有运行现场。最终待发布字节、许可证和链接仍需核对；本次文档修改不是新一轮安装或验收。

| Claim / 声明 | Current record / 当前记录 |
|---|---|
| Current offline evidence / 当前离线证据 | Node **v24.20.0**, `npm run check` and `npm test` both exit 0; **357/357 passed**, no failures/cancellations/skips, source hashes unchanged before/after; all 30 recorded files still match. Isolated tests and official rc.2 Runtime only. / 复用同字节集成证据，不冒充所有流或真实 Host 通过。 |
| Implemented 0.2 interfaces / 已实现入口 | `legion_discover`, `legion_source`, `legion_bundle`, `legion_call`, plus existing collaboration tools. / 接口实现不等于完整用户旅程。 |
| New native chain / 新增原生链 | **In progress**. One `plugin_manager list_bundles` approval was consumed by that query; the repeat query was not authorized. It authorizes no installation, enabling or restart. / 安装、开关、Host 调用和后续显式发送仍需各自授权与证据。 |
| Specific ACK/recovery fixes / 两项已修复 | Explicit-message ACK embedded-data-URL redaction and legacy v1 delivery-ACK recovery are fixed with regressions in the current suite. / 保留历史投递，不回旧正文、不重发；不宣称所有格式或路径均已覆盖。 |
| Source retry fix / 来源重试修复 | Same-session/instance/lifetime successful full-commit observations can be reused with original timestamps/hashes and explicit retrieval markers; errors are fetched again, current writes still use current permissions. Independent review **13/13**. / 最后保存的原生包装回执没有新字段，磁盘修复不等于旧 Host 已加载。 |
| Author's `marked` dual-plugin adapter / 作者双插件 | The author repaired service injection and JSON output. Official rc.2 Loader/ToolRuntime made **20 actual calls: 14 business successes + 6 expected UNKNOWN_TOOL** results after unloading, including both unload orders. / 不代补业务；不是实际 Host 安装或界面开关验收。 |
| Latest native package readback / 最新原生包读回 | All **17 files** match the successful `legion_bundle` receipt; 3 runtime source files match the executed version. Dependency resolution used local aliases, not a real installation. / `written_not_installed`、`execution_verified:false` 保留，不把读回改成假执行。 |
| Author feedback and development references / 作者反馈与开发信息 | The two recorded adapter defects were repaired by the author and independently replayed. Official skill/reference pointers remain on demand, without automatic injection or code rewriting by the connector. / 从“反馈已排队”推进到“作者已修改、原反例已恢复”，不外推全部项目。 |
| Actual task consumption and user experience / 消费与体验 | Not established by execution/delivery receipts; no automatic wake of terminal tasks. / 回执不代表已读或继续工作。 |
| Public reviewed repository/commit / 公开仓库与提交 | Pending / 未完成 |
| Public pinned-Git install / 公开固定 Git 安装 | Not performed / 未执行 |
| Official index fetch and install / 官方索引读取与安装 | Pending / 待验证 |
| Catalog PR, merge and live listing / 目录投稿、合并、收录 | Not completed / 未完成 |
| npm publication and store button / npm 与一键按钮 | Not performed / 未执行 |
| Code rights, publishing permissions and external-release authorization / 代码权属、发布权限与外发授权 | Still to be confirmed by the publisher; the MIT declaration is not proof of ownership or permission. / 独立新写和复用片段的分发权、账号权限及外发授权仍待确认。 |
| Final payload, recovery, uninstall and real reverse proxy / 最终包、恢复、卸载与实服反代 | Remain outside the current acceptance claim / 仍不在当前验收声明内 |

The integrated run was **2026-10-28 04:25:05–04:25:09 UTC / 12:25:05–12:25:09 Asia/Shanghai**. The same-byte source check reuses that saved result rather than claiming a rerun. Separate reviews, adapter calls and package/link checks are not added to its 357-test total. Earlier full-suite snapshots remain for traceability only.

Record only actually executed results, with versions and appropriately redacted evidence. Source compatibility, local smoke, native install/active/called state, model consumption and a useful user result are separate facts. None should be inferred from another.

## Pinned primary sources / 固定一手来源

The marketplace references reuse the recorded read-only review from **2026-10-27 16:44–16:47 UTC / 2026-10-28 00:44–00:47 Asia/Shanghai**. Its saved comparisons showed no changes to the relevant catalog rules or store installation code. Separately, the fixed official `SAFETY.md` body and Git blob were verified on **2026-10-28 04:46:03 UTC**. That one-source check is not a new review of all marketplace rules or any live deployment.

市场规则继续使用已有固定来源、提交对比和本地官方 rc.2；只新增核实官方固定 `SAFETY.md` 的有效正文，不称为所有线上实例的最新行为。本文 JSON 示例的双语说明沿用已对齐的本地草稿，草稿本身未改、未投稿；旧离线目录检查仅作追溯，不冒充新跑目录审查。正式投稿前另核届时的 `main`、实际日期与最终文稿。

- [Official package/install guide](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md)
- [Official safety statement](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/SAFETY.md) — the verified 1,673-byte body still describes an experimental, unaudited developer preview; see [Security](SECURITY.md) for its hash and scope.
- [Official experimental market bundle](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/experimental/plugin-market-bundle/README.md)
- [Official index format and hosting](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/guide/plugin-market.md)
- [Official Git-spec parser](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/boot/plugin-manager/src/install-spec.ts#L21-L91)
- [1024Store contribution rules](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/1145b331b263ac371053801bdd08ce9b3e3ed75c/CONTRIBUTING.md), [entry schema](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/1145b331b263ac371053801bdd08ce9b3e3ed75c/catalog/schema/plugin.schema.json), [review workflow](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/1145b331b263ac371053801bdd08ce9b3e3ed75c/.github/workflows/plugin-review.yml)
- [1024Store offered install methods](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/web/worker/lib/install-methods.ts#L174-L195), [npm-only install component](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/web/src/components/InstallMethods.tsx#L22-L50), [command and legacy-id install branches](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/plugin/src/routes.ts#L618-L665)
- [Community Desktop source contract](https://github.com/anywhere-labs/dsh-desktop/blob/77b01d15361d7112e7163f53c85e601ed82d6320/dsh-community-market/docs/catalog-provider-contract.md), [1024 adapter](https://github.com/anywhere-labs/dsh-desktop/blob/77b01d15361d7112e7163f53c85e601ed82d6320/dsh-community-market/src/adapters/dsh-1024store.ts)

The official source snapshot contains rc.3 development metadata; it is a reference, not this connector's runtime. The declared target remains npm **`@deepseek-ai/dsh@0.2.1-rc.2`**. Fixed-source findings do not establish byte-for-byte parity with deployed stores or acceptance of the 0.2 native chain.

官方固定源码与实际运行版本分开记录；不要把 rc.3 开发元数据写成已验运行环境，也不要从商店源码推出本插件已经收录。
