---
title: Linux 服务器运维
一句话: 让一个服务在无人值守的服务器上自己起来、自己恢复，并且坏了能查。
type: 参考
部门: 终端服务部
维护人: publieople
更新: 2026-10-21
状态: 草稿
可见性: 公开
难度: 入门
适用版本: Ubuntu 22.04 / 24.04；systemd 249 以上
tags: [Linux, 服务器, 运维, systemd]
---

# Linux 服务器运维

## 一、这页讲什么

把一条「SSH 上去手动跑」的命令，变成一个托管服务：开机自启、挂了自动拉起、日志有地方查、磁盘和端口有迹可循。

读完能做到四件事：写一个能用的 systemd 单元；用 `journalctl` 查服务的日志；判断重启后服务会不会自己回来；在磁盘写满、端口被占之前发现问题。

## 二、开始之前

| 项 | 内容 |
| --- | --- |
| 版本与日期 | Ubuntu 22.04 / 24.04 LTS，systemd 249 以上；2026-10-21 核实 |
| 预计耗时 | 20 分钟 |
| 前置 | 有 sudo 权限；知道要托管的命令怎么启动 |
| 风险级别 | 中：改 systemd 单元、占端口、需要 sudo |

## 三、动手做

### 1. 先在前台把命令跑通

```bash
$ python3 -m http.server 8099
Serving HTTP on 0.0.0.0 port 8099 (http://0.0.0.0:8099/) ...
```

另开一个窗口验证，然后 `Ctrl+C` 停掉：

```bash
$ curl -I http://127.0.0.1:8099
HTTP/1.0 200 OK
```

看到这个就算成：前台能跑、`curl` 返回 200。前台都跑不通的命令，托管起来只会让失败更难查。

### 2. 写一个 systemd 单元

新建 `/etc/systemd/system/demo.service`：

```ini
[Unit]
Description=Demo static server on 8099
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=labuser
WorkingDirectory=/srv/demo
ExecStart=/usr/bin/python3 -m http.server 8099
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

`User` 填实际账号，`WorkingDirectory` 填服务需要的工作目录。服务不该用 root 跑。

### 3. 加载并启动

```bash
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now demo
Created symlink /etc/systemd/system/multi-user.target.wants/demo.service → /etc/systemd/system/demo.service.

$ systemctl status demo --no-pager
● demo.service - Demo static server on 8099
     Loaded: loaded (/etc/systemd/system/demo.service; enabled; preset: enabled)
     Active: active (running) since Wed 2026-10-21 10:12:03 CST; 3s ago
```

看到这个就算成：`Active:` 一行是 `active (running)`，并且 `Loaded:` 里写明 `enabled`。`enabled` 才意味着重启后自己起来。

### 4. 查日志

```bash
$ journalctl -u demo -n 20 --no-pager
Oct 21 10:12:15 labserver python3[2311]: 127.0.0.1 - - [21/Oct/2026 10:12:15] "HEAD / HTTP/1.0" 200 -
```

跟随输出用 `journalctl -u demo -f`。服务往标准输出和标准错误写的内容都会进这里。

看到这个就算成：日志里能看到刚才那次 `curl` 的请求记录。看不到时，先确认服务的日志写的是 stdout 而不是自己的文件。

### 5. 验证重启后能自己回来

```bash
$ sudo systemctl restart demo
$ systemctl is-active demo
active

$ systemctl is-enabled demo
enabled
```

看到这个就算成：重启服务后 `is-active` 是 `active`，`is-enabled` 是 `enabled`。真实验证要等一次机器重启，那一步先在部门群里说一声。

### 6. 日常巡检三条命令

```bash
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2       196G  178G   14G  93% /

$ sudo ss -tlnp | grep -E ':(80|443|8099)'
LISTEN 0  5  0.0.0.0:8099  0.0.0.0:*  users:(("python3",pid=2311,fd=3))

$ free -h
               total        used        free
Mem:            62Gi        41Gi        19Gi
```

看到这个就算成：`Use%` 低于 85%，端口占用列出来的进程都是认识的。磁盘到 90% 以上就要动手清。

## 四、做完怎么确认

1. `systemctl status` 是 `active (running)`，`is-enabled` 是 `enabled`。
2. `journalctl -u <服务>` 有近期日志。
3. `curl` 或客户端能正常访问服务。
4. `df -h`、`ss -tlnp`、`free -h` 没有异常项。

## 五、卡住了怎么排查

| 症状 | 多半是 | 先验证 | 处理 |
| --- | --- | --- | --- |
| `Unit demo.service not found` | 单元文件路径或名字不对，或没 `daemon-reload` | `$ systemctl cat demo` | 放到 `/etc/systemd/system/`；改完必须 `sudo systemctl daemon-reload` |
| `status=203/EXEC` | `ExecStart` 路径写错，或没有执行权限 | `$ ls -l /usr/bin/python3` | 用绝对路径；确认文件可执行 |
| `status=1/FAILURE` 立刻退出 | 命令本身有错，托管放大了错误 | 前台按 `ExecStart` 原样跑一遍 | 先修命令；`WorkingDirectory`、环境变量、配置文件路径逐个核对 |
| `Address already in use` | 端口被别的进程占着 | `$ sudo ss -tlnp \| grep :8099` | 换端口或停掉占用者；端口占用按内部台账登记 |
| 重启后服务没起来 | 没 `enable`，或依赖的网络没就绪 | `$ systemctl is-enabled demo` | `sudo systemctl enable demo`；必要时 `After=network-online.target` |
| 磁盘 `No space left on device` | 日志或数据把盘写满 | `$ df -h`、`$ sudo du -sh /var/log/* \| sort -h` | 清日志、配 `journalctl --vacuum-size`；扩容前先确认是谁的目录 |
| 日志里什么也没有 | 服务自己写文件，或根本没进到启动阶段 | `$ journalctl -u demo --since '-5min'` | 让服务写 stdout/stderr；`Type=forking` 要按实际类型写 |

## 六、为什么这样能成

**systemd 是父进程。** 托管后服务不再是「谁 SSH 上去跑的一个前台进程」，而由 systemd 拉起并持有。进程退出时 systemd 看得见，`Restart=` 才有意义。

**日志走统一入口。** 服务写 stdout/stderr，systemd 把它们交给 journald，`journalctl` 才能按单元、按时间查。服务自己另写文件时，这套检索就断了一半。

**端口在机器上是唯一的。** 同一时间一个端口只能被一个进程监听，这是端口冲突的根源，也是「先看谁占着」永远有效的原因。

**磁盘写满会连带打死服务。** 服务写不了日志、写不了临时文件，表现常常与磁盘无关。巡检里放一条 `df -h`，比事后猜省事。

## 七、边界与替代

- **不做多机编排**：批量下发、配置管理、集群调度不在本页范围。机器规模上去之后再看 Ansible 一类工具。
- **不负责装服务本身**：服务的安装与配置看各自的官方文档；ComfyUI 见 [ComfyUI 部署](ComfyUI/01-部署.md)。
- **容器化的服务用另一套方式**：容器托管的做法见 [容器与编排](容器与编排.md)，两类服务不要混着管。
- **不要用 root 跑业务服务**：单元里写 `User=`，权限按最小给。
- **端口是共享资源**：对外或长期占用的端口先登记，避免和别人的服务撞车。

## 八、官方资料

- systemd.service 手册：<https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html>
- systemctl 手册：<https://www.freedesktop.org/software/systemd/man/latest/systemctl.html>
- journalctl 手册：<https://www.freedesktop.org/software/systemd/man/latest/journalctl.html>
- Ubuntu Server 文档：<https://documentation.ubuntu.com/server/>

核实日期：2026-10-21。
