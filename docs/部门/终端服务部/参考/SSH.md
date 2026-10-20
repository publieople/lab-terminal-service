---
title: SSH 远程登录与端口转发
一句话: 不用密码登录服务器，并把服务器上只听本机的服务临时拉到本地用。
type: 参考
部门: 终端服务部
维护人: publieople
更新: 2026-10-20
状态: 草稿
可见性: 公开
难度: 入门
适用版本: OpenSSH 8.0 以上（Windows 10 1809 起自带客户端）
tags: [SSH, 远程登录, 密钥, 端口转发]
---

# SSH 远程登录与端口转发

## 一、这页讲什么

用 SSH 连上服务器：第一次配好密钥免密登录，之后一条别名命令就进去；需要时开一条隧道，把服务器上只监听 `127.0.0.1` 的服务拉到本地浏览器里。

读完能做到三件事：不用把密码交给别人；不用每次输密码；能把服务器上没对外开放的服务临时拉到本地浏览器里。

## 二、开始之前

| 项 | 内容 |
| --- | --- |
| 版本与日期 | OpenSSH 8.0 以上；2026-10-20 核实 |
| 预计耗时 | 10 分钟 |
| 前置 | 服务器开好账号，能用密码登录一次 |
| 风险级别 | 低：只改自己用户目录下的文件 |

## 三、动手做

### 1. 确认本机有客户端

```bash
$ ssh -V
OpenSSH_9.6p1, OpenSSL 3.0.13
```

看到这个就算成：打印出 `OpenSSH_` 开头的版本号。Windows 没装的话，在「设置 → 应用 → 可选功能」里加「OpenSSH 客户端」。

### 2. 生成密钥

```bash
$ ssh-keygen -t ed25519 -C "你的名字@实验室"
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/you/.ssh/id_ed25519):
Your identification has been saved in /home/you/.ssh/id_ed25519
The key fingerprint is:
SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 你的名字@实验室
```

路径按回车用默认值；口令可以直接回车留空（方便，但机器可能被别人接触时更危险），也可以设一个。

看到这个就算成：`~/.ssh/` 下多了 `id_ed25519`（私钥，权限 600）和 `id_ed25519.pub`（公钥）。**私钥不外发，进 git 就废了。**

### 3. 把公钥放到服务器上

Linux、macOS 一条命令：

```bash
$ ssh-copy-id -i ~/.ssh/id_ed25519.pub user@<服务器地址>
Number of key(s) added: 1
```

Windows PowerShell 没有 `ssh-copy-id`，用这条：

```powershell
> type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh user@<服务器地址> "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

看到这个就算成：再 `ssh user@<服务器地址>` 不提示输密码就直接进去。

### 4. 写个别名，不用记地址

编辑 `~/.ssh/config`：

```text
Host gpu
    HostName <服务器地址>
    User user
    Port 22
    IdentityFile ~/.ssh/id_ed25519
```

```bash
$ ssh gpu
Welcome to Ubuntu 24.04 LTS
```

看到这个就算成：`ssh gpu` 直接登入，不用再写地址和用户名。想连多台机器就复制一段改 `Host` 名字。

### 5. 开一条隧道，访问只听本机的服务

服务器上的服务只监听 `127.0.0.1:8188` 时，把本地 8188 端口接到服务器上的 8188：

```bash
$ ssh -L 8188:127.0.0.1:8188 gpu
# 保持这个窗口不要关，关掉隧道就断
```

看到这个就算成：本地浏览器打开 `http://127.0.0.1:8188` 能访问服务器上的服务。关掉 SSH 窗口后这个地址立刻打不开，说明服务确实没有对公网开放。

### 6. 服务器侧收紧（可选，需要 root）

编辑 `/etc/ssh/sshd_config`，把密码登录关掉：

```text
PasswordAuthentication no
PermitRootLogin prohibit-password
```

```bash
$ sudo systemctl restart ssh
$ sudo ss -tlnp | grep :22
LISTEN 0 4096 0.0.0.0:22 0.0.0.0:*
```

看到这个就算成：新开一个窗口能用密钥登录，同时密码登录被拒。

警告：改 `sshd_config` 前**保留一个已登录的会话不要关**，否则配错会把自己锁在门外。

## 四、做完怎么确认

1. `ssh gpu` 免密登入。
2. `ssh -L 8188:127.0.0.1:8188 gpu` 期间本地能访问服务器内网服务。
3. 服务器上 `sudo ss -tlnp | grep :22` 显示 22 端口在监听。

## 五、卡住了怎么排查

| 症状 | 多半是 | 先验证 | 处理 |
| --- | --- | --- | --- |
| `Permission denied (publickey)` | 公钥没写进服务器，或 `~/.ssh` 权限不对 | `$ ssh -v gpu` 看有没有 `Offering public key` | 重新 `ssh-copy-id`；`chmod 700 ~/.ssh`、`chmod 600 ~/.ssh/authorized_keys` |
| `Connection refused` | sshd 没运行，或端口不是 22 | `$ ssh -p 2222 gpu` 或用别的方式进服务器 `$ sudo systemctl status ssh` | 启动 `ssh` 服务；确认 `Port` 配置 |
| `Connection timed out` | 网络不通或防火墙拦了 | `$ ping <服务器地址>`、`$ nc -vz <服务器地址> 22` | 换网络；让管理员放行端口 |
| `Host key verification failed` | 服务器重装过，或中间人 | 核对指纹来自谁 | 确认是重装后 `$ ssh-keygen -R <服务器地址>` 再连 |
| 连上立刻断开 | 账户被禁、磁盘满、家目录权限错 | 换一个账号试 | 看服务器 `/var/log/auth.log` |
| 隧道开着但本地打不开 | 本地端口被占用，或服务没起 | `$ ssh -L 8189:127.0.0.1:8188 gpu` 换端口 | 换本地端口；确认服务器上服务在跑 |

## 六、为什么这样能成

**密钥代替密码。** 登录时客户端用私钥签名，服务器用 `authorized_keys` 里的公钥验签。私钥始终不出本机，抓包也拿不到可复用的凭据。

**权限严格是 sshd 的要求。** `~/.ssh` 或 `authorized_keys` 允许组内或其他人写时，sshd 会直接拒绝用这份文件。这条规则防的是别人替换你的公钥。

**隧道本质是端口映射。** `-L 本地端口:目标主机:目标端口` 把本地连接转发到服务器进程，从服务器内部发起，所以能碰到只监听 `127.0.0.1` 的服务。

## 七、边界与替代

- **不是 VPN**：SSH 隧道只转指定端口，要让整台机器的网段互通（多端口、UDP、给同事用）走 [Tailscale 组网](Tailscale组网.md)。
- **公网别开密码登录**：22 端口暴露在公网会被持续爆破，至少关密码登录、换端口、加 fail2ban。
- **别共用私钥**：一台机器一把密钥，人走密钥走。
- **长连接别用 SSH 隧道扛**：隧道断了服务就断，长期可用的入口走反向代理与 HTTPS。

## 八、官方资料

- ssh 手册：<https://man.openbsd.org/ssh.1>
- ssh-keygen 手册：<https://man.openbsd.org/ssh-keygen.1>
- sshd_config 手册：<https://man.openbsd.org/sshd_config.5>
- Windows 自带 OpenSSH：<https://learn.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse>

核实日期：2026-10-20。
