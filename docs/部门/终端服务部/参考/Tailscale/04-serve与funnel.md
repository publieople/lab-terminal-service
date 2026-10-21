---
title: Tailscale serve 与 funnel
一句话: 把本机服务挂到 tailnet 域名下；确实要公开时再用 funnel。
type: 参考
部门: 终端服务部
维护人: publieople
更新: 2026-10-21
状态: 草稿
可见性: 公开
难度: 进阶
适用版本: Tailscale 1.9x（2026-10 版）
专题: Tailscale
tags: [Tailscale, serve, funnel, HTTPS, 专题]
---

# Tailscale serve 与 funnel

## 一、这页讲什么

服务装好之后，默认只能本机用 `127.0.0.1` 访问。要让组网里的其他设备用上，可以把监听改成 `0.0.0.0`，但这样会把服务暴露在所有网卡上，端口也要自己管证书。

serve 提供另一种做法：由 Tailscale 在设备上监听 443，把请求转给本机回环上的服务，并自动用 tailnet 域名与证书。funnel 是 serve 的公网版本。

读完能做到：用 serve 把本机服务挂到 tailnet 域名；判断什么时候该用 funnel、什么时候必须停手；用 status 与日志确认暴露范围。

## 二、开始之前

| 项 | 内容 |
| --- | --- |
| 版本与日期 | Tailscale 1.9x；2026-10-21 核实 |
| 预计耗时 | 20 分钟 |
| 前置 | 设备已加入 tailnet；控制台已开启 HTTPS 证书；见[组网与直连](01-组网与直连.md) |
| 风险级别 | 中：funnel 会把服务暴露到公网 |

## 三、动手做

### 1. 先确认服务只监听回环

```bash
$ ss -tlnp | grep 3000
LISTEN 0  511  127.0.0.1:3000  0.0.0.0:*  users:(("node",pid=1234,fd=18))
```

serve 的目标就是本机回环地址上的服务，所以服务监听 `127.0.0.1` 最安全。

看到这个就算成：目标服务在 `127.0.0.1:<端口>` 上监听。

### 2. 在控制台开启 HTTPS

DNS → HTTPS Certificates → Enable。开启后 tailnet 才能为 `设备名.tailnet名.ts.net` 签发证书，serve 默认走 https。

看到这个就算成：控制台显示证书功能已启用。

### 3. 启动 serve

```bash
$ sudo tailscale serve --bg localhost:3000

Available on:
https://lab-server.<tailnet>.ts.net/
|-- / proxy http://localhost:3000
```

`--bg` 表示后台常驻，退出登录或重启机器后仍然有效。不加 `--bg` 时进程退出即失效。

看到这个就算成：输出里给出 tailnet 域名，从另一台设备浏览器打开能看到服务页面。

### 4. 其他目标的写法

| 目标 | 命令 | 用途 |
| --- | --- | --- |
| 本机端口 | `tailscale serve --bg localhost:3000` | 转发到服务 |
| 指定端口 | `tailscale serve --https=8443 localhost:3000` | 避免占用 443 |
| HTTP（不加密） | `tailscale serve --http=80 localhost:3000` | 仅内网测试 |
| 静态目录 | `tailscale serve --bg /srv/site` | 分享文件 |
| 纯文本 | `tailscale serve text:「维护中」` | 临时占位页 |
| TCP 透传 | `tailscale serve --bg --tcp=2222 tcp://localhost:22` | 不用 HTTP 的服务 |

看到这个就算成：按需要选一种写法，`serve status` 里能看到对应条目。

### 5. 查看与关闭

```bash
$ tailscale serve status
https://lab-server.<tailnet>.ts.net/  proxy http://localhost:3000

$ sudo tailscale serve reset
```

`reset` 清掉全部 serve 配置；单个条目用原命令加 `off` 关闭。当前配置不要手抄，用 `serve status --json` 留档。

看到这个就算成：`serve status` 与预期一致，关闭后域名不再响应。

### 6. 确实要公网时用 funnel

```bash
$ sudo tailscale funnel --bg 3000

Available on the internet:
https://lab-server.<tailnet>.ts.net/
```

funnel 有三个前提：控制台启用 HTTPS 与 funnel 权限；ACL 里对节点声明 funnel 属性；公网只放行 443、8443、10000 这几个端口。

看到这个就算成：funnel 输出的地址从任意网络都能打开，且 `tailscale funnel status` 与实际一致。

### 7. 用完立刻关

```bash
$ sudo tailscale funnel --bg off 3000
$ tailscale funnel status
No serve config
```

看到这个就算成：外网访问立刻断开，`funnel status` 没有条目。

## 四、做完怎么确认

1. serve 的域名只在 tailnet 内可访问。
2. 目标服务仍然只监听回环地址。
3. funnel 的条目与使用期限写清了，用完已关。
4. 能说出当前暴露的是哪个端口、哪个目录或哪个服务。

## 五、卡住了怎么排查

| 症状 | 多半是 | 先验证 | 处理 |
| --- | --- | --- | --- |
| 提示证书错误 | 控制台未启用 HTTPS，或证书还没签发 | `$ sudo tailscale cert <设备名>.<tailnet>.ts.net` | 开启 HTTPS；等待签发后重试 |
| 域名 502 | 目标服务没起，或端口写错 | `$ ss -tlnp \| grep <端口>` | 先起服务；核对端口 |
| 只能本机访问 | 目标绑在 127.0.0.1 之外的地址上 | `$ ss -tlnp` | 目标改回回环；或直接指向实际地址 |
| funnel 打不开 | 未获 funnel 权限，或端口不在允许范围 | `tailscale funnel status`、控制台 ACL | 补 ACL 属性；改用允许的端口 |
| 重启后 serve 失效 | 启动时没加 `--bg` | `$ tailscale serve status` | 加 `--bg` 重新配置 |
| 端口 443 被占用 | 本机已有 nginx 等监听 443 | `$ sudo ss -tlnp \| grep :443` | 换 `--https=8443`；或把 nginx 作为目标 |
| 暴露范围说不清 | 配置散落在多台设备 | 逐台 `$ tailscale serve status` | 统一收敛到一台；其余 `reset` |

## 六、为什么这样能成

**serve 把监听与业务分离。** Tailscale 在设备上监听 443 并终结 TLS，业务服务继续只监听回环，不需要改代码，也不需要自己管证书。

**证书由 tailnet 域名决定。** 域名是 `设备名.tailnet名.ts.net`，证书随之签发，所以设备改名后旧地址失效。

**funnel 把同一套转发接到公网。** 用的还是本机 443 与同一份配置，差别在于入口从 tailnet 变成互联网，访问者不再经过 ACL 判定。

## 七、边界与替代

- **funnel 不是内网穿透的免审批方案**：对外提供服务要走实验室的登记与评估流程。
- **不要用 funnel 暴露管理界面**：路由器后台、数据库管理页、监控面板都不要公网可达。
- **别把 serve 当负载均衡**：单机转发，多实例与健康检查要用反向代理，见[反向代理与 HTTPS](../反向代理与HTTPS.md)。
- **公网域名不等于备案**：合规要求按学校与运营商的规定处理。

## 八、官方资料

- serve：<https://tailscale.com/kb/1242/tailscale-serve>
- funnel：<https://tailscale.com/kb/1223/funnel>
- HTTPS 证书：<https://tailscale.com/kb/1153/enabling-https>
- 命令参考：<https://tailscale.com/kb/1080/cli>

核实日期：2026-10-21。
