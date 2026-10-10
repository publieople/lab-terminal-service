# skills/humanizer-zh

`humanizer-zh` 是编辑中文表达用的 Agent Skill：去掉空话、重复和模板腔，同时保留事实、确定程度和作者声音。本仓库把它作为一个**可选的处理步骤**放在这里，让改文档的人（和 agent）有统一的口径可依。

## 怎么用

改本仓库的中文正文之前，先拿到它的规则正文，再动手。三处来源，优先级从高到低：

| 顺序 | 来源 | 说明 |
| --- | --- | --- |
| 1 | OpenViking：`viking://agent/skills/humanizer-zh/SKILL.md` | 权威版本，会更新。DSH 里也可以直接 `skill` 工具加载 `humanizer-zh` |
| 2 | 本目录的 `SKILL.md` | 离线兜底快照，供读不到 OpenViking 的 agent（Claude Code、Cursor 等）使用 |
| 3 | 上游 <https://github.com/op7418/Humanizer-zh> | 原始出处 |

三处不一致时**以 OpenViking 为准**，并顺手把本目录的快照更新到一致，在提交信息里写清楚。

读不到任何一处时，如实说明"humanizer-zh 的正文没读到"，不要凭印象编一套规则继续改。

## 快照信息

- 快照日期：2026-10-10
- 技能 revision：`2026-09-23`
- 上游项目：[op7418/Humanizer-zh](https://github.com/op7418/Humanizer-zh)（MIT，Copyright (c) 2026 歸藏）
- 规则正文沿革：基于 [blader/humanizer v3.0.0](https://github.com/blader/humanizer/blob/v3.0.0/SKILL.md) 与 [Humanizer-zh PR 39](https://github.com/op7418/Humanizer-zh/pull/39) 的结构修订，参考 [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop)

## 许可

本目录内容来自上游，按 **MIT** 授权（见同目录 `LICENSE`）。本仓库其余内容按 CC BY-SA 4.0 授权，两者互不影响。

## 边界

它**只改表达**，不判断文本是不是 AI 写的，也不保证通过任何检测器。它不动 YAML front-matter、标题文字与层级、代码块、命令、路径、URL、链接目标，也不往正文里加原本没有的事实、数字和日期——这些边界在 `SKILL.md` 里写得比这里细，以那份为准。
