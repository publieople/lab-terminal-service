---
title: 反向代理与 HTTPS
一句话: 用一个入口端口按域名分发给多个服务，并在入口处统一管证书。
type: 参考
部门: 终端服务部
维护人: publieople
更新: 2026-10-21
状态: 草稿
可见性: 公开
难度: 进阶
适用版本: nginx 1.18 以上；certbot 2.x
tags: [反向代理, HTTPS, nginx, 端口]
---

# 反向代理与 HTTPS

## 一、这页讲什么

让多个 Web 服务共用一个入口端口，按请求里的域名转发到正确的那个服务；证书只在入口处配一次。

读完能做到三件事：用 nginx 把两个服务挂到同一个 80 端口上；用 `curl -H Host` 在本地验证转发规则；用 certbot 申请并自动续期证书。

## 二、开始之前

| 项 | 内容 |
| --- | --- |
| 版本与日期 | nginx 1.18 以上，certbot 2.x；2026-10-21 核实 |
| 预计耗时 | 20 分钟 |
| 前置 | 有 sudo；一个域名能解析到这台机器（本地验证可用 `curl -H Host`） |
| 风险级别 | 中：占 80/443 端口。**80 端口是保留端口，新增占用必须先登记** |

## 三、动手做

### 1. 起两个上游服务

```bash
$ python3 -m http.server 8099
Serving HTTP on 0.0.0.0 port 8099 (http://0.0.0.0:8099/) ...
```

另开一个窗口用同样方式跑 8100。两个服务分别代表两个站点；实际使用时换成真实服务，它们通常只监听 `127.0.0.1`。

看到这个就算成：`curl -s http://127.0.0.1:8099` 和 `curl -s http://127.0.0.1:8100` 各自返回内容。

### 2. 装 nginx 并确认端口现状

```bash
$ sudo apt install -y nginx
$ nginx -v
nginx version: nginx/1.24.0 (Ubuntu)

$ sudo ss -tlnp | grep -E ':(80|443)'
LISTEN 0  511  0.0.0.0:80  0.0.0.0:*  users:(("nginx",pid=1201,fd=6))
```

看到这个就算成：`nginx -v` 有版本号；80 端口上只列着 nginx。还有别的进程占着 80 就先查清楚再往下做。

### 3. 写转发规则

新建 `/etc/nginx/sites-available/demo.conf`：

```nginx
server {
    listen 80;
    server_name a.example.com;

    location / {
        proxy_pass http://127.0.0.1:8099;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name b.example.com;

    location / {
        proxy_pass http://127.0.0.1:8100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 上游如果用 WebSocket，必须补这两个头
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

启用并检查语法：

```bash
$ sudo ln -s /etc/nginx/sites-available/demo.conf /etc/nginx/sites-enabled/demo.conf
$ sudo nginx -t
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

看到这个就算成：`nginx -t` 打印 `test is successful`。这一步不检查上游通不通，只检查配置语法。

### 4. 重载并验证转发

```bash
$ sudo systemctl reload nginx
$ curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: a.example.com' http://127.0.0.1/
200
```

看到这个就算成：换 `Host` 头请求，两个域名各自落到不同的上游内容上。重载不是重启，已有连接不会断。

### 5. 上 HTTPS

域名真的解析到这台机器、且 80 端口从公网可达时，一条命令拿证书并自动改写配置：

```bash
$ sudo apt install -y certbot python3-certbot-nginx
$ sudo certbot --nginx -d a.example.com
Successfully deployed certificate for a.example.com

$ sudo certbot renew --dry-run
Congratulations, all simulated renewals succeeded
```

看到这个就算成：`https://a.example.com` 能打开且证书有效；`--dry-run` 成功。续期由系统自带的定时器完成，用 `systemctl list-timers | grep certbot` 确认。

组网（tailnet）内部的域名不能申请公网证书：那类场景要么用自签证书，要么直接走组网工具的 `serve`。

## 四、做完怎么确认

1. `sudo nginx -t` 通过。
2. 两个 `Host` 头分别转发到两个上游。
3. `curl -I https://<域名>` 返回 200，证书链正常。
4. `certbot renew --dry-run` 成功。

## 五、卡住了怎么排查

| 症状 | 多半是 | 先验证 | 处理 |
| --- | --- | --- | --- |
| `502 Bad Gateway` | 上游没起，或 `proxy_pass` 的地址端口写错 | `$ curl -I http://127.0.0.1:8099` | 先把上游拉起来；核对 `proxy_pass` |
| `504 Gateway Timeout` | 上游在跑但响应太慢 | 直接请求上游计时 `$ time curl -I http://127.0.0.1:8099` | 查上游性能；必要时调 `proxy_read_timeout` |
| 访问到的是别的站点内容 | `Host` 没匹配上，落到默认 server；或 80 端口被另一个服务占了 | `$ curl -I -H 'Host: a.example.com' http://127.0.0.1/`、`$ sudo ss -tlnp \| grep :80` | 补 `server_name`；找出占端口的进程 |
| 上游返回 `Invalid Host header` | 上游框架有 Host 白名单 | 看上游日志里的实际 Host | 在 `proxy_set_header Host` 里传上游认识的域名 |
| WebSocket 连不上 | 缺 `Upgrade` / `Connection` 头 | 浏览器开发者工具看握手请求是否 101 | 补 `proxy_http_version 1.1` 与两个 `Upgrade` 头 |
| 证书续期失败 | 80 端口不可达，HTTP-01 验证过不去 | `$ sudo certbot renew --dry-run` 看报错行 | 放通 80；或改用 DNS 验证 |
| `413 Request Entity Too Large` | 请求体超过上限 | 看 nginx 错误日志 | 调 `client_max_body_size` |

## 六、为什么这样能成

**路由靠 Host 头。** 浏览器请求里带着域名，nginx 按 `server_name` 把它匹配到某个 server 块，再转给对应的上游。所以本地验证只要伪造 `Host` 头，不必改 DNS。

**反向代理是替客户端发请求。** 客户端只跟 nginx 说话，nginx 再向 `127.0.0.1` 上的服务发起新请求。上游因此可以只监听本机，不必直接面对公网。

**TLS 在入口终止。** 证书只装在 nginx 上，后面的服务继续用明文 HTTP 通信。证书的续期、算法、链都只有一处要维护。

**入口是单点。** 所有服务都从这个口进来，nginx 挂了就全挂。入口本身要纳入巡检。

## 七、边界与替代

- **不做负载均衡与集群**：多台上游、健康检查、会话保持不在本页范围。
- **内网自用可以不加证书**：只在组网内部访问的服务，用 [Tailscale 组网](Tailscale组网.md) 的 `serve` 更省事。
- **组网内没有公网证书**：tailnet 域名不签发 TLS 证书，需要 HTTPS 就自签或走外部证书。
- **别把入口当防火墙**：反向代理不做访问控制，要限制谁能访问得另外加认证。
- **80 端口不是随便用的**：新增占用要先登记，否则会和别人的服务撞车。

## 八、官方资料

- nginx 文档：<https://nginx.org/en/docs/>
- `proxy_pass` 指令：<https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass>
- certbot 使用说明：<https://certbot.eff.org/instructions>
- MDN Host 头：<https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Host>

核实日期：2026-10-21。
