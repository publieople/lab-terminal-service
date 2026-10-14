# skills/stc

`stc` 是 **STC（简明技术性中文，Simplified Technical Chinese）**：一套给 AI 用的中文写作规则、两张词表，加一个能在本地跑的检查器。本仓库把它放在这里，用来审技术文档的写法。

它和 `skills/humanizer-zh/` 分工不同，不互相替代：

| | 管什么 | 什么时候用 |
| --- | --- | --- |
| `skills/humanizer-zh/` | 读起来像不像人写的：空话、重复、模板腔 | 写或改中文散文时 |
| `skills/stc/` | 读起来像不像技术文档：动作、模糊量词、营销词、提醒分级 | 写完通读一遍、审别人稿子时 |

本库具体照做哪些、哪些不适用，写在 [docs/规范/STC对照说明.md](../../docs/规范/STC对照说明.md)。

## 来源与权威

**权威版本只有一个：上游公开仓库 [daimonia-ai/STC-Simplified-Technical-Chinese](https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese)。** 本目录是它的一个提交的逐字副本。

| 用途 | 位置 |
| --- | --- |
| **判定对错的权威** | 上游公开仓库 <https://github.com/daimonia-ai/STC-Simplified-Technical-Chinese> |
| 日常直接读 | 本目录的 `SKILL.md`、`rules/`、`dictionary/` |
| 直接跑检查 | 本目录的 `tools/cli.mjs`（零第三方依赖，Node ≥18） |

## 快照信息

- 对齐的上游提交：`21ec8007cdba765d7d4914395831651a517693f6`（提交时间 2026-10-13），对应 npm 包 `@daimonia/stc` 0.2.3
- 收录 31 个文件，共 172283 字节，UTF-8 文本（**不含本目录的 `README.md` 自身**——它是本库写的说明，不是上游文件，所以不进指纹）
- 聚合 SHA256：`6A24651648EFAF5885A978C296CBA14FFB215DC3C9B3232F468AF3287BB4E700`
  - 算法：按相对路径排序，每个文件取一行 `<相对路径> <该文件 SHA256>`，用换行连接后对整段文本做 SHA256；参与计算的就是上面那 31 个上游文件
- 许可：规则与词表为 [CC BY 4.0](LICENSE)（署名 daimonia-ai）；代码为 [MIT](LICENSE-CODE)

## 收录范围

收录：

- `SKILL.md` —— 技能入口
- `rules/` —— `for-all.md`（通用规则 G1–G22）与四个场景：`for-chat.md`、`for-document.md`、`for-web-dev.md`、`for-instruction-writing.md`
- `dictionary/` —— `avoid.yaml`（不推荐写法）、`recommended.yaml`（推荐写法）、`terms.example.yaml`（术语表示例）、`README.md`
- `tools/` —— `cli.mjs`、`meta.mjs`、`README.md`、`check/`（检查器实现与词表的数据文件）、`init/`、`hooks/`、`build-skill.mjs`、`build-web.mjs`、`skill-files.mjs`

没收录（保持目录干净，需要时去上游看）：

- `WEB.md` —— 上游为网页版生成的整本合并稿，内容与 `rules/`、`dictionary/` 重复
- `ONBOARDING.md`、`snippets/`、`evals/`、`assets/`、`package.json`、`package-lock.json`
- `tools/test/` —— 上游的单元测试

`tools/` 里多收的几个文件不是多余的：`tools/cli.mjs` 用静态 `import` 加载 `tools/init/src/init.mjs`，后者又加载 `tools/skill-files.mjs`。启动链上的文件缺一个，连 `check` 都跑不起来。所以这里保留完整的模块图，而不是只挑检查相关的两个文件。`tools/hooks/` 是 Claude Code 的停止钩子，本仓库不用它。

## 怎么跑

在仓库根目录：

```powershell
node skills\stc\tools\cli.mjs check docs\部门\终端服务部\README.md --profile for-document
```

常用参数：

- `--profile for-document` —— 文档场景；审 `AGENTS.md` 这类给 AI 的指令用 `--profile for-instruction-writing`
- 也可以直接传一个目录，检查会递归
- `--json` 机器可读；`--format markdown` 输出成 Markdown
- `--no-warnings` 只看必须改的；`--max-errors N` 限制输出条数
- 报告里每条都带行号和原文片段，**建议由作者决定是否采用**

检查器不查代码块、行内代码、链接和 `“”` 引用里的文字；在要跳过的那一行**上方**写一行 HTML 注释 `<!-- stc-disable-next-line -->`，检查器会跳过它下面那一行。

## 不要在这里跑 `stc init`

`tools/init/src/init.mjs` 会往 `AGENTS.md` 的 `<!-- stc:start -->` 与 `<!-- stc:end -->` 之间插一段配置。

**本仓库的 `AGENTS.md` 是手写的，不要跑 `stc init`。** 插进去会让 STC 自己生成的那段和手写规则形成两个权威，谁也说不清哪个算数。要加规则就改 `AGENTS.md` 正文，并把依据同步到 `docs/规范/STC对照说明.md`。

## 怎么更新快照

拿上游新版本整份替换本目录受影响的文件，**不要只改其中几段**——保持“这就是上游某个提交的原文件”这件事成立。然后同步改上面的提交号、文件数、总字节数和聚合 SHA256。

`tools/check/data/` 里的两个 JSON 由 `dictionary/` 的 YAML 生成（生成脚本 `tools/check/scripts/build-data.mjs`，需要 `yaml` 包）。本仓库不装 `node_modules`，所以改词表要回上游改，或者本地临时装 `yaml` 重跑生成脚本。

## 边界

STC 是本仓库的**审稿对照表和自查工具，不是 CI 门**。它的语料以产品说明书为主，我们的页面里混着课程、复盘、招新介绍，有些规则在这里不成立（例如文档场景要求主语写名称、不写“我们”，本库的复盘和介绍页照旧用“我们”）。哪些照做、哪些不适用、为什么，都写在 [docs/规范/STC对照说明.md](../../docs/规范/STC对照说明.md)。

它和 `humanizer-zh` 一样**只改表达**：不动 YAML front-matter、标题文字与层级、代码块、命令、路径、URL、链接目标和显式 ID，也不往正文里加原本没有的事实、数字和日期。两条相撞时，以“不新增事实、不削弱安全提示”为准。
