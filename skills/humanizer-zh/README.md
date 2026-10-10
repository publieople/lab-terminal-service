# skills/humanizer-zh

`humanizer-zh` 是编辑中文表达用的 Agent Skill：去掉空话、重复和模板腔，同时保留事实、确定程度和作者声音。本仓库把它放在这里，让改文档的人（和 agent）有统一的口径可依。

## 来源与权威

**权威版本只有一个：上游公开仓库 [op7418/Humanizer-zh](https://github.com/op7418/Humanizer-zh)。** 本目录和其他任何地方放的都是副本。

| 用途 | 位置 |
| --- | --- |
| 判定对错的权威 | 上游公开仓库 <https://github.com/op7418/Humanizer-zh> |
| 日常直接读 | 本目录的 `SKILL.md`（上游某个提交的逐字副本） |
| DSH 里图省事 | 本机 OpenViking 副本 `viking://agent/skills/humanizer-zh/SKILL.md` |

OpenViking 是我们自己部署的，读起来方便，但它可能滞后，也可能被人改过——**它不算权威版本**。谁和上游不一致，就以上游为准，并把本目录的快照更新到一致。

## 快照信息

- 对齐的上游提交：`f4518a8eab97b8bfebc66a89d34320a89bef6930`（提交时间 2026-09-23）
- 文件：20527 字节，409 行，UTF-8 无 BOM，换行 LF
- SHA256：`95627FD4437D886F98032CCC62D79136E6310F1FC04E354BB86431795FF206DF`
- 许可：[MIT](LICENSE)，Copyright (c) 2026 歸藏
- 规则正文沿革：基于 [blader/humanizer v3.0.0](https://github.com/blader/humanizer/blob/v3.0.0/SKILL.md) 与 [Humanizer-zh PR 39](https://github.com/op7418/Humanizer-zh/pull/39) 的结构修订，参考 [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)

## 怎么更新快照

拿上游的新版本和本目录 `SKILL.md` 比一下，确认要升级后**整份替换**，不要只改其中几段——保持"这就是上游某个提交的原文件"这件事成立。然后同步改上面的提交号、字节数、行数和 SHA256。

上游可能只改了 YAML front-matter 的写法（`allowed-tools` 用列表还是空格分隔、`revision` 用单引号还是双引号），正文没动。这种差异也要如实对齐：快照就是上游原文件，格式不按本仓库的习惯改。

## 边界

它**只改表达**，不判断文本是不是 AI 写的，也不保证通过任何检测器。它不动 YAML front-matter、标题文字与层级、代码块、命令、路径、URL、链接目标，也不往正文里加原本没有的事实、数字和日期——这些边界在 `SKILL.md` 里写得比这里细，以那份为准。
