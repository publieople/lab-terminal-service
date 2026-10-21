---
title: GPU 与 CUDA 环境
一句话: 判断显卡、驱动、CUDA 三层版本对不对得上，以及显存被谁占着。
type: 参考
部门: 终端服务部
维护人: publieople
更新: 2026-10-21
状态: 草稿
可见性: 公开
难度: 入门
适用版本: NVIDIA 驱动 535 以上；CUDA 12.x；PyTorch 2.x
tags: [GPU, CUDA, NVIDIA, 显存]
---

# GPU 与 CUDA 环境

## 一、这页讲什么

让程序用上 NVIDIA 显卡算力，要跨过三层软件栈：驱动、CUDA 运行时、深度学习框架。三层版本对不上时，报错往往出现在很靠上的地方，看起来像模型的问题。

读完能做到三件事：判断三层版本是否互相兼容；查清显存此刻被谁占着；在容器里验证显卡能不能透进去。

## 二、开始之前

| 项 | 内容 |
| --- | --- |
| 版本与日期 | nvidia-smi 属于驱动组件，随驱动安装；2026-10-21 核实 |
| 预计耗时 | 15 分钟 |
| 前置 | 能登录到有 NVIDIA 显卡的机器；装或换驱动需要 root |
| 风险级别 | 读命令无风险；升级驱动属高风险，会影响所有依赖显卡的服务 |

## 三、动手做

### 1. 确认驱动和显卡都在

```bash
$ nvidia-smi
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 550.54.15    Driver Version: 550.54.15    CUDA Version: 12.4     |
|-------------------------------+----------------------+----------------------+
|   0  NVIDIA GeForce RTX 4090   On                   |   00000000:01:00.0   |
+-------------------------------+----------------------+----------------------+
```

看到这个就算成：表格里同时出现 `Driver Version` 和 `CUDA Version` 两行，且没有报错。

### 2. 分清三个版本号

`nvidia-smi` 右上角的 `CUDA Version` 是**这套驱动支持的最高 CUDA 版本**，不是机器上装着的 CUDA 版本。这是最常被误读的一处。

```bash
$ nvcc --version
nvcc: NVIDIA (R) Cuda compiler driver
Cuda compilation tools, release 12.1, V12.1.105
```

机器上未必装了完整 CUDA 工具包，`nvcc` 不存在是正常的：PyTorch 之类的框架自带运行时。

```bash
$ python -c "import torch; print(torch.__version__, torch.version.cuda, torch.cuda.is_available())"
2.4.1 12.1 True
```

看到这个就算成：`torch.version.cuda` 打印的版本不高于 `nvidia-smi` 里的 `CUDA Version`，且最后一项是 `True`。最后一项是 `False` 时先看第五节。

### 3. 查显存此刻被谁占着

```bash
$ nvidia-smi --query-gpu=index,memory.used,memory.total --format=csv
index, memory.used [MiB], memory.total [MiB]
0, 20876 MiB, 24564 MiB

$ nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv
pid, process_name, used_memory
48213, /usr/bin/python3, 20110 MiB
```

拿到 PID 再确认是谁的进程：

```bash
$ ps -p 48213 -o pid,user,etime,cmd
    PID USER     ELAPSED CMD
  48213 labuser  3-04:11:26 python3 train.py --config cfg/a.yaml
```

看到这个就算成：能说清显存被哪个用户、跑了多久的进程占着。`ELAPSED` 是三天的，多半是没人收的存量任务。

### 4. 在容器里用显卡

宿主机装好 NVIDIA Container Toolkit 之后，容器要显式申请才看得到显卡：

```bash
$ docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 550.54.15    Driver Version: 550.54.15    CUDA Version: 12.4     |
```

看到这个就算成：容器内的 `nvidia-smi` 打印出与宿主机一致的驱动版本。宿主机驱动版本决定容器内能用多新的 CUDA 运行时。

## 四、做完怎么确认

1. `nvidia-smi` 正常输出，不出现 `Driver/library version mismatch`。
2. `torch.cuda.is_available()` 返回 `True`。
3. `nvidia-smi --query-compute-apps` 能对上手头的任务。
4. 容器里 `nvidia-smi` 能看到显卡。

## 五、卡住了怎么排查

| 症状 | 多半是 | 先验证 | 处理 |
| --- | --- | --- | --- |
| `Driver/library version mismatch` | 内核态驱动与用户态库版本不一致，常见于驱动在后台被升级而机器没重启 | `$ nvidia-smi` 直接报这一行 | 重启机器让内核模块与新库对齐；重启前确认没人在跑任务。此问题登记在内部台账 D6 |
| `CUDA out of memory` | 显存被别的进程占着，或批大小超出 | `$ nvidia-smi --query-compute-apps=pid,used_memory --format=csv` | 先确认占用者是谁再决定是否加卡；确实没有别人时再调小 batch、分辨率或精度 |
| 容器里 `nvidia-smi: not found` | 没装 NVIDIA Container Toolkit，或没加 `--gpus` | `$ docker run --rm --gpus all <镜像> nvidia-smi` | 装 toolkit；起容器时加 `--gpus all` |
| `no CUDA-capable device is detected` | 框架读不到设备，容器或权限限制 | `$ nvidia-smi -L` 看宿主机有没有卡 | 容器加 `--gpus`；确认装的是 GPU 版框架 |
| `nvidia-smi` 命令不存在 | 驱动没装，或用的是纯 CPU 主机 | `$ lspci \| grep -i nvidia` | 装驱动；纯 CPU 机器改走 CPU 方案 |
| `CUDA Version` 与 `nvcc` 版本不同 | 两者含义不同，不是错误 | 对照本页第 2 步 | 只要框架运行时版本不高于驱动支持的最高版本就能用 |

## 六、为什么这样能成

**驱动在下面，运行时在上面。** 驱动由显卡和内核决定，提供一部分 CUDA 能力；CUDA 运行时跑在驱动之上，只能用驱动给得出的能力。所以升级 CUDA 运行时不必换驱动，反过来则要求驱动足够新。

**框架可以自带运行时。** PyTorch 之类的包在安装时就把某一个 CUDA 运行时打进去了，宿主机不必装完整工具包。两套运行时并存时，以框架自带的那套为准。

**显存是独占的。** 一张卡上的显存被进程占着时，别的进程申请不到。共享机器上多数「跑不动」其实是别人的存量任务没退，先查占用者比调参有效。

## 七、边界与替代

- **不做多卡并行与显存调优**：数据并行、梯度检查点、量化这些属于训练侧的话题，本页只讲环境能不能用。
- **不负责装具体框架**：ComfyUI 的装法见 [ComfyUI 部署](ComfyUI/01-部署.md)，其余框架按各自官方文档装。
- **升级驱动不要随手做**：驱动一换，机器上所有依赖显卡的服务都要重启验证，属于先问再做的操作。
- **独占大任务要报备**：长时间占满显存的训练任务先在部门群里说一声，避免和别人的推理任务撞车。

## 八、官方资料

- nvidia-smi 文档：<https://docs.nvidia.com/deploy/nvidia-smi/index.html>
- CUDA 兼容性说明：<https://docs.nvidia.com/deploy/cuda-compatibility/>
- PyTorch 安装选择器：<https://pytorch.org/get-started/locally/>
- NVIDIA Container Toolkit：<https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html>

核实日期：2026-10-21。
