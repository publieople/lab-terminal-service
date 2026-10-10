---
title: Windows 常用软件
type: 学习课程
部门: 终端服务部
维护人: publieople
更新: 2026-10-10
状态: 草稿
可见性: 公开
tags: [学习课程, Windows, 工具]
---

# Windows 常用软件

## 一、课程定位

装完系统只是拿到一台空机器，"能干活"还差一套工具。这门课给出一份**最小可用集合**：够用、能一条命令装回来、出问题查得到资料。

清单不追求长。判断一个软件该不该装，用下面三条标准：

1. **免费或开源优先**——部门机器和个人电脑都能装，不制造授权麻烦；
2. **能在 `winget` 里装**——重装系统后一条命令恢复，不用满网找安装包；
3. **出问题搜得到答案**——有文档、有社区，遇到报错不至于只能等卖家回复。

按这三条，很多"很有名"的软件会被筛掉，这不是遗漏，是刻意为之。

---

## 二、面向对象

- 刚拿到电脑、还没配过工作环境的新成员；
- 重装系统之后想不起来自己装过什么的人；
- 电脑上软件很杂，想换成一套能长期用的组合的人。

---

## 三、前置知识

《[Windows 基本操作](Windows基本操作.md)》，尤其是 `winget` 的用法那一节。

装软件本身不需要技术基础，但**卸载残留、`PATH`、开机启动项**这三件事必须知道，否则会出现"装了却不能用""越装越卡"。

---

## 四、学习目标

学完应当能：

1. 说出清单里每个软件解决什么问题，也说得出**什么情况下不需要装**；
2. 用 `winget` 把清单里的软件装齐，并整理成一个可重复执行的安装脚本；
3. 识别"看起来能用、实际会带来麻烦"的软件来源；
4. 给自己定一条更新习惯，例如每月执行一次 `winget upgrade --all`。

---

## 五、知识模块

下面每条的"安装"一栏都是**已经在本机核对过包 ID 能用**的命令。核对不到的软件会注明走官网安装包。

### 5.1 文件与效率

| 软件 | 解决什么问题 | 安装 |
| --- | --- | --- |
| PowerToys | 微软官方的小工具合集：窗口分屏布局、批量重命名、取色、快捷键速查、Run 启动器 | `winget install --id Microsoft.PowerToys --exact` |
| Everything | 按文件名全盘搜索，输入即出结果。Windows 自带搜索在文件多的时候慢到没法用 | `winget install --id voidtools.Everything --exact` |
| OneCommander | 双栏文件管理器，带标签页、快速预览。整理大量文件时比资源管理器省一半操作 | `winget install --id MilosParipovic.OneCommander --exact` |
| AutoHotkey | 把重复操作写成快捷键脚本，例如"一键把选中的路径转成反斜杠" | `winget install --id AutoHotkey.AutoHotkey --exact` |
| UniGetUI | 图形界面的包管理器，把 winget / Scoop / Chocolatey / pip / npm 收在一个窗口里，看得到装了什么、哪些能升级 | 官网安装包（`winget search` 里没搜到同名包） |
| Quicker / PixPin（选装） | 快捷动作面板 / 带贴图与 OCR 的截图工具。两个都很有用，但 `winget` 里没有，走官网安装包 | 官网安装包 |

### 5.2 终端与开发

| 软件 | 解决什么问题 | 安装 |
| --- | --- | --- |
| Windows 终端 | 系统自带的终端宿主，支持标签页与分屏。系统已带，保持更新即可 | 应用商店更新 |
| PowerShell 7 | 跨平台的新版 PowerShell，语法与体验都比系统自带的 5.1 好 | `winget install --id Microsoft.PowerShell --exact` |
| Oh My Posh | 给提示符加信息层：当前目录、Git 分支、耗时、退出码 | `winget install --id JanDeDobbeleer.OhMyPosh --exact` |
| Yazi | 终端里的文件管理器，键盘操作、可预览图片与文本 | `winget install --id sxyazi.yazi --exact` |
| Git | 版本控制，也是这个知识库的工作方式 | `winget install --id Git.Git --exact` |
| GitHub CLI | 在终端里建仓库、提 PR、看 CI 结果，不用切浏览器 | `winget install --id GitHub.cli --exact` |
| Node.js | 前端工具链与大量命令行工具的运行时 | `winget install --id OpenJS.NodeJS --exact` |
| Rustup | Rust 工具链安装器，顺带带来一批用 Rust 写的命令行工具 | `winget install --id Rustlang.Rustup --exact` |
| VS Code | 默认编辑器：写代码、写文档、改配置都用它 | `winget install --id Microsoft.VisualStudioCode --exact` |
| Visual Studio Community | 需要 .NET / C++ 桌面或调试场景时才装，体积大，日常不必装 | `winget install --id Microsoft.VisualStudio.2022.Community --exact` |
| Docker Desktop | 本机跑容器。要跟着部署类文档动手时再装 | `winget install --id Docker.DockerDesktop --exact` |

### 5.3 网络与远程

| 软件 | 解决什么问题 | 安装 |
| --- | --- | --- |
| Tailscale | 把设备接进实验室组网，之后按内网地址直接访问 | `winget install --id Tailscale.Tailscale --exact` |
| RustDesk | 远程桌面，**可以自建中转服务器**；不想让画面经过第三方时选它 | 官网安装包 |
| 远程协助工具（ToDesk / UU 远程等，选装） | 临时帮别人看屏幕。`winget` 里没有，走官网安装包 | 官网安装包 |

一条原则：**实验室内部的机器优先走组网**，能自己连就不用第三方远程桌面——多一个中转，就多一份说不清的暴露面。

### 5.4 创作与录屏

| 软件 | 解决什么问题 | 安装 |
| --- | --- | --- |
| OBS Studio | 录屏与直播，课程录制、演示录制都用它 | `winget install --id OBSProject.OBSStudio --exact` |

更重的剪辑软件（DaVinci Resolve、Premiere 等）只在确有产出需求时装，且它们不在 `winget` 里，装之前先确认显卡与磁盘空间。

### 5.5 安全

Windows 自带的 Defender 对个人机已经够用。要装第三方（例如火绒）就**只留一个**：两个杀毒软件同时常驻会互相扫描，机器明显变慢，还可能出现互相隔离对方文件的情况。

第三方安全软件通常不在 `winget` 里，走官网安装包。

### 5.6 硬件检测与驱动

| 工具 | 解决什么问题 | 安装 |
| --- | --- | --- |
| 图吧工具箱 | 硬件信息、硬盘健康（SMART）、内存与显卡测试、烤机工具打包在一起，新到的机器先跑一遍能省很多猜测 | 官网安装包 |

驱动一律从**厂商官网或系统更新**装，不要用第三方"驱动包"：装错了轻则蓝屏，重则要重装系统，而收益只是省了几分钟。

### 5.7 不建议装的几类

| 类别 | 为什么 |
| --- | --- |
| 破解版与来源不明的"绿色版" | 捆绑安装、挖矿、后门都在这一类里，出事代价远大于省下的钱 |
| 外设灯效与厂商全家桶 | 只服务硬件外观，常驻进程多，装完就没人再打开 |
| 功能重复的同类软件 | 两个杀软、两个下载器、两个压缩软件会互相抢默认关联，出问题说不清是谁 |
| 需要长期付费授权的专业软件 | 除非课程或项目明确要用，先不装，避免机器变成授权过期的负担 |

### 5.8 装完之后的收尾

- 把命令行工具所在目录加进 `PATH`，否则"装了但敲不出来"；
- 常用工具固定到任务栏或 `Win + X` 菜单，减少找图标的时间；
- 设好默认程序：浏览器、编辑器、播放器各一个；
- 用 `winget list` 存一份当前清单，重装系统后照着装。

---

## 六、实践内容

1. **装齐**：从清单里至少挑六个软件，全部用 `winget` 完成安装，不允许手动下载安装包。
2. **脚本化**：把用到的命令整理成一份 `setup.ps1`，在一台干净机器或新用户下执行一遍，验证能复现。
3. **更新**：执行一次 `winget upgrade --all`，记录更新前后的版本号。
4. **收尾**：回到《[Windows 基本操作](Windows基本操作.md)》的 5.4 节，检查开机启动项，把没必要自启的关掉。

---

## 七、项目衔接

- 下一步：[终端环境与配置](../技术模块/终端环境与配置.md)——把上面这些拼成一套顺手的终端。
- 组网部分与[技术模块：Tailscale 组网](../技术模块/Tailscale组网.md)对接。
- `setup.ps1` 与软件清单一类的东西适合放进版本库（内部库或你自己的 dotfiles），重装系统时能直接复用。
