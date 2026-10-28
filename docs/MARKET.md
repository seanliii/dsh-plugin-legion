# Installation and publication / 安装与发布路线

当前是否已发布、实装或收录，只以[状态表](PLAN.md)为准。以下是操作路线和模板，不是完成声明。

## 分清三种分发方式

| 路线 | 提供什么 | npm 是否必需 |
|---|---|---|
| 官方 CLI 固定 Git 提交 | 从已审查的公开提交手动安装，不是市场收录。 | 不要求将此包发布到 npm；依赖获取仍可能联网。 |
| 官方 Discover 自托管索引 | 用户添加可信索引，安装其中声明的 Git 来源。 | Git 来源不要求此包先发 npm。 |
| 社区目录／1024Store | 提交一份目录 JSON；无 npm 可 **browse-only（仅浏览仓库）** 收录。 | 不是投稿前提；一键安装以商店实际提供的方式为准。 |

社区目录、姐妹站安装界面与官方管理器是不同系统。已保存的姐妹站源码中，常规安装按钮主要提供 npm 路线；底层官方 CLI／命令转发不能概括成“npm-only”。GitHub 元数据也不证明有 Git 一键按钮。不要把来源说明、按钮存在、实际安装或官方背书混为一谈。

## 固定 Git 安装

**先有真实公开仓库和经过审查的提交，再使用此模板。** 将占位符换为实际公开的完整 40 位 SHA，并选择自己的 profile：

```sh
dsh plugin --profile web -w add 'github:seanliii/dsh-plugin-legion#<PUBLIC_FULL_COMMIT_SHA>'
```

保留 `-w`。提交中必须已有可运行 JavaScript、`package.json` 和 `dsh.bundle.patch` 指向的 patch 文件；不能依赖缺失的构建产物。模板中的目标地址不是“仓库已发布”的证明。

已有本地副本或 `legion_bundle` 生成包时，使用[原生本地安装](ECOSYSTEM.md#native-installation)：`target` 为 `file:` 加绝对目录，新装保持 `enabled:false`。这与公开发布是不同操作。

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
    "en": "Discover DSH tools and public GitHub source, package author-adapted capabilities as independently switchable plugins, and optionally collaborate with a personal Legion service.",
    "zh": "发现 DSH 工具和公开 GitHub 源码，将作者已适配的能力包装为可独立启停的插件，并可选接入个人 Legion 服务协作。"
  },
  "added": "<YYYY-MM-DD>"
}
```

不要额外添加 `source`、`npm`、SHA 或 `rights` 字段，`repository` 保持仓库根 URL。目录元数据贡献采用 **CC0-1.0**，该目录的代码贡献采用 MIT；这不重新许可外部插件。连接器的 MIT 声明也不是上游分发权保证。

目录仓库的 `npm run plugin:review` 对应 `scripts/review-plugin-submission.mjs`；完整审查还需要 PR/base/head 和 GitHub API 上下文，单独解析 JSON 不等于它已通过。非 draft、仅新增一条且通过 `Plugin submission review / static-review` 的 PR，在此快照的流程中会自动 squash merge；更新或删除需维护者审阅。

审查只检查材料和必要文件，不安装、构建、执行或评判第三方代码。发布、提交 PR、检查通过、合并、网站收录与真实安装分别确认。公开 Git 仓库可以满足无 npm 投稿的来源条件，**不是只要 push 就自动收录**。

## 分发内容与许可

只发布此独立连接器、合法依赖声明、许可和公开文档；不包含后端、私有证据／日志／凭据、用户产物或另行生成的示例包。最终 Git tree、npm 文件名单及包内链接须与真正发布的字节一致。

npm 发布是可选路线，需要实际包名与发布权限；已获项目发布授权不代替这些事实。若选择 npm，发布后还需核对实际包内容及商店提供的安装目标，不能由 registry 条目推断同步完成。

## 已核规则出处

本页复用固定源码，不声称本轮重新抓取了线上规则或验证了商店界面。正式投稿前只需复核届时差异：

- 社区目录 `50684e4cde55722da7c6d19cf771b7e412b44ae2`：[CONTRIBUTING](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/50684e4cde55722da7c6d19cf771b7e412b44ae2/CONTRIBUTING.md)、[schema](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/50684e4cde55722da7c6d19cf771b7e412b44ae2/catalog/schema/plugin.schema.json)、[review workflow](https://github.com/imsai-sh/awesome-deepseek-harness-plugins/blob/50684e4cde55722da7c6d19cf771b7e412b44ae2/.github/workflows/plugin-review.yml)。CONTRIBUTING blob：`40a6acc056484b3b315a5df37cce92a75fcc35d4`。
- 姐妹站 `0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9`：[安装方法](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/web/worker/lib/install-methods.ts)、[原生命令分支](https://github.com/imsai-sh/dsh-1024store/blob/0061a79c02c4f1cdcb9ba22f5b4b7c63220f65e9/plugin/src/routes.ts)。
- 官方参考快照：[包发布](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/develop/basic/publish.md)、[市场索引](https://github.com/deepseek-ai/deepseek-harness/blob/22ddee3792402c3e70ec5f86a63c3e3e895a2f60/docs/user/guide/plugin-market.md)。该源码快照含较新开发元数据；本插件运行契约以安装的 **npm rc.2** 为准。
