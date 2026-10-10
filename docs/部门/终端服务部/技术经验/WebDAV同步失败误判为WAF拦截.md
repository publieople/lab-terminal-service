---
title: WebDAV 同步失败误判为 WAF 拦截
type: 技术经验
部门: 终端服务部
维护人: publieople
更新: 2026-10-10
状态: 可用
可见性: 公开
tags: [技术经验, WebDAV, Nginx, Docker, 排查方法]
---

# WebDAV 同步失败误判为 WAF 拦截

> 本文整理自维护人 2026-06-08 的博客文章《我花了一整晚抓 WAF，结果它压根没拦》，按本库的脱敏规则改写（真实域名写成 `<域名>`）。

## 一、现象

用剪贴板工具 TieZ 的 WebDAV 同步做跨设备剪贴板，大部分请求都正常，**只有 MOVE 请求返回 502 Bad Gateway**，同步在最后一步中断。

同一个 WebDAV 端点上，其他方法都是好的：

```text
PROPFIND → 207 ✅
MKCOL    → 201 ✅
PUT      → 201 ✅
MOVE     → 502 ❌
```

TieZ 同步的逻辑是"先 PUT 一个临时文件，再 MOVE 到最终路径"，所以 502 只在最后一步出现。

可以拿去搜索的原文：Nginx 的 `access.log` 里所有 MOVE 记录都是 `502`，而 `error.log` 里**没有**对应的错误行。

---

## 二、环境

| 项 | 情况 |
| --- | --- |
| 反向代理 | Nginx（OpenResty），跑在 Docker 容器里，用 `server_name` 路由多个站点 |
| 上游 | OpenList 的 WebDAV 实现，监听 5244，数据目录 `/data/openlist/storage/` |
| 站点 | `<域名>` 反代到上游；容器内访问宿主端口要用 Docker 网桥网关地址（`docker network inspect bridge` 里能看到，默认网段是私网地址） |
| 客户端 | TieZ，同步流程为 `PUT` 临时文件 → `MOVE` 到最终路径 |
| 排查手段 | 容器内 `curl`、宿主 `curl`、`access.log` / `error.log`、控制面板的 WAF 配置 |

服务器上还装着控制面板自带的 WAF，这一点在后面的排查里起了很大作用。

---

## 三、原因

```text
MOVE 返回 502
  → 为什么？客户端发的 Destination 头是绝对 URL
    → 为什么绝对 URL 会失败？OpenList 的 WebDAV 实现只接受相对路径，
      收到绝对 URL 时返回了一个 Nginx 判定为 502 的响应
      → 为什么一开始没查到这里？"502 + 非标准 HTTP 方法 + 有 WAF"
        三条线索拼起来太顺，排查方向被带偏   ← 根因在这里
```

TieZ 发的是这种头：

```text
Destination: http://<域名>:8080/dav/tiez-sync/head.json
```

改成相对路径就通了：

```text
Destination: /dav/tiez-sync/head.json
→ 201 Created
```

**为什么绕了四小时**：MOVE 属于不常见的 HTTP 方法，服务器上又确实有 WAF，于是"WAF 拦截了非标准方法"成了最省事的解释。为了验证它，依次关掉了 XSS 防护、Header 过滤规则、方法白名单（`methodWhite`），甚至重启了整个 OpenResty 容器清空 Lua 共享内存——**502 依旧**。到这里这个假设才被彻底排除，回头做分层测试，十分钟内就定位到了真正的差异。

修好 MOVE 之后又暴露第二个问题：读取 `head.json` 返回 `405 Method Not Allowed`。GET 返回 405 很反常，查下来是磁盘上 `/data/openlist/storage/head.json` 是个**目录**，OpenList 不允许对目录执行 GET。这个事实在最早的 `PROPFIND` 响应里就写着（`<D:collection/>` 标注了它是集合），当时只盯着 502，没看见。

---

## 四、解决方案

**第一处：在反向代理侧把 Destination 的 scheme 与 host 剥掉**，让上游只看到相对路径：

```lua
set_by_lua_block $rewritten_dest {
    local dest = ngx.var.http_destination
    if dest then
        dest = dest:gsub("^https?://[^/]+", "")
    end
    return dest or ""
}
proxy_set_header Destination $rewritten_dest;
```

**第二处：删掉误建的目录**，让客户端用 PUT 重建：`rm -rf /data/openlist/storage/head.json`

**顺带修掉一个自找的坑**：容器重建后 `/etc/hosts` 里手工添加的 `host.docker.internal` 记录会丢失，容器起不来。改成直接写 Docker 网桥网关地址，不再依赖 hosts。

四小时的调试，真正要改的只有反向代理里 10 行 Lua 和一条 `rm -rf`。

---

## 五、验证

```text
容器内 curl 发 MOVE   → 200 OK     ← 说明中间层没有拦
外部 curl 发 MOVE     → 502
改 Destination 为相对路径 → 201 Created
加上 Lua 重写后，客户端 MOVE → 通过，同步完成
删掉目录后再 GET head.json → 正常
```

**"容器内 200、外部 502" 是整晚最有用的一次测试**：WAF 对容器内外的请求一视同仁，内部能过就说明它没有拦。做了这个测试之后，排查范围立刻从"WAF 的哪条规则"缩小到"两个请求的差异"。

---

## 六、经验

1. **分层隔离测试永远是对的。**容器内能过、外部不能过，问题就在中间层，不在两端。先做这一步，能把几小时的猜疑链压成几分钟。
2. **502 不等于上游宕机。**上游返回了反向代理无法理解的响应，同样会被记成 502；`error.log` 里没有错误，不代表没有问题。
3. **WAF 是完美的替罪羊。**它够复杂、够可疑、够难验证。排除法要做彻底：把所有规则都关掉问题依旧，它才算被洗清——做一半就换方向，等于没排除。
4. **容器里不要依赖 `host.docker.internal`。**它依赖运行时往 `/etc/hosts` 注入记录，容器一重建就丢。写死网桥 IPv4 地址更可靠。
5. **WebDAV 实现未必严格遵循 RFC。**别假设上游支持绝对 URL,先试相对路径、绝对 URL、带不带端口这几种变体，用最小请求确定它接受哪一种。
6. **顺手拿到的完整响应值得存下来。**`PROPFIND` 的响应里早就写明 `head.json` 是集合（目录），后来成了第二个问题的答案。排查时把完整响应留一份，能省掉一次重查。
