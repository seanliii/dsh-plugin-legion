# Publication workflow / 发布与目录投稿

**As of 2026-10-27:** local official rc.2 Host checks and one real Codex task have succeeded; native command download returned a 2123-byte export with matching SHA-256. Browser interaction, model-invoked tools and successful recovery remain unverified. Public repository publication, pinned-Git installation, an index and catalog submission have not happened; neither has npm publication. `seanliii/dsh-plugin-legion` is the intended repository identity, not proof of a working public URL.

**截至 2026-10-27：**官方 rc.2 本地 Host 检查与一轮真实 Codex 任务已成功，原生命令已下载正式导出，2123 字节、SHA-256 一致。浏览器交互、模型主动调用工具与真实恢复仍未验收。公开仓库、固定 Git 安装、索引、目录投稿与 npm 发布均未发生；`seanliii/dsh-plugin-legion` 是目标仓库身份，不是公开地址已可用的证明。

| Route / 路线 | What it provides / 提供什么 |
|---|---|
| Official CLI, pinned Git commit / 官方 CLI 固定 Git 提交 | Manual installation from a reviewed public commit; not a store listing. / 手动安装，不是市场收录。 |
| Official Discover, self-hosted Git index / 官方 Discover 自托管 Git 索引 | Users add the author's index URL; no central submission or endorsement. / 用户自行添加索引，不是官方审核上架。 |
| 1024Store directory and install UI / 1024Store 目录与安装界面 | Admission does not require npm; the reviewed install UI offers npm only. Without npm, an entry is browse-only. / 无 npm 可收录，但没有正式一键安装按钮。 |

An npm publishing identity is not required for either Git route or a directory PR. It is required to publish the npm package used by 1024Store's current one-click route. The separate `anywhere-labs/dsh-desktop` community market is not the official DSH market; its provider manifest is not interchangeable with either index format.

没有 npm 发布身份不阻塞两条 Git 路线或目录 PR，但不能因此承诺 1024Store 一键 Git 安装。`anywhere-labs/dsh-desktop` 的 community-market 是另一套社区客户端机制，不是官方市场，其 provider manifest 也不能混用。

## 1. Prepare the public commit / 准备公开提交

1. Include the public bridge only: manifest, entry point, prebuilt JavaScript, bundle patch, license and appropriate documentation. Do not include backend code, credentials, operator deployment details, private paths, session records or downloaded user artifacts. Keep private validation evidence out of public Git history and installation payloads.
2. Preserve the manifest's Node `>=24.9.0`, exact `engines.dsh: "0.2.1-rc.2"` and string `dsh.bundle.patch: "./cordis.patch.yml"`. The current patch inserts `id: legion`, `name: dsh-plugin-legion`.
3. Run the manifest checks/tests after runtime changes and inspect the actual package file list: `npm run check`, `npm test`, `npm pack --dry-run --json`. These do not publish a package; listing them is not evidence of a new run. Existing results are recorded below. Inspect both Git and packed payloads, including relative documentation links. A previously reviewed package is not evidence for the final package after documentation or allowlist changes.
4. Record real rc.2 Host loading, both command/tool paths, service integration, disconnect recovery, cancellation semantics and export download checks separately from fixture tests. Add dates, versions and redacted evidence only after execution.
5. Publish only after authorized review. Record the full **published 40-hex commit** and anonymously verify that its manifest, entry point and patch can be retrieved.

只公开连接器，不公开后端或运行现场；保持精确 engine 和真实 patch。检查命令、假服务测试、真实 Host/服务/界面验收分开留证。公开后再匿名读取固定 commit 的文件；没有结果就保留“待验证”，不能把准备工作写成已发布。

## 2. GitHub installation first / 先走固定 GitHub commit

After the public commit exists and is reviewed, install into the intended DSH profile:

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#<PUBLIC_FULL_COMMIT_SHA>'
```

Keep `-w` and replace the placeholder with the verified public commit, not a branch or an invented SHA. The commit must already contain runnable JavaScript; the current package does not declare an install-time build script. The completed local Host check is not verification of this public Git source. Public Git installation does not require an npm publisher login, although dependency retrieval still requires network access.

保留 `-w`，占位符替换为真实公开且已审查的完整 commit，不能用虚构 SHA 充数。提交里应已有可运行 JavaScript。本地 Host 已安装，不代表这个公开 Git 源已验证；不需要 npm 发布登录，也不代表安装无需联网。

## 3. Official Discover: a Git-source index / 官方 Discover：固定 Git 源索引

The official experimental market bundle ships **no default index or central submission queue**. An author publishes a static index; users explicitly add its URL. This is compatibility with the official index mechanism, **not official endorsement or an official marketplace listing**.

官方实验市场 bundle 没有预置目录或中央投稿队列。作者发布静态索引，用户自行添加 URL；这叫兼容官方索引机制，不叫“官方审核上架”。

Build a UTF-8 JSON index with these actual fields:

| Level / 层级 | Required values / 必需值 |
|---|---|
| Root / 根 | `format: 1`, `title`, `plugins` |
| Plugin / 插件 | `name: "dsh-plugin-legion"`, `versions` |
| Version / 版本 | `version` matching the released manifest; actual `publishTimestamp` as **Unix seconds, a number**; `source` |
| Git source / Git 源 | `type: "git"`, `url: "https://github.com/seanliii/dsh-plugin-legion.git"`, `commit`: the published **40-hex commit**; optional `path` only for a package subdirectory |

The intended package is at the repository root, so no subdirectory `path` is needed. Use the actual release timestamp, not this document's date as a fabricated publication event. If declaring compatibility in the index, copy the released manifest's exact `engines.dsh`.

当前包位于仓库根，无需编造 `path`。发布时间填写真实发布时刻，不能把本文日期当成已发布事实；若索引带兼容范围，应与发布 manifest 的精确 `engines.dsh` 一致。

Serve the index from an anonymously readable static URL returning a successful response **without redirects**. Then enable the experimental market bundle in DSH Plugins and add that URL in Discover. Verify fetching and actual Git-source installation separately. Do not substitute a 1024Store API response or a community Desktop provider manifest: they are different formats. No actual index URL or JSON release artifact is asserted by this document.

索引地址必须匿名可读、成功直返且不重定向；用户启用官方实验市场后在 Discover 添加。索引读取与实际 Git 安装分别验收。1024 API 和社区 Desktop 的 manifest 不是这个格式；本文没有伪造已经发布的索引 URL 或 JSON 成品。

## 4. 1024Store: one directory PR / 1024Store：单条目录 PR

Submission repository: [imsai-sh/awesome-deepseek-harness-plugins](https://github.com/imsai-sh/awesome-deepseek-harness-plugins), target branch **`main`**. The store implementation repository is not the target for an individual plugin entry.

投稿目标是上述**目录仓库的 `main`**，不是商店实现仓库。

1. After publishing the repository, prepare one file: `catalog/plugins/seanliii--dsh-plugin-legion.json`.
2. Use the example below; `$schema` is relative to that **destination**. Submit a regular JSON file, not a symlink.
3. Keep exactly seven top-level fields: `$schema`, `id`, `name`, `repository`, `category`, `description`, `added`. Use `seanliii/dsh-plugin-legion`, its repository root URL, `tools`, objective English/Chinese descriptions and the actual submission date. Do not add `source`, `npm` or SHA fields, or append a commit to `repository`.
4. Check the public default-branch manifest and referenced patch. Provide real test commands/results and the fact that an existing authorized backend is required. Add the documented `dsh-plugin` topic for discovery.
5. Open a **non-draft PR changing only this one new JSON file**. Passing `Plugin submission review / static-review` makes this addition eligible for automated squash merge. Updates/deletions need maintainer review; failed checks require correction. Do not edit generated READMEs.
6. After merge, anonymously read the live directory entry. Record PR URL, merge commit and observed directory result separately.

公开仓库后再投一条 JSON，说明后端前提与真实测试结果。新增单条、非草稿、静态检查通过才进入自动合并流程；合并后还要单独读回线上目录，不能把“合并”当成“已经可安装”。

Example only, **not a submitted entry**; update `added` if submission is later:

仅为模板，**不是已投稿记录**；晚于本文日期投稿时更新 `added`：

```json
{
  "$schema": "../schema/plugin.schema.json",
  "id": "seanliii/dsh-plugin-legion",
  "name": "Legion Bridge",
  "repository": "https://github.com/seanliii/dsh-plugin-legion",
  "category": "tools",
  "description": {
    "en": "Connect DeepSeek Harness to an existing Legion service you are authorized to use. Backend not included.",
    "zh": "把已获授权的 Legion 服务接入 DeepSeek Harness 会话；不包含后端。"
  },
  "added": "2026-10-27"
}
```

**The reviewed 1024Store implementation is npm-only for offered one-click installs.** Its directory/API can record GitHub install metadata, including revision or verification labels, without presenting a Git install button. An unpublished-npm entry may pass static review and be listed **browse-only**. Neither official manual Git installation nor a self-hosted Discover index changes this.

**已核 1024Store 公开实现的正式一键安装仍是 npm-only。** 目录/API 即使记录 GitHub 安装元数据、修订或验证标签，也不等于提供 Git 安装按钮。未发 npm 可通过静态审核并以 **browse-only** 收录；官方手动 Git 安装、自托管 Discover 索引都不会自动改变这条规则。

The gate checks exact fields, filename, category, text/date constraints and a default-branch manifest whose `dsh.bundle.patch` file exists in the same Git tree. It does not pin an install commit, install dependencies, execute lifecycle scripts, parse the patch or test the plugin.

静态检查核七字段、文件名、分类、文本/日期，以及默认分支 manifest 和同一 Git tree 中的 patch 文件；不锁定安装 commit，不装依赖、不执行脚本、不解析 patch，也不证明插件能跑。

The catalog performs static checks, not an installation, code execution, security audit or quality endorsement. Catalog metadata contributions are **CC0-1.0**; code contributions to that catalog repository are **MIT**. These rules do not require the external plugin itself to adopt MIT; this bridge independently declares MIT, and its backend remains separate.

目录审查不安装、不运行，不提供安全或质量背书。目录元数据贡献适用 CC0-1.0，该目录仓库代码贡献适用 MIT；不等于外部插件强制 MIT。本连接器独立声明 MIT，后端仍分开。

## 5. Optional npm follow-up / npm 仅作可选后续

Only after obtaining an authorized npm publishing identity, checking package-name ownership and completing release validation should a maintainer consider npm publication. Do not fabricate login, ownership, a registry URL, tarball or a successful release.

只有具备合法 npm 发布身份、确认包名权限并完成发布验收后才考虑 npm；不伪造登录、包名归属、下载地址或发布成功。

To offer 1024Store's current one-click route later, publish a complete npm package with its `dsh.bundle` metadata, then verify the directory exposes the correct npm method and install target. Detection and sync can lag; a package existing in the registry is not enough. npm is optional for Git installation and directory admission, not for that npm-only install button.

以后要提供当前 1024Store 一键安装，需发布含 `dsh.bundle` 元数据的完整 npm 包，再读回目录中的 npm 方法与正确安装目标；探测/同步可能滞后，不能只看 npm 上有包。npm 对 Git 安装和目录收录可选，对这颗 npm-only 按钮不可省。

## Evidence to fill after execution / 实测后补证据

| Claim / 声明 | Current record / 当前记录 |
|---|---|
| Current full-suite and syntax checks / 当前全套与语法检查 | Maintainer-run 110/110 passed, 0 failed; check exit 0 / 维护者亲跑 110/110 通过、0 失败，check 退出码 0 |
| Independent offline security review / 独立离线安全复核 | 13+7 cases passed; no new blockers in that scope, not a production-wide guarantee / 13+7 用例通过，本次范围无新阻断，不是生产普遍安全证明 |
| Public reviewed commit / 公开审核提交 | Pending / 待补 |
| Official rc.2 local Host install/load, disable/re-enable / 本地 Host 安装加载及停启 | Exercised / 已做 |
| Native `help`/`status`/`resume`/`download` command RPCs / 原生命令 RPC | Succeeded at the command-call layer; recovery is separate / 命令调用层成功，不等于恢复成功 |
| Third live task and export download / 第三轮真任务与导出下载 | Explicit Codex candidate reached `done`; HTML download 2123 bytes, SHA-256 matched; another export without valid SHA-256 rejected / 显式 Codex 任务 done，下载完整性一致，无有效 SHA 的另一条导出被拒 |
| Browser and HTML interaction / 浏览器与 HTML 交互 | `file://` denied by tool safety policy, not bypassed; buttons untested / file 访问被工具安全策略拒绝，未绕过，按钮未验 |
| Native model-tool execution / 模型工具调用 | An explicit normal-chat request invoked `legion_list` and `legion_status`; matched call/result IDs, both `isError: false`, completed turn. Long status text was Host-pruned, not a lossless-body claim / 普通聊天触发两次真实只读工具调用，回执匹配且无错误，对话完成；长正文被 Host 裁剪，不宣称正文无损 |
| Real recovery / 真实恢复 | Successful recovery of interrupted work remains unverified / 有中断任务时的真实恢复仍未验收 |
| Earlier real failures / 早先真实失败 | Missing planner helper and pre-model CLI startup failure retained in [Plan](PLAN.md); `no recoverable tasks` is not recovery / 旧失败保留，不改记成功 |
| Final package, uninstall and real reverse proxy / 最终包、卸载与实服反代 | Pending; `docs/MARKET.md` added to the package `files` declaration, final payload/link readback still needed / 已补市场文档白名单声明，最终包与链接仍待读回 |
| Public pinned-Git installation / 公开固定 Git 安装 | Not performed / 未执行 |
| Official Git index fetch and installation / 官方 Git 索引读取与安装 | Pending / 待补 |
| 1024 PR, merge and live directory readback / 目录投稿、合并及读回 | Pending / 待补 |
| npm publication / npm 发布 | Not performed; optional / 未执行，可选 |

## Pinned primary sources / 固定一手来源

- [Official package/install guide](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md)
- [Official experimental market bundle](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/packages/experimental/plugin-market-bundle/README.md)
- [Official index format and hosting](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/guide/plugin-market.md)
- [1024Store contribution rules](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/e9f4f56aa42247d6dbf4fd605c29e7e1c9822e73/CONTRIBUTING.md), [entry schema](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/e9f4f56aa42247d6dbf4fd605c29e7e1c9822e73/catalog/schema/plugin.schema.json), [review workflow](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/e9f4f56aa42247d6dbf4fd605c29e7e1c9822e73/.github/workflows/plugin-review.yml)
- [1024Store offered install methods](https://github.com/imsai-sh/dsh-1024store/blob/33cf807bea5331326583458f7744753a2d9912f7/web/worker/lib/install-methods.ts#L174-L195), [npm-only install component](https://github.com/imsai-sh/dsh-1024store/blob/33cf807bea5331326583458f7744753a2d9912f7/web/src/components/InstallMethods.tsx#L22-L50)
- [Community Desktop source contract](https://github.com/anywhere-labs/dsh-desktop/blob/77b01d15361d7112e7163f53c85e601ed82d6320/dsh-community-market/docs/catalog-provider-contract.md), [1024 adapter](https://github.com/anywhere-labs/dsh-desktop/blob/77b01d15361d7112e7163f53c85e601ed82d6320/dsh-community-market/src/adapters/dsh-1024store.ts)

The official source snapshot contains rc.3 development metadata; it is a source reference, not the runtime tested above. The declared and locally exercised Host is npm **`@deepseek-ai/dsh@0.2.1-rc.2`**. The market findings describe the pinned public source commits, not a verified match to every deployed store instance.

官方源码快照含 rc.3 开发元数据，只作源码参考；声明及本地已实测 Host 是 npm **`@deepseek-ai/dsh@0.2.1-rc.2`**。市场结论针对上述固定公开提交，不代表已核实所有线上部署与其字节一致。
