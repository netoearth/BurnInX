# BurnInX - GPU、CPU 与内存综合压力测试工具

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Tauri%20v2%20Native-orange?style=for-the-badge&logo=tauri" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Platform-Windows%20x64%20%7C%20ARM64-blue?style=for-the-badge&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Graphics-Three.js%20%7C%20WebGL-emerald?style=for-the-badge&logo=three.js" alt="Three.js" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
</p>

一款面向 **Windows** 平台的现代化硬件压力测试与运行监控诊断平台。将 **GPU 三维负载**、**CPU 多线程高压计算**、**内存高带宽稳定性校验**、**实时运行监控** 与 **专业离线 HTML 诊断报告** 整合于一体，方便直观观察设备在极限负荷下的稳定性、散热表现及功耗节流状态。

---

## 📑 目录

- [✨ 核心设计与特性](#-核心设计与特性)
- [🖥️ x64 与 ARM64 架构图形选项适配](#️-x64-与-arm64-架构图形选项适配)
- [🦀 Tauri v2 原生桌面架构](#-tauri-v2-原生桌面架构)
- [🚀 GitHub Actions 全自动发布流水线](#-github-actions-全自动发布流水线)
- [🛠️ 本地开发与构建指南](#️-本地开发与构建指南)
- [📂 项目目录结构](#-项目目录结构)
- [📊 HTML 报告功能与留存对比](#-html-报告功能与留存对比)
- [📄 开源协议](#-开源协议)

---

## ✨ 核心设计与特性

### 1. GPU 三维压力场景 (GPU Stress Bench)
- **待机零开销机制**：未启动 GPU 测试时，**彻底关闭三维压力场景与 WebGL 渲染管线**，GPU 占用保持为 0%，节省电力且不干扰 CPU / 内存独立测试。
- **无锁帧满载渲染**：测试启动后立即解除测试帧率上限（Unlimited FPS），以极速循环与多通道着色器遍历榨干 GPU 核心算力与像素填充率。
- **经典毛发甜甜圈（Fur Donut）**：采用多层几何外壳（Fur Shells，可调 16 ~ 64 层）、动态气流位移扰动、高温发光核与多达 50,000 颗烈焰粒子风暴。
- **全方位帧表现遥测**：实时统计当前 FPS、平均 FPS、最高/最低 FPS、**1% Low 掉帧监测**及逐帧渲染时间（Frametime ms）。

### 2. CPU 多线程独立计算负载 (CPU Stress Lab)
- **多线程 Worker 池**：自动嗅探系统硬件逻辑核心数，支持自由调节并发工作线程（单核 1T、全核满载、超载 200%）。
- **4 类高强度算法**：
  - `SGEMM 密集浮点矩阵乘法`：重度压迫 AVX / FPU 单元，激发极高核心功耗与热量。
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

### 4. 实时硬件传感器监控
- 实时绘制 **FPS 曲线**、**Frametime 离散度**、**GPU 核心温度** 与 **CPU 封装温度** 示波器。
- **90°C 热节流预警**：检测到过温时自动警示可能触发的热保护降频（Thermal Throttling）。
- **3DMark 稳定性评分机制**：测试全程帧率波动方差评估，>= 97.0% 判定为 PASS。

---

## 🖥️ x64 与 ARM64 架构图形选项适配

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
│   │   ├── lib.rs                # 原生命令实现 (资源管理器呼出、文件保存)
│   │   └── main.rs               # Windows 原生子系统主入口
│   ├── Cargo.toml                # Rust 依赖声明
│   ├── build.rs                  # Tauri v2 构建脚本
│   └── tauri.conf.json           # Tauri v2 窗口及打包配置
├── src/                          # 前端源码 (React 19 + TypeScript + Tailwind)
│   ├── components/
│   │   ├── GpuViewport.tsx       # Three.js 3D 渲染视口 (待机/无锁帧/毛皮甜甜圈)
│   │   ├── CpuRamBenchPanel.tsx  # CPU 多线程及内存高带宽独立压测台
│   │   ├── X64GraphicsPanel.tsx  # x64 DLSS/DLAA/帧生成配置与 ARM64 限制开关
│   │   ├── TelemetrySensorsPanel.tsx # 传感器矩阵与实时示波器
│   │   └── ReportHistoryModal.tsx    # 报告中心、历史对比与文件夹呼出
│   ├── types/
│   │   └── benchmark.ts          # 压测配置、遥测与报告数据模型
│   ├── utils/
│   │   ├── cpuStressEngine.ts    # Web Worker 多线程计算池 (SGEMM/SHA/Prime)
│   │   ├── ramStressEngine.ts    # 大容量 TypedArray 物理内存读写与坏块检验
│   │   ├── hardwareDetector.ts   # 硬件嗅探 (x64/ARM64、GPU 驱动、电池)
│   │   ├── htmlReportGenerator.ts# 独立自包含单文件 HTML 报告生成器
│   │   └── tauriBridge.ts        # Tauri 原生 API 与浏览器降级通讯桥梁
│   ├── App.tsx                   # 工业风仪表盘主控制台
│   ├── index.css                 # 全局样式与 Tailwind CSS
│   └── main.tsx                  # 应用挂载入口
├── package.json                  # 项目依赖与 Scripts
├── tsconfig.json                 # TypeScript 配置
└── vite.config.ts                # Vite 构建配置
```

---

## 📊 HTML 报告功能与留存对比

测试运行结束（或手动点击“结束测试并生成报告”）后，系统将自动汇总全生命周期的遥测数据：
- **自包含单文件 HTML**：内嵌矢量 SVG 曲线图、完整硬件配置清单与 3DMark 稳定性判定证书；
- **打开报告文件夹**：桌面端点击可直接唤醒 Windows 资源管理器查看 `Documents/BurnInX_Reports/`；
- **历史记录对比**：内置对比模式，支持选择两次测试指标（如超频前 vs 超频后、开启 DLSS vs 原生、单烤 vs 双烤）并排对比。

---

## 📄 开源协议

本项目基于 [Apache License 2.0](LICENSE) 协议开源。
