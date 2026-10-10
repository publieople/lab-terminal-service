---
title: VS Code 高效使用
type: 学习课程
部门: 终端服务部
维护人: publieople
更新: 2026-10-10
状态: 草稿
可见性: 公开
tags: [学习课程, VS Code, 效率工具]
---

# VS Code 高效使用

> 现代开发者的生产力引擎 —— 从入门到精通的完整工作流。

## 一、课程定位

这门课要补的是一个很小、但影响面极大的缺口：**你每天要在编辑器里待好几个小时，编辑器不顺手，后面每一门课都跟着慢。**

实验室成员的工作里，读别人的代码、改自己的代码、写文档这三件事占了很大比重，而它们全都经过同一个界面——代码编辑器。VS Code 免费、跨平台、扩展生态最全，还能直接连远程服务器，是实验室的默认编辑器，所以「把 VS Code 用顺」不是一门选修课，是基本功。

具体要填的坑有这么几类：

- **只会用鼠标**：改十处相同的变量名要点二十次，选一整行要用鼠标拖，这些动作原本都有快捷键。
- **不会用命令面板**：找设置靠菜单一层层点，其实 `Ctrl + Shift + P` 一个入口就能搜到几乎所有命令。
- **没有自己的配置**：换一台机器就重新适应默认设置，代码风格也没法统一。
- **不会调试、不看差异**：出了问题只会临时加打印，改过哪些文件全靠记忆。

为什么单独开一门课，而不是顺手塞进技术模块？因为技术模块回答的是「这门技术怎么用」，而编辑器不是一门技术，它是**所有技术的入口**——内容横跨快捷键、配置、插件、调试、版本控制，塞进任何一个技术模块都会显得突兀。它同时也是新人上手路径里最早要用到的东西。

---

## 二、面向对象

**要学的人**：所有需要用编辑器写代码或写文档的成员。判断标准很直接——如果你每天打开 VS Code 超过半小时，这门课就值得花时间。

具体包括：

- 刚进实验室、之前只用过记事本的人。
- 已经会写代码，但操作基本靠鼠标、效率靠加班的人。
- 要参与知识库写作、需要长期和 Markdown 打交道的人。

**可以跳过的人**：已经有一套自己的快捷键与插件配置，能不看鼠标完成常见的多光标编辑与文件跳转的人。这类成员建议只看「个性化配置」和「高级工作流」两节，对照检查有没有漏掉的项。

---

## 三、前置知识

这一节的起点非常低，**唯一的前提是会基本操作电脑**：

- 会安装并启动一个 Windows 程序。
- 会使用键盘和鼠标，知道复制/粘贴是什么。
- 知道文件、文件夹、路径的概念——知道「这个文件在哪个目录下」是什么意思。

自检方式：能在自己的电脑上新建一个文件夹，在里面新建一个文本文件，保存后用记事本重新打开它。能完成这四步就可以开始。

不需要编程基础，也不需要先学 Linux 或 Git——课里用到命令行和版本控制的地方都会单独交代。学完之后接哪几门课，写在第七节。

---

## 四、学习目标

学完这门课，你应该能做到下面这些事。每一条都可以当场演示：

- **不看鼠标完成常用编辑**：选中整行、上下移动整行、复制整行、在单词之间跳光标、删除一个单词——全部用键盘完成。
- **用命令面板代替菜单**：要装扩展、改设置、跑命令时，第一反应是 `Ctrl + Shift + P`，而不是在菜单里一层层找。
- **配置出一套自己的工作区**：知道设置改在哪、怎么同步到另一台机器、怎么给单个项目单独设配置。
- **用多光标批量改代码**：给一批相同的变量名同时改名，或者在一批行的末尾同时补内容。
- **会用编辑器自带的能力**：智能补全、行内调试、Git 差异对比、集成终端。
- **按需装扩展**：知道自己这个方向该装哪几个扩展，懂得定期清理不用的，也知道扩展冲突时怎么定位。
- **遇到问题能自己查**：知道官方快捷键表、官方文档和扩展市场分别在哪，查得到答案。

---

## 五、知识模块

这一节是课程主体。模块按「先能打开 → 再能操作 → 再能配置 → 最后接自动化」排列，后面的模块基本都要用到前面模块里的操作：

| 顺序 | 模块 | 建议投入 |
| --- | --- | --- |
| 1 | 概述、快速开始 | 15 分钟 |
| 2 | 核心快捷键 | 1～2 小时，之后长期复习 |
| 3 | 个性化配置 | 30 分钟 |
| 4 | 核心功能详解 | 1 小时 |
| 5 | 扩展生态系统 | 40 分钟 |
| 6 | 高级工作流 | 1 小时 |
| 7 | AI 辅助开发 | 30 分钟 |
| 8 | 搜索与导航 | 30 分钟 |
| 9 | 故障排除 | 按需查，建议先通读一遍 |
| 10 | 学习资源、最佳实践清单、更新与维护 | 20 分钟，当作参考资料 |

其中「核心快捷键」是唯一需要反复回来复习的一节——快捷键记不住很正常，用一次查一次，用上两周自然会形成肌肉记忆。

以下各小节按原文档原样搬运，小节标题保持不变。

### 概述

Visual Studio Code（简称 VS Code）是微软推出的免费、开源、跨平台的现代化代码编辑器。它集成了智能代码补全、调试、Git 版本控制、终端等核心功能，并通过丰富的扩展生态系统支持几乎所有编程语言和开发场景。

本指南旨在帮助开发者快速掌握 VS Code 的核心功能，构建高效的工作流，提升开发效率。

### 快速开始

#### 安装与配置

##### 1. 下载安装

- **官网**：[code.visualstudio.com](https://code.visualstudio.com)
- **平台支持**：Windows、macOS、Linux
- **安装选项**：稳定版（Stable）和预览版（Insiders）

##### 2. 中文界面（可选）

1. 打开命令面板（`Ctrl + Shift + P`）
2. 搜索 "Configure Display Language"
3. 选择 "zh-cn" 并重启

### 核心快捷键

#### 1、工作区快捷键

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| **Cmd + Shift + P** | **Ctrl + Shift + P**，F1 | 显示命令面板 | |
| **Cmd + B** | **Ctrl + B** | 显示/隐藏侧边栏 | 很实用 |
| `Cmd + \` | `Ctrl + \` | **拆分为多个编辑器** | 【重要】抄代码利器 |
| **Cmd + 1、2** | **Ctrl + 1、2** | 聚焦到第 1、第 2 个编辑器 | 同上重要 |
| **Cmd + +、Cmd + -** | **Ctrl + +、Ctrl + -** | 将工作区放大/缩小（包括代码字体、左侧导航栏） | 在投影仪场景经常用到 |
| Cmd + J | Ctrl + J | 显示/隐藏控制台 | |
| **Cmd + Shift + N** | **Ctrl + Shift + N** | 重新开一个软件的窗口 | 很常用 |
| Cmd + Shift + W | Ctrl + Shift + W | 关闭软件的当前窗口 | |
| Cmd + N | Ctrl + N | 新建文件 | |
| Cmd + W | Ctrl + W | 关闭当前文件 | |

#### 2、跳转操作

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| **Cmd + \`** | 没有 | 在同一个软件的**多个工作区**之间切换 | 使用很频繁 |
| **Cmd + Option + 左右方向键** | Ctrl + Pagedown/Pageup | 在已经打开的**多个文件**之间进行切换 | 非常实用 |
| Ctrl + Tab | Ctrl + Tab | 在已经打开的多个文件之间进行跳转 | 不如上面的快捷键快 |
| Cmd + Shift + O | Ctrl + Shift + O | 在当前文件的各种**方法之间**（符号：Symbol）进行跳转 | |
| Cmd + T | Ctrl + T | 在当前**工作区**的各种方法之间（符号：Symbol）进行跳转 | |
| Ctrl + G | Ctrl + G | 跳转到指定行 | |
| `Cmd + Shift + \` | `Ctrl + Shift + \` | 跳转到匹配的括号 | |

#### 3、移动光标

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| 方向键 | 方向键 | 在**单个字符**之间移动光标 | 大家都知道 |
| **option + 左右方向键** | **Ctrl + 左右方向键** | 在**单词**之间移动光标 | 很常用 |
| **Cmd + 左右方向键** | **Fn + 左右方向键**（或 Win + 左右方向键） | 将光标定位到当前行的最左侧、最右侧（在**整行**之间移动光标） | 很常用 |
| **Option + Alt + 左右方向键** | **Alt + Shift + 左右方向键** | 左右扩大/缩小选中的范围 | 很酷，极为高效 |
| Cmd + ↑ | Ctrl + Home | 将光标定位到文件的第一行 | |
| Cmd + ↓ | Ctrl + End | 将光标定位到文件的最后一行 | |
| Cmd + Shift + \ | | 在**代码块**之间移动光标 | |

#### 4、编辑操作

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| Cmd + C | Ctrl + C | 复制 | |
| Cmd + X | Ctrl + X | 剪切 | |
| Cmd + V | Ctrl + V | 粘贴 | |
| **Cmd + Enter** | **Ctrl + Enter** | 在当前行的下方新增一行，然后跳至该行 | 即使光标不在行尾，也能快速向下插入一行 |
| Cmd + Shift + Enter | Ctrl + Shift + Enter | 在当前行的上方新增一行，然后跳至该行 | 即使光标不在行尾，也能快速向上插入一行 |
| **Option + ↑** | **Alt + ↑** | 将代码向上移动 | 很常用 |
| **Option + ↓** | **Alt + ↓** | 将代码向下移动 | 很常用 |
| Option + Shift + ↑ | Alt + Shift + ↑ | 将代码向上复制一行 | |
| **Option + Shift + ↓** | **Alt + Shift + ↓** | 将代码向下复制一行 | 写重复代码的利器 |

另外再补充一点：将光标点击到某一行的任意位置时，默认就已经是**选中全行**了，此时可以直接**复制**或**剪切**，无需点击鼠标。这个非常实用，是所有的编辑操作中，使用得最频繁的。它可以有以下使用场景：

- 场景 1：假设光标现在处于第 5 行的**任意位置**，那么，直接依次按下 `Cmd + C` 和 `Cmd + V`，就会把这行代码复制到第 6 行。继续按 `Cmd + C` 和 `Cmd + V`，就会把这行代码复制到第 7 行。copy 代码 so easy。
- 场景 2：假设光标现在处于第 5 行，那么，先按下 `Cmd + C`，然后按两下 `↑` 方向键，此时光标处于第 3 行；紧接着，继续按下 `Cmd + V`，就会把刚刚那行代码复制到第 3 行，原本处于第 3 行的代码会整体**下移**。

你看到了没？上面的两个场景，我全程没有使用鼠标，只通过简单的复制粘贴和方向键，就做到了如此迅速的 copy 代码。你说是不是很高效？

#### 5、删除操作

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| Cmd + Shift + K | Ctrl + Shift + K | 删除整行 | 「Cmd + X」的作用是剪切，但也可以删除整行 |
| **option + Backspace** | **Ctrl + Backspace** | 删除光标之前的一个单词 | 英文有效，很常用 |
| option + delete | Ctrl + delete | 删除光标之后的一个单词 | |
| **Cmd + Backspace** | | 删除光标之前的整行内容 | 很常用 |
| Cmd + delete | | 删除光标之后的整行内容 | |

备注：上面所讲到的移动光标、编辑操作、删除操作的快捷键，在其他编辑器里，大部分都适用。

#### 6、多光标选择/多光标编辑

多光标选择在编程的**提效**方面可谓立下了汗马功劳。因为比较难记住，所以你要时不时回来复习这一段。

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| **Option + 鼠标连续点击任意位置** | **Alt + 鼠标连续点击任意位置** | 在任意位置，同时出现多个光标 | 很容易记住 |
| Cmd + D | Ctrl + D | 将光标放在某个单词的位置（或者先选中某个单词），然后反复按下「**Cmd + D**」键，即可将下一个相同的词逐一加入选择。 | 较常用 |
| **Cmd + Shift + L** | **Ctrl + Shift + L** | 将光标放在某个单词的位置（或者先选中某个单词），然后按下快捷键，则所有的相同内容处，都会出现光标。 | 很常用。比如变量重命名的时候，就经常用到 |

#### 7、多列选择/多列编辑

多列选择是更高效的多光标选择，所以单独列成一小段。

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| Cmd + Option + 上下键 | Ctrl + Alt + 上下键 | 在连续的多列上，同时出现多个光标 | 较常用 |
| Option + Shift + 鼠标拖动 | Alt + Shift + 鼠标拖动 | 按住快捷键，然后把鼠标从区域的左上角拖至右下角，即可在选中区域的每一行末尾，出现光标。 | 很神奇的操作，较常用 |
| **Option + Shift + i** | **Alt + Shift + I** | 选中一堆文本后，按下快捷键，既可在**每一行的末尾**都出现一个光标。 | 很常用 |

#### 8、编程语言相关

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| Cmd + / | Ctrl + / | 添加单行注释 | 很常用 |
| **Option + Shift + F** | Alt + Shift + F | 代码格式化 | 很常用 |
| F2 | F2 | 以重构的方式进行**重命名** | 改代码必备 |
| Ctrl + J | | 将多行代码合并为一行 | Win 用户可在命令面板搜索"合并行" |
| Cmd + U | Ctrl + U | 将光标的移动回退到上一个位置 | 撤销光标的移动和选择 |

#### 9、搜索相关

| Mac 快捷键 | Win 快捷键 | 作用 | 备注 |
| --- | --- | --- | --- |
| **Cmd + Shift + F** | **Ctrl + Shift + F** | 全局搜索代码 | 很常用 |
| **Cmd + P** | **Ctrl + P** | 在当前的项目工程里，**全局**搜索文件名 | |
| Cmd + F | Ctrl + F | 在当前文件中搜索代码，光标在搜索框里 | |
| **Cmd + G** | **F3** | 在当前文件中搜索代码，光标仍停留在编辑器里 | 很巧妙 |

#### 10、自定义快捷键

按住快捷键「Cmd + Shift + P」，弹出命令面板，在命令面板中输入"快捷键"，可以进入快捷键的设置。

当然，你也可以选择菜单栏「偏好设置 --> 键盘快捷方式」，进入快捷键的设置。

此外，如果你输入这个快捷键后没起作用，那有可能是与其他软件（比如 PicGo 软件）的快捷键冲突了，请检查一下。

#### 11、快捷键列表

你可以点击 VS Code 左下角的齿轮按钮，在展开的菜单中选择「键盘快捷方式」，就可以查看和修改所有的快捷键列表了。

#### 快捷键参考表（官方）

VS Code 官网提供了 PDF 版本的键盘快捷键参考表，转需：

- Windows 版本：[https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-windows.pdf)
- Mac 版本：[https://code.visualstudio.com/shortcuts/keyboard-shortcuts-macos.pdf](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-macos.pdf)
- Linux 版本：[https://code.visualstudio.com/shortcuts/keyboard-shortcuts-linux.pdf](https://code.visualstudio.com/shortcuts/keyboard-shortcuts-linux.pdf)

我们在 VS Code 软件里通过菜单栏「帮助 --> 键盘快捷方式参考」也可以打开相应平台的快捷键大全（PDF 版本）。

### 个性化配置

#### 1. 主题与外观

##### 推荐主题

- **深色主题**：One Dark Pro、**Dracula**、Material Theme
- **浅色主题**：GitHub Light、Solarized Light
- **文件图标**：vscode-icons、Material Icon Theme

##### 配置示例

```json
{
  "workbench.colorTheme": "One Dark Pro",
  "workbench.iconTheme": "vscode-icons",
  "editor.fontLigatures": true,
  "window.titleBarStyle": "custom"
}
```

#### 2. 编辑器优化

##### 代码可读性

```json
{
  "editor.renderWhitespace": "boundary",
  "editor.renderLineHighlight": "line",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "editor.minimap.enabled": true
}
```

##### 光标与选择

```json
{
  "editor.cursorBlinking": "phase",
  "editor.cursorSmoothCaretAnimation": "on",
  "editor.multiCursorModifier": "ctrlCmd",
  "editor.selectionHighlight": true
}
```

#### 3. 工作区设置

##### 项目管理

```json
{
  "explorer.openEditors.visible": 10,
  "breadcrumbs.enabled": true,
  "workbench.editor.enablePreview": false,
  "workbench.startupEditor": "none"
}
```

### 核心功能详解

#### 1. 命令面板（Command Palette）

命令面板是 VS Code 的**控制中心**，通过 `Ctrl + Shift + P` 打开，可以执行几乎所有操作：

- 安装扩展
- 更改设置
- 运行命令
- 切换主题
- 管理 Git

#### 2. 集成终端

VS Code 内置功能完整的终端：

- **多终端支持**：同时打开多个终端实例
- **任务集成**：自动执行构建、测试任务
- **终端选择**：PowerShell、CMD、bash、zsh

##### 常用终端命令

```bash
# 在终端中打开当前文件夹
code .

# 打开特定文件
code app.js

# 打开特定文件夹
code ./src
```

#### 3. 智能代码补全（IntelliSense）

VS Code 的 AI 驱动代码补全功能：

- **类型推断**：自动推断变量类型
- **参数提示**：显示函数参数信息
- **快速文档**：悬停查看文档
- **自动导入**：自动添加 import 语句

#### 4. 调试功能

内置调试器支持多种语言：

- **断点调试**：行断点、条件断点、日志点
- **调用栈**：查看函数调用链
- **变量监视**：实时监控变量值
- **控制台**：交互式调试控制台

##### 调试配置示例

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动程序",
      "program": "${workspaceFolder}/app.js",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

#### 5. Git 集成

内置完整的 Git 工作流：

- **状态可视化**：文件修改状态一目了然
- **差异对比**：行级差异对比
- **分支管理**：创建、切换、合并分支
- **提交历史**：图形化提交历史查看

### 扩展生态系统

#### 必装扩展推荐

##### 开发效率类

| 扩展 | 功能 | 适用场景 |
| --- | --- | --- |
| **GitLens** | Git 增强 | 查看代码作者、提交历史 |
| **Prettier** | 代码格式化 | 统一代码风格 |
| **ESLint** | 代码检查 | JavaScript/TypeScript 代码质量 |
| **Live Server** | 实时预览 | Web 开发实时刷新 |
| **Code Runner** | 代码运行 | 快速运行代码片段 |

##### 语言支持类

| 扩展 | 语言 | 功能 |
| --- | --- | --- |
| **Python** | Python | 智能提示、调试、测试 |
| **Java** | Java | 项目支持、Maven/Gradle |
| **C/C++** | C/C++ | 智能感知、调试 |
| **Go** | Go | 语言服务器、测试 |
| **Rust** | Rust | 语法检查、代码补全 |

##### 前端开发

| 扩展 | 框架 | 功能 |
| --- | --- | --- |
| **Vetur** | Vue.js | 语法高亮、智能感知 |
| **React Snippets** | React | 代码片段 |
| **Angular Snippets** | Angular | TypeScript 支持 |
| **Tailwind CSS** | Tailwind | 智能提示、预览 |

#### 扩展管理技巧

##### 1. 按需安装

- 根据项目需求安装扩展
- 使用工作区推荐扩展（`.vscode/extensions.json`）
- 定期清理不用的扩展

##### 2. 扩展配置

```json
{
  "extensions.autoUpdate": true,
  "extensions.ignoreRecommendations": false,
  "extensions.showRecommendationsOnlyOnDemand": false
}
```

##### 3. 扩展同步

使用 VS Code 内置的**设置同步**功能：

1. 登录 Microsoft 或 GitHub 账号
2. 启用设置同步
3. 选择同步内容（设置、扩展、快捷键等）

### 高级工作流

#### 1. 多项目管理

##### 工作区文件

创建 `.code-workspace` 文件管理多项目：

```json
{
  "folders": [
    { "path": "frontend" },
    { "path": "backend" },
    { "path": "docs" }
  ],
  "settings": {
    "editor.tabSize": 2
  }
}
```

##### 快速切换

- **最近项目**：`Ctrl + R` 打开最近项目列表
- **项目保存**：自动保存打开的文件和文件夹

#### 2. 远程开发

##### 支持模式

- **SSH**：连接到远程服务器
- **容器**：在 Docker 容器中开发
- **WSL**：Windows Subsystem for Linux

##### 配置示例

```json
{
  "remote.SSH.defaultForwardedPorts": [
    { "localPort": 3000, "remotePort": 3000 }
  ],
  "remote.autoForwardPorts": true
}
```

#### 3. 任务系统

##### 任务定义

在 `.vscode/tasks.json` 中定义：

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "启动开发服务器",
      "type": "shell",
      "command": "npm run dev",
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
```

##### 任务运行

- `Ctrl + Shift + B`：运行默认构建任务
- `Ctrl + Shift + P` → "Tasks: Run Task"：选择任务运行

#### 4. 代码片段（Snippets）

##### 创建自定义片段

```json
{
  "Print to console": {
    "prefix": "log",
    "body": ["console.log('$1');", "$2"],
    "description": "Log output to console"
  }
}
```

##### 使用技巧

- 使用 `Tab` 键在占位符间跳转
- 多个光标位置使用 `$1`、`$2` 等
- 变量使用 `${1:default}` 格式

### AI 辅助开发

#### GitHub Copilot

VS Code 内置的 AI 编程助手：

##### 核心功能

- **行级补全**：根据上下文自动补全代码
- **聊天功能**：`Ctrl + I` 打开 Copilot 聊天
- **代码解释**：解释选中代码的功能
- **测试生成**：自动生成单元测试

##### 配置优化

```json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": true
  },
  "github.copilot.editor.enableAutoCompletions": true
}
```

#### 其他 AI 工具

- **通义灵码**：阿里巴巴的 AI 代码助手
- **Roo code**：更强大的 AI 编程辅助工具

### 搜索与导航

#### 1. 文件内搜索

- `Ctrl + F`：在当前文件搜索
- `F3`/`Shift + F3`：下一个/上一个匹配项
- `Alt + Enter`：选择所有匹配项

#### 2. 全局搜索

- `Ctrl + Shift + F`：全局文本搜索
- `Ctrl + Shift + E`：文件资源管理器
- `Ctrl + T`：工作区符号搜索

#### 3. 高级搜索技巧

```javascript
// 使用正则表达式
^import.*from  // 查找所有 import 语句

// 使用文件过滤
*.js:console.log  // 只在 JS 文件中搜索

// 使用排除模式
!node_modules  // 排除 node_modules 目录
```

### 故障排除

#### 常见问题解决

##### 1. 扩展冲突

1. 禁用所有扩展
2. 逐个启用扩展，测试问题
3. 使用扩展二分法定位问题扩展

##### 2. 重置配置

```bash
# 备份当前配置
cp ~/.config/Code/User/settings.json ~/vscode-settings-backup.json

# 重置配置
rm -rf ~/.config/Code/User
```

#### 调试模式

1. 使用 `--disable-extensions` 启动 VS Code
2. 打开开发者工具（`Ctrl + Shift + I`）
3. 查看控制台错误信息

### 学习资源

#### 官方资源

- **文档**：[code.visualstudio.com/docs](https://code.visualstudio.com/docs)
- **API**：[code.visualstudio.com/api](https://code.visualstudio.com/api)
- **扩展市场**：[marketplace.visualstudio.com](https://marketplace.visualstudio.com)

#### 社区资源

- **GitHub**：[github.com/microsoft/vscode](https://github.com/microsoft/vscode)
- **Stack Overflow**：[stackoverflow.com/questions/tagged/visual-studio-code](https://stackoverflow.com/questions/tagged/visual-studio-code)
- **Reddit**：[reddit.com/r/vscode](https://www.reddit.com/r/vscode)

#### 视频教程

- **官方教程**：[VS Code YouTube 频道](https://www.youtube.com/c/Code)
- **免费课程**：Microsoft Learn、freeCodeCamp

#### 推荐阅读

- **《第一次使用 VS Code 时你应该知道的一切配置》**（千古壹号）——中文新手向，讲首次配置、快捷键、常用插件、字体与主题，读一遍就能把编辑器弄顺手。[原文](https://github.com/qianguyihao/Web/blob/master/00-%E5%89%8D%E7%AB%AF%E5%B7%A5%E5%85%B7/01-VS%20Code%E7%9A%84%E4%BD%BF%E7%94%A8.md)
- 这一篇采用 CC BY-NC-SA 4.0（**禁止商业性使用**），与本知识库的 CC BY-SA 4.0 不兼容：**只能链过去读，不要把正文抄进本仓库**；要引用它的内容，请注明作者与原文链接。

### 最佳实践清单

#### 每日工作流

- [ ] 使用命令面板执行操作
- [ ] 合理使用多编辑器视图
- [ ] 定期提交代码到 Git
- [ ] 使用任务自动化重复工作

#### 项目设置

- [ ] 创建项目特定的 `.vscode` 配置
- [ ] 配置统一的代码格式化规则
- [ ] 设置项目推荐的扩展列表
- [ ] 配置调试和任务配置

#### 团队协作

- [ ] 统一团队扩展配置
- [ ] 使用 Live Share 进行代码审查
- [ ] 共享代码片段库
- [ ] 建立代码风格指南

### 更新与维护

#### 保持更新

- **自动更新**：启用自动更新功能
- **Insiders 版本**：体验最新功能
- **扩展更新**：定期更新扩展

#### 配置备份

使用以下方法备份配置：

1. **设置同步**：使用 VS Code 内置同步
2. **Git 备份**：将配置提交到 Git 仓库
3. **手动备份**：定期导出 settings.json

### 总结

VS Code 不仅仅是一个代码编辑器，而是一个完整的**开发环境平台**。通过合理配置和高效使用，可以显著提升开发效率。

---

## 六、实践内容

下面六个练习都要求当场做出可检查的结果，不要只读一遍。全部做完大约需要两个自习时段。

### 练习一：全程不用鼠标改一遍代码

**任务**：任选一个自己写过的代码文件（100 行以上），依次完成下面每个动作：

1. 用 `Ctrl + G` 跳到第 20 行。
2. 把光标停在某一行任意位置，用 `Ctrl + C`、`Ctrl + V` 把这一行复制到下一行。
3. 用 `Alt + ↑`、`Alt + ↓` 把一行代码上下移动。
4. 用 `Ctrl + D` 逐个选中同一个单词的多处出现，一次性改掉。
5. 用 `Ctrl + Shift + L` 把某一批相同写法同时改掉。
6. 用 `Alt + Shift + ↓` 复制一行，再改成新内容。
7. 用 `Ctrl + /` 注释掉三行，再用一次取消注释。
8. 用 `Alt + Shift + F` 格式化整个文件。

**验收标准**：整个过程一次鼠标都没碰；改完之后文件里没有多余空行或错位。

**卡住了先看哪里**：本课「核心快捷键」一节；想不起来某个命令的名字，就用 `Ctrl + Shift + P` 搜。

### 练习二：配一套自己的设置

**任务**：用 `Ctrl + ,` 打开设置，把字号、主题、图标主题、`editor.formatOnSave`、`files.autoSave`、`editor.tabSize` 这几项改成适合自己的值，然后打开设置同步。

**验收标准**：能在 settings.json 里指出自己改过哪些键；换一台机器登录账号后，配置能同步回来。

**卡住了先看哪里**：本课「个性化配置」一节的 JSON 示例。

### 练习三：装一个扩展并让它真正生效

**任务**：按自己的方向装 2～3 个扩展（写 Python 就装 Python 扩展，写前端就装 Prettier 或 ESLint），然后真的用一次——格式化一个文件，或者让智能提示出现一次。

**验收标准**：能说出每个扩展解决了什么问题；能说出怎么临时禁用它、怎么彻底卸载它。

**卡住了先看哪里**：本课「扩展生态系统」一节；扩展互相冲突时的定位方法在「故障排除」一节。

### 练习四：用三种方式做多光标编辑

**任务**：找一份有重复结构的文本（例如一批格式相同的 Markdown 表格行），分别用 `Alt + 鼠标点击`、`Ctrl + Alt + 上下键`、`Alt + Shift + I` 三种方式各改一次。

**验收标准**：三次修改都没有手工重复输入；能说清这三种方式分别适合什么场景。

### 练习五：用源代码管理面板看差异并提交

**任务**：改一个受版本控制的文件，在编辑器的源代码管理面板里逐行看差异，然后写一条提交信息并提交。

**验收标准**：能指出自己的改动在差异视图里对应哪几行；知道怎么撤销其中一处改动。

**卡住了先看哪里**：本课「核心功能详解」里的 Git 集成部分。分支、评审、冲突处理不在本课范围，属于本部门的协作类课程。

### 练习六：制造一次快捷键冲突再修好

**任务**：故意让一个快捷键失效（比如和输入法或其他常驻软件的快捷键撞车），用命令面板打开「键盘快捷方式」设置，找出冲突并改掉。

**验收标准**：能说清「键盘快捷方式」设置页里每一列分别是干什么的。

---

## 七、项目衔接

这门课不是终点，而是后面所有课程的入口。学完之后建议按下面的顺序接：

- **代码与文档协作**：本课只讲到编辑器自带的源代码管理面板——看差异、暂存、提交。真正要掌握的分支模型、提交信息规范、PR 与代码评审、冲突处理，属于本部门的协作类内容。开始协作之前，先读仓库根的 `CONTRIBUTING.md`，里面写了提交前要跑哪些检查、敏感信息怎么脱敏。
- **Web 开发课**：后面的前端与全栈课程会大量复用本课的能力——集成终端跑 `npm` 命令、任务系统跑开发服务器、扩展市场里的格式化与静态检查插件、调试器打断点。这些现在不练熟，到时候就会一边学框架一边补编辑器。
- **写文档**：本知识库全部是 Markdown。写文档用到的就是本课里的预览、多光标批量改表格、代码片段和格式化；文档本身该怎么写，见站点「写作规范」页与仓库根的 `CONTRIBUTING.md`。
- **远程开发**：本课「高级工作流」一节介绍了 SSH、容器、WSL 三种远程开发模式。真要把编辑器连到实验室服务器上写代码，需要先能接入组网，这部分内容见本部门的组网技术模块。
- **真实项目**：上手做第一个真实项目时，可以从本部门的「设备与 Agent 统一管理」项目实践入手，里面会用到本课的终端、任务、调试和远程开发能力。
