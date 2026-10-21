---
title: Tailscale 设备、标签与 ACL
一句话: 给设备分类打标签，用 ACL 写清谁能访问哪台机器的哪个端口。
type: 参考
部门: 终端服务部
维护人: publieople
更新: 2026-10-21
状态: 草稿
可见性: 公开
难度: 进阶
适用版本: Tailscale 1.9x（2026-10 版）
专题: Tailscale
tags: [Tailscale, ACL, 标签, 权限, 专题]
---

# Tailscale 设备、标签与 ACL

## 一、这页讲什么

设备一多，默认状态是「谁都能连谁」。实验室里服务器、个人电脑、临时设备混在一起，必须用 ACL 收窄范围，否则任何一台被加入的设备都能直连服务器端口。

读完能做到：给设备打标签并分类；写一段能用的 ACL 规则；用 ACL 测试与命令行验证规则确实生效。

## 二、开始之前

| 项 | 内容 |
| --- | --- |
| 版本与日期 | Tailscale 1.9x；2026-10-21 核实 |
| 预计耗时 | 30 分钟 |
| 前置 | 有 tailnet 管理员权限；设备已加入，见[组网与直连](01-组网与直连.md) |
| 风险级别 | 中：ACL 写错会切断现有访问，改前先备份当前文件 |

## 三、动手做

### 1. 看清设备清单

```bash
$ tailscale status
100.x.y.z    lab-server    publieople@    linux    idle
100.x.a.b    workstation   publieople@    windows  active; direct
```

控制台 Machines 页有同样的清单，还带最后在线时间与密钥到期时间。

看到这个就算成：能列出全部设备，并认出去重名或来历不明的条目。

### 2. 固定设备名

```bash
$ sudo tailscale set --hostname lab-gpu-01
（成功时没有输出）
```

机器名是 ACL 之外最常用的识别依据，命名按「位置-用途-编号」写死。

看到这个就算成：`tailscale status` 与控制台显示的都是新名字。

### 3. 处理密钥到期

设备密钥默认会到期，到期后需要重新登录。服务器、路由器这类长期设备应该在控制台关闭密钥到期：

Machines → 选中设备 → Disable key expiry。

看到这个就算成：设备的密钥到期列显示 Disabled。

### 4. 给设备打标签

标签用 `tag:` 前缀，代表机器身份，与「谁登录的」无关。

```bash
$ sudo tailscale set --advertise-tags=tag:server
（成功时没有输出）
```

前提是 ACL 里已经声明了这个标签的归属人，否则命令会被拒绝。

看到这个就算成：控制台的设备条目显示标签，且不再是某个人名下的设备。

### 5. 写 ACL

ACL 是控制台 Access controls 页里的一段 HuJSON，保存即生效，历史版本可回滚。

```json
{
  "tagOwners": {
    "tag:server": ["autogroup:admin"],
    "tag:dev": ["publieople@example.com"]
  },
  "groups": {
    "group:lab": ["publieople@example.com", "member2@example.com"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["group:lab"],
      "dst": ["tag:server:22,443,8188"]
    },
    {
      "action": "accept",
      "src": ["tag:dev"],
      "dst": ["tag:server:*"]
    }
  ]
}
```

几个要点：

| 写法 | 含义 |
| --- | --- |
| `src` / `dst` | 谁访问谁，`dst` 必须写成「目标:端口」 |
| `autogroup:member` | 全体成员 |
| `autogroup:admin` | 管理员 |
| `*` | 通配，设备或端口都能用，慎用 |
| `:22,443` | 只放行指定端口 |
| `:8000-8100` | 端口区间 |
| `"tests"` | 声明期望结果，保存前会校验 |

注意 `dst` 里不写冒号与端口时规则不会生效，这是最常见的写错方式。

看到这个就算成：保存时没有语法错误，页面提示规则已生效。

### 6. 验证规则

```bash
$ tailscale ping lab-server
pong from lab-server (100.x.y.z) via DERP(tok) in 41ms
$ curl -sS -m 5 http://lab-server:8188/
curl: (7) Failed to connect to lab-server port 8188
```

上面的例子说明 ICMP 允许、8188 未放行。控制台的 ACL 测试器能按源设备与目标端口列出判定结果，写规则时先用测试器算一遍。

看到这个就算成：该通的端口通，该拦的端口明确被拒，而不是超时后猜。

## 四、做完怎么确认

1. 每台设备都有能读懂的机器名与标签。
2. 长期设备的密钥到期已关闭。
3. ACL 保存无语法错误，历史版本有备份。
4. 至少用一台非管理员设备验证过「允许」与「拒绝」两种情况。

## 五、卡住了怎么排查

| 症状 | 多半是 | 先验证 | 处理 |
| --- | --- | --- | --- |
| 保存 ACL 报错 | HuJSON 语法错，或多写了逗号 | 看报错行号 | 修正语法；用 ACL 测试器预检 |
| 规则生效后全员断连 | 默认拒绝兜底，旧规则被整段替换 | 控制台历史版本对比 | 回滚上一版，逐条加规则 |
| 打了标签但设备离线 | 标签改变身份，旧的授权需要重建 | `$ tailscale status` | 确认 tagOwners 与 ACL 都对；重新登录 |
| 某个端口始终连不上 | `dst` 漏写端口，或服务只监听回环 | ACL 测试器、对端 `$ ss -tlnp` | 补端口；服务改监听 0.0.0.0 |
| 规则看起来对但被拒 | 设备同时是人名下与标签下，判定以标签为准 | 控制台设备详情 | 统一身份：要么人或组，要么标签 |
| 无法再进控制台 | 管理员自己也被规则挡住 | 另一管理员账号 | 保留至少一个管理员例外规则 |

## 六、为什么这样能成

**ACL 是默认拒绝的白名单。** 未匹配任何 `accept` 的连接都被丢弃，新增设备不会自动获得任何权限，这是「先紧后松」的做法。

**标签把人变成机器身份。** 用人名授权，换人就要改规则；用标签授权，规则只关心机器角色，人员变动不影响。

**判定只看第一条命中。** 规则从上往下匹配，命中即停。宽规则写在窄规则上面会盖住后面的限制。

## 七、边界与替代

- **不做账号体系**：登录、单点登录由实验室的账号体系负责，ACL 只消费身份。
- **不替代主机防火墙**：ACL 管的是 tailnet 内的访问，机器本机仍应保留防火墙规则。
- **规则别一次改到底**：大改前先备份，先在测试设备上验证。
- **funnel 不受 ACL 保护**：暴露到公网后访问者不再经过 tailnet 身份，见[serve 与 funnel](04-serve与funnel.md)。

## 八、官方资料

- ACL 语法与示例：<https://tailscale.com/kb/1018/acls>
- 标签：<https://tailscale.com/kb/1068/tags>
- 密钥到期：<https://tailscale.com/kb/1028/key-expiry>
- 命令参考（set 与 status）：<https://tailscale.com/kb/1080/cli>

核实日期：2026-10-21。
