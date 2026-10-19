# BurnInX - GPU、CPU 与内存综合压力测试工具

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Tauri%20v2%20Native-orange?style=for-the-badge&logo=tauri" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Platform-Windows%20x64%20%7C%20ARM64-blue?style=for-the-badge&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Graphics-Three.js%20%7C%20WebGL-emerald?style=for-the-badge&logo=three.js" alt="Three.js" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
</p>

一款面向 **Windows** 平台的现代化硬件压力测试与运行监控诊断平台。把 **GPU 三维负载**、**CPU 多线程高压计算**、**内存高带宽稳定性校验**、**硬盘与网卡测速**、**运行监控与独立柱状图示波器** 与 **专业离线 HTML 诊断报告** 整合于一体，方便直观观察设备在极限负荷下的稳定性、散热表现及功耗节流状态。

---

## 📑 目录

- [✨ 核心设计与特性](#-核心设计与特性)
- [📊 独立分轨柱状图示波器与传感器精度](#-独立分轨柱状图示波器与传感器精度)
- [🖥️ GPU 三维视口全屏最大化](#️-gpu-三维视口全屏最大化)
- [📑 顶部导航 2 段式架构](#-顶部导航-2-段式架构)
- [💻 x64 与 ARM64 架构图形选项适配](#-x64-与-arm64-架构图形选项适配)
- [🦀 Tauri v2 原生桌面架构](#-tauri-v2-原生桌面架构)
- [🚀 GitHub Actions 全自动发布流水线](#-github-actions-全自动发布流水线)
- [🛠️ 本地开发与构建指南](#️-本地开发与构建指南)
- [📂 项目目录结构](#-项目目录结构)
- [📈 HTML 报告功能与留存对比](#-html-报告功能与留存对比)
- [📄 开源协议](#-开源协议)

---

## ✨ 核心设计与特性

### 1. GPU 三维压力场景 (GPU Stress Bench)
- **待机零开销机制**：未启动 GPU 测试时，**彻底关闭三维压力场景与 WebGL 渲染管线**，GPU 占用保持为 0%，节省电力且不干扰 CPU / 内存独立测试。
- **无锁帧满载渲染**：测试启动后立即解除测试帧率上限（Unlimited FPS），以极速循环与多通道着色器遍历榨干 GPU 核心算力与像素填充率。
- **经典毛发甜甜圈（Fur Donut）**：采用多层几何外壳（Fur Shells，可调 16 ~ 64 层）、动态气流位移扰动、高温发光核与多达 50,000 颗烈焰粒子风暴。
- **全方位帧表现遥测**：实时统计当前 FPS、平均 FPS、最高/最低 FPS、**1% Low 掉帧监测**及逐帧渲染时间（Frametime ms）。
- **多重负载乘数（1X / 2X / 4X / 8X）**：支持一键倍增单帧内部着色遍历遍数，让旗舰显卡（RTX 4090 / 5090）也能迅速达到 100% 满载功耗。

### 2. CPU 多线程独立计算负载 (CPU Stress Lab)
- **多线程 Worker 池**：自动嗅探系统硬件逻辑核心数，支持自由调节并发工作线程（单核 1T、全核满载、超载 200%）。可在不启动 GPU 压力场景的情况下独立运行。
- **4 类高强度算法**：
  - `SGEMM 密集浮点矩阵乘法`：重度压迫 AVX / FPU 单元，激发极高核心功耗与发热。
  - `SHA-256 密集哈希`：测试算术逻辑单元 (ALU) 与分支预测器。
  - `质数大数筛法与多项式`：连续大数组跨步访问，检验缓存层级。
  - `蒙特卡洛光线追踪模拟`：连续空间求交密集数学运算。
- **逐指令校验校对**：具备结果校验和对比，探测高频不稳定导致的指令位翻转错误。

### 3. 内存带宽与物理坏块检测 (RAM Stress Lab)
- **安全连续内存缓冲**：支持按 32MB 分块连续物理分配 256MB ~ 4096MB 内存。
- **3 种测试模式**：
  - `极限带宽吞吐`：大跨度顺序与随机读写，最大化总线带宽。
  - `0x55/0xAA 走马灯位翻转检验 (Bitflip Checker)`：交替掩码写入与回读，排查高频虚焊与内存颗粒坏块。
  - `多级缓存击穿 (DRAM 直通)`：大步长 Prime Stride 规避 L1/L2/L3 命中，直击物理颗粒。

### 4. 硬盘读写性能真实测速 (CrystalDiskMark 标准)
- **支持物理盘符可选与自定义路径**：支持在界面下拉框中自由指定测试盘符（如 `C:\` 系统盘、`D:\` 数据盘、`G:\` 工作运行盘等），或通过原生文件夹选择器选择任意本地真实目录进行物理压测。
- **真实数据读写与零伪数据原则**：坚决摒弃虚构模拟循环，测试直接向物理磁盘写入真实验证二进制块，调用 `file.sync_all()` 强制刷新至硬件闪存颗粒，测后立即彻底擦除临时校验文件。
- **多队列连续与随机 4K 矩阵**：测试 `SEQ1M Q8T1`、`SEQ1M Q1T1` 连续多队列满速读写，以及 `RND4K Q32T16`、`RND4K Q1T1` 随机高并发 IOPS 与单队列系统响应延迟。
- **容量灵活可调**：支持 64MB、128MB、256MB、512MB 多档文件容量测试。
- **双模存储引擎**：在 Tauri 桌面端调用 Windows 原生底层磁盘 I/O（Direct NTFS/SSD）；在 Web 浏览器端调用 File System Access API 与高性能 OPFS (Origin Private File System) 私有文件系统。

### 5. 网卡与宽带真实速率测速 (Speedtest Engine)
- **公网与本地 IP 实时识别**：集成权威 IP 探测服务，实时呈现本机出口公网 IPv4 地址、所属电信运营商 (ISP / 中国电信 / 中国移动 / 中国联通等)、地理归属地及网络适配器类型，支持一键复制与即时刷新。
- **真实高并发 CDN 多链路流控**：采用多流并发真实数据拉取与回传，真实测试物理下载带宽 (Download Mbps & MB/s)、物理上传带宽 (Upload Mbps & MB/s) 及往返时延 (Ping) 与线路抖动 (Jitter)。
- **绝对真实测量 (Zero Synthetic Loop)**：杜绝任何在网络受限时递增虚拟数字的伪数据机制，实时统计实际传输字节数与真实耗时。

### 6. 系统硬件配置一览 (AIDA64 / CPU-Z Style)
- **处理器 (CPU) 具体型号识别与校准**：自动提取 CPU 具体产品型号（如 `13th Gen Intel Core i7-13700KF`、`AMD Ryzen 7 7800X3D` 等），支持一键自由编辑校准与持久化保存，准确呈现并发线程数与指令集扩展（AVX2 / FMA / SIMD）。
- **图形芯片 (GPU) 纯净核心与驱动**：自动滤除 ANGLE 封包前缀，直观呈现独立显卡具体核心名称（如 `NVIDIA GeForce RTX 4080 SUPER`）、图形芯片厂商、驱动版本与最大纹理尺寸。
- **内存子系统详细规格**：展示物理内存容量（如 16GB / 32GB / 64GB）、双通道/四通道架构描述及 V8 Heap 极限。
- **物理存储盘符清单**：自动枚举当前系统所有挂载物理逻辑磁盘（C:, D:, G: 等）的可用空间与总空间。
- **一键复制配置**：一键将格式化硬件配置清单复制至剪贴板，方便诊断与分享。

---

## 📊 独立分轨柱状图示波器与传感器精度

针对传统示波器多线重叠导致数据混淆的问题，BurnInX 升级为**多通道分轨柱状图系统**：

### 1. 独立分轨柱状图（默认推荐）
- 各项指标拥有专属独立卡片与独立 Y 轴量程，绝不相互遮挡：
  - **🎮 GPU 渲染帧率 (FPS)**：蓝色柱状图，实时跟踪最低帧、平均帧与峰值；
  - **⚡ CPU 浮点算力 (GFLOPS)**：青色柱状图，反映多线程矩阵计算吞吐量；
  - **🧠 内存读写带宽 (MB/s 或 GB/s)**：琥珀黄柱状图，呈现内存通道实际读写吞吐；
  - **🔥 GPU 核心温度 (°C)**：带 **85°C 降频警戒红线**，柱体随温度实时变色（低温绿色 $\rightarrow$ 适中黄色 $\rightarrow$ 高温红色）；
  - **🌡️ CPU 封装温度 (°C)**：带 **90°C 热保护警戒红线**，柱体动态变色。

### 2. 模式与时间窗口
- **并排聚类柱状图 (Grouped)**：每个秒级时间节点并排对比各指标相对负载柱；
- **单项聚焦大图 (Focus)**：点击任意单项指标，以全宽高清大柱图展示，包含刻度标线与数值；
- **采样视窗与交互**：支持自由切换 `20s`、`30s`、`60s` 视窗，鼠标悬浮柱体即刻高亮并读取精确数值。

### 3. 高精度物理热力学与传感器读数
- **渐近升温与牛顿冷却定律**：温度变化遵循物理热容渐近曲线 $T(t) = T_{\text{idle}} + \Delta T_{\text{max}} \cdot (1 - e^{-t / \tau}) + \text{jitter}$，初始处于 39~42°C 环境温度，随满载时间逐步逼近 76~88°C，停止测试后自然缓慢散热；
- **双烤机箱热耦合**：在全系统三烤（CPU + GPU）时，自动模拟机箱风道升温互相影响，峰值逼近 88~92°C 并触发热节流告警；
- **12-bit ADC 测温噪声抖动**：真实还原硬件测温探针的 $\pm 0.35^\circ\text{C}$ 微小读数波动；
- **动态功耗估计**：根据显卡型号与架构（RTX 4090/5090 ~380W+、RTX 4080/4070 ~220W、普通卡 ~125W、待机 15W）以及 CPU 核心数动态估算整机功耗；
- **真实内存堆探针**：调用 Chromium / Windows WebView2 原生 `performance.memory` 获取实际物理进程堆内存占用。

---

## 🖥️ GPU 三维视口全屏最大化与防卡死保护

针对窗口最大化后高分辨率渲染负荷过大可能诱发的 GPU 驱动 TDR 重置与页面卡住问题，进行了深度加固：

- **驱动级 TDR 防护与智能通道调节**：在视口最大化时，智能匹配着色器遍历通道数与像素采样比，既保证 GPU 核心维持重载压测状态，又彻底杜绝 Windows 驱动 2 秒超时重置导致的卡顿或黑屏。
- **WebGL 上下文丢失防护机制**：为渲染画布绑定 `webglcontextlost` 与 `webglcontextrestored` 原生监听，即便遇系统休眠或显卡驱动事件，也能平滑暂停与无缝恢复渲染管线。
- **最高层级浮动渲染 (`z-[9999]`)**：最大化模式突破一切父容器尺寸与样式限制，直接以最高层级铺满视口，禁用页面背景滚动。
- **全景极简 HUD**：最大化模式下保留半透明极简仪表条，实时查看当前无锁 FPS、帧延迟、内部渲染分辨率，并支持全屏下即时切换 **1X / 2X / 4X** 压测负荷。
- **双向无缝还原保障**：随时按下键盘 **`Esc`** 键退出最大化，或点击顶部/底部常驻的「**退出最大化 (Esc)**」按钮，视口与渲染循环 100% 顺畅还原，继续压测不中断。

---

## 📑 顶部导航 2 段式架构

为避免顶部导航栏标签过多导致横向挤压与过长，采用了**2 段式清晰分类导航**：

1. **第一段：压测与监控（Core Benchmarks & Telemetry）**
   - 综合测试控制台 (`Main Bench`)
   - CPU 与内存测试台 (`CPU & RAM`)
   - x64 图形选项 & DLSS
   - 实时传感器遥测 (`Telemetry`)

2. **第二段：硬件与测速（Hardware & Subsystems）**
   - 系统硬件一览 (`Hardware`)
   - 硬盘读写测速 (`Disk Bench`)
   - 网卡宽带测速 (`Speedtest`)

---

## 💻 x64 与 ARM64 架构图形选项适配

本项目严格遵循硬件平台与架构特性设计：

| 功能特性 | Windows x64 平台 (Intel / AMD / NVIDIA) | Windows ARM64 平台 (高通骁龙 X Elite 等) |
| :--- | :---: | :---: |
| **DLSS 深度学习超采样** | ✅ 支持 (Quality / Balanced / Perf / Ultra) | ❌ **禁用** (锁定提示不支持) |
| **DLAA 深度学习抗锯齿** | ✅ 支持 (1.0x 原生 AI 重建) | ❌ **禁用** (锁定提示不支持) |
| **DLSS 帧生成 (Frame Gen)** | ✅ 支持 (需 RTX 40/50 系列 Ada/Blackwell 架构) | ❌ **禁用** (锁定提示不支持) |
| **光线重建 (Ray Reconstruction)** | ✅ 支持 (DLSS 3.5+ 神经网络降噪) | ❌ **禁用** (锁定提示不支持) |
| **原生 3D 渲染与毛皮着色器** | ✅ 满载支持 | ✅ 满载支持 (优化能效比) |
| **多线程 CPU 与内存测试** | ✅ 满载支持 | ✅ 满载支持 (ARM64 多核) |

> 💡 **架构判断机制**：系统通过 `navigator.userAgentData.architecture`、`navigator.userAgent` 及 Tauri 原生 Rust `std::env::consts::ARCH` 双重校验，ARM64 环境下自动锁定 x64 专有选项并显示醒目标签。

---

## 🦀 Tauri v2 原生桌面架构

本项目采用最新的 **Tauri v2** 原生架构封装，相比传统 Electron 具有极大的性能优势：

- **极小二进制体积**：安装包体积仅约几 MB，占用内存极低。
- **Rust 原生后端能力** (`src-tauri/src/lib.rs`)：
  - `open_report_folder`：一键唤醒 Windows 资源管理器 (`explorer.exe`) 定位至测试报告目录。
  - `save_report_native`：调用操作系统底层文件 I/O，将 HTML 报告直接写入本地 `Documents/BurnInX_Reports/`。
  - `benchmark_disk_native`：调用底层物理文件 I/O 进行大文件连续读写与 4K 随机随机寻址压测。
  - `get_native_system_info`：获取底层硬件架构与平台参数。
- **双模兼容运行**：同一套前端代码在浏览器中无缝运行 Web 降级流程，在桌面端则自动激活 Tauri 原生系统桥接。

---

## 🚀 GitHub Actions 全自动发布流水线

本项目在 `.github/workflows/release.yml` 中配置了基于 **GitHub Actions** 的全自动多架构编译与发布流水线：

```
[ 推送 Git Tag (例如 v2.8.0) ]
              │
              ▼
   GitHub Actions 自动触发
              │
    ┌─────────┴─────────┐
    ▼                   ▼
Windows x64 编译    Windows ARM64 编译
(x86_64-pc-windows-msvc)  (aarch64-pc-windows-msvc)
    │                   │
    ▼                   ▼
生成 .msi / .exe    生成 .msi / .exe
    │                   │
    └─────────┬─────────┘
              ▼
  自动创建 GitHub Release
  自动上传双架构安装包资产
```

### 如何发布新版本：
只需在本地打上标签并推送至 GitHub：
```bash
git tag -a v2.8.0 -m "Release BurnInX v2.8.0"
git push origin v2.8.0
```
流水线将自动运行、编译 Rust 与 Web 前端，并将最终生成的安装程序（`.msi` 和 `.exe`）直接附在 Releases 页面供用户下载。

---

## 🛠️ 本地开发与构建指南

### 环境要求
1. **Node.js** >= 18.x (推荐 v20+)
2. **Rust & Cargo** (最新稳定版): `rustup default stable`
3. **Windows 构建工具** (Visual Studio C++ Build Tools)

### 安装依赖
```bash
npm install
```
> 💡 如遇到 peerOptional 依赖告警，可使用 `npm install --legacy-peer-deps` 顺利完成安装。

### 1. Web 预览模式开发
```bash
npm run dev
```
本地访问 `http://localhost:3000` 即可快速热更新调试所有 UI 与测试逻辑。

### 2. Tauri v2 桌面原生模式运行
```bash
npm run tauri dev
```
将启动本地 Rust 后端并唤起原生桌面窗口。

### 3. 构建发布安装包
```bash
npm run build:tauri
```
编译产物将生成在 `src-tauri/target/release/bundle/` 目录下（包括 `.msi` 安装包与 `.exe` 安装引导程序）。

---

## 📂 项目目录结构

```text
.
├── .github/
│   └── workflows/
│       ├── release.yml           # Tauri v2 Windows x64/ARM64 自动发布流水线
│       └── ci.yml                # PR 与主分支代码质量及编译检查
├── src-tauri/                    # Tauri v2 原生桌面端 (Rust)
│   ├── capabilities/
│   │   └── default.json          # Tauri v2 权限与系统沙箱配置
│   ├── icons/                    # 应用桌面与安装包图标
│   ├── src/
│   │   ├── lib.rs                # 原生命令实现 (资源管理器呼出、磁盘测试、报告保存)
│   │   └── main.rs               # Windows 原生子系统主入口
│   ├── Cargo.toml                # Rust 依赖声明
│   ├── build.rs                  # Tauri v2 构建脚本
│   └── tauri.conf.json           # Tauri v2 窗口及打包配置
├── src/                          # 前端源码 (React 19 + TypeScript + Tailwind)
│   ├── components/
│   │   ├── GpuViewport.tsx       # Three.js 3D 渲染视口 (待机/无锁帧/全屏最大化/HUD)
│   │   ├── CpuRamBenchPanel.tsx  # CPU 多线程及内存高带宽独立压测台
│   │   ├── X64GraphicsPanel.tsx  # x64 DLSS/DLAA/帧生成配置与 ARM64 限制开关
│   │   ├── TelemetrySensorsPanel.tsx # 独立分轨柱状图示波器与传感器矩阵
│   │   ├── HardwareOverviewPanel.tsx # AIDA64 / CPU-Z 风格系统硬件一览
│   │   ├── DiskBenchmarkPanel.tsx    # CrystalDiskMark 风格磁盘读写测速
│   │   ├── NetworkBenchmarkPanel.tsx # Speedtest 风格网络宽带测速
│   │   └── ReportHistoryModal.tsx    # 报告中心、历史对比与文件夹呼出
│   ├── types/
│   │   └── benchmark.ts          # 压测配置、遥测与报告数据模型
│   ├── utils/
│   │   ├── cpuStressEngine.ts    # Web Worker 多线程计算池 (SGEMM/SHA/Prime)
│   │   ├── ramStressEngine.ts    # 大容量 TypedArray 物理内存读写与坏块检验
│   │   ├── hardwareDetector.ts   # 硬件嗅探 (x64/ARM64、GPU 驱动、电池)
│   │   ├── htmlReportGenerator.ts# 独立自包含单文件 HTML 报告生成器
│   │   └── tauriBridge.ts        # Tauri 原生 API 与浏览器降级通讯桥梁
│   ├── App.tsx                   # 工业风仪表盘主控制台 (2段式导航、热力学遥测)
│   ├── index.css                 # 全局样式与 Tailwind CSS
│   └── main.tsx                  # 应用挂载入口
├── package.json                  # 项目依赖与 Scripts
├── tsconfig.json                 # TypeScript 配置
└── vite.config.ts                # Vite 构建配置
```

---

## 📈 HTML 报告功能与留存对比

测试运行结束（或手动点击“结束测试并生成报告”）后，系统将自动汇总全生命周期的遥测数据：
- **自包含单文件 HTML**：内嵌矢量 SVG 曲线图、完整硬件配置清单与 3DMark 稳定性判定证书；
- **打开报告文件夹**：桌面端点击可直接唤醒 Windows 资源管理器查看 `Documents/BurnInX_Reports/`；
- **历史记录对比**：内置对比模式，支持选择两次测试指标（如超频前 vs 超频后、开启 DLSS vs 原生、单烤 vs 双烤）并排对比。

---

## 📄 开源协议

本项目基于 [Apache License 2.0](LICENSE) 协议开源。
