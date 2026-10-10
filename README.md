# 终端服务部 · 知识库

**上海中侨大学 · 人工智能学院 · 具身智能研究所** —— 终端服务部

实验室**终端服务部**的部门知识库与站点。内容按《[实验室技术知识库文档写入规范](docs/规范/文档写入规范.md)》组织。

实验室主书（[Xinlanmy/laboratory-knowledge-base](https://github.com/Xinlanmy/laboratory-knowledge-base)）是一本**总目录**：它只登记各部门仓库的链接与元数据，**不复制正文**。我们的正文就留在这里，登记方式见 [并入主书说明.md](并入主书说明.md)。

> 站点：<https://publieople.github.io/lab-terminal-service/>

---

## 一、我们是做什么的

终端服务部负责实验室的**基础设施**与 **Agent 能力**，具体分六块：

| # | 职责 | 一句话 |
| --- | --- | --- |
| 1 | 服务器与算力 | 让实验室的机器跑得起来、随时算得出结果 |
| 2 | 网络与设备互联 | 让任何设备在任何网络下都能互相找到 |
| 3 | Agent 平台与工具链 | 让 Agent 在实验室里可用、可管、可交接 |
| 4 | ComfyUI 与生成式工作流 | 让图像/视频生成能力变成部门可用的服务 |
| 5 | 边缘设备 Agent 部署 | 把 Agent 落到机器狗、机械臂这类设备上 |
| 6 | 账号、权限与数据服务 | 谁来用、能用什么、数据放哪、怎么备份 |

完整说明见 **[部门介绍](docs/部门/终端服务部/README.md)**；要找我们办事请看 **[职责与服务目录](docs/部门/终端服务部/职责与服务目录.md)**。

---

## 二、快速入口

| 我想…… | 去哪 |
| --- | --- |
| 知道终端服务部是干什么的 | [部门介绍](docs/部门/终端服务部/README.md) |
| 申请服务器 / 网络 / 设备接入，或报故障 | [提一个服务请求 Issue](https://github.com/publieople/lab-terminal-service/issues/new/choose) |
| 查某个技术怎么用 | [技术模块索引](docs/部门/终端服务部/技术模块/README.md) |
| 新成员想上手 | [学习课程](docs/部门/终端服务部/学习课程/README.md) |
| 看我们踩过哪些坑 | [技术经验](docs/部门/终端服务部/技术经验/README.md) |
| 改一篇文档 / 新增一篇 | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 知道哪些信息还没填写 | [待补事实](docs/部门/终端服务部/待补事实.md) |

---

## 三、仓库结构

```text
lab-terminal-service/
├─ README.md                 ← 你在这里
├─ CONTRIBUTING.md           15 分钟上手：怎么改、怎么加（给人看）
├─ AGENTS.md                 改这个仓库的约定（给 AI 看：先加载 humanizer-zh）
├─ SCHEMA.md                 LLM 可读的内容契约（给主书/LLM wiki 用）
├─ 并入主书说明.md             与实验室主书的对接契约（怎么登记、以后怎么改）
├─ SUMMARY.md                GitBook 用的目录
├─ mkdocs.yml                渲染入口 ①（当前站点用的就是它）
├─ .gitbook.yaml             渲染入口 ②（GitBook Git Sync）
├─ docs/
│  ├─ index.md               站点首页
│  ├─ 规范/                   文档写入规范（主书层内容，不属于部门章）
│  └─ 部门/终端服务部/         ★ 部门章：本仓库的知识内容主体
├─ _templates/               8 个写作模板
├─ _schema/                  front-matter 校验规则
├─ scripts/                  校验与合并演练脚本
├─ skills/humanizer-zh/      中文表达编辑 Skill（第三方，MIT）
├─ assets/                   图片
└─ raw/                      原始素材（会议记录、聊天记录、厂商手册）
```

**关键约定**：知识内容**全部**在 `docs/部门/终端服务部/` 这一棵子树里，其余文件都是仓库自身的说明、工具与素材。这棵子树保持**自包含**——内部零外部链接——于是它随时可以整棵搬去别的地方（例如主书哪天改成直接收纳正文）而不产生断链。

---

## 四、参与进来

**只想提需求** → 直接建 Issue，用「服务请求」模板，不用读任何文档。

**想改文档** → 读 [CONTRIBUTING.md](CONTRIBUTING.md)，全程 15 分钟。

**想新增一篇**（推荐用脚本，它会自动盖好 front-matter）：

```powershell
node scripts/new.mjs 技术模块 docs/部门/终端服务部/技术模块/新模块名
```

**本地预览站点**：

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-docs.txt
.\.venv\Scripts\mkdocs serve
```

---

## 五、公开与内部的边界

本仓库是**公开**的。内网信息一律不进这里。

| 内容 | 本仓库（公开） | 内部库（私有） |
| --- | --- | --- |
| 制度、流程、服务目录、申请方式 | ✅ | |
| 技术模块（通用方法、命令、踩坑） | ✅ | |
| 学习课程、新人上手路径 | ✅ | |
| 服务器台账（IP / 端口 / 归属） | ❌ | ✅ |
| 真实网络拓扑、设备名、tailnet 域名 | ❌ | ✅ |
| 凭据（**任何仓库都不存明文**） | ❌ | 只写"在哪、谁管" |
| 故障复盘 | 脱敏结论版 | 原始日志版 |

公开页面里凡涉及内网细节处，会写成 `内部细节见内部库 <路径>` 的占位，而不是给出真实值。

提交前自检：

```powershell
node scripts/check-secrets.mjs
```

---

## 六、许可

文档默认采用 **CC BY-SA 4.0**（署名—相同方式共享）。这是建议值，**待实验室确认**；确认前请勿对外二次分发。见 [LICENSE](LICENSE)。

例外：`skills/humanizer-zh/` 是第三方内容，按 **MIT** 授权，不适用 CC BY-SA 4.0，详见该目录下的 LICENSE 与 [说明](skills/humanizer-zh/README.md)。
