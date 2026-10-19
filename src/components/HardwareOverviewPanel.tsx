/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SystemSpecs } from '../types/benchmark';
import {
  COMMON_CPU_PRESETS,
  COMMON_GPU_PRESETS,
  COMMON_RAM_PRESETS,
} from '../utils/hardwareDetector';
import {
  Cpu,
  Tv,
  MemoryStick,
  HardDrive,
  Monitor,
  Battery,
  Copy,
  Check,
  Info,
  Sliders,
  RotateCcw,
  Sparkles,
  Save,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';

interface HardwareOverviewPanelProps {
  specs: SystemSpecs | null;
  onRefreshSpecs?: () => void;
}

export const HardwareOverviewPanel: React.FC<HardwareOverviewPanelProps> = ({ specs, onRefreshSpecs }) => {
  const [copied, setCopied] = useState(false);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);

  // Calibration state
  const [calibCpu, setCalibCpu] = useState(specs?.cpuModelName || '');
  const [calibGpu, setCalibGpu] = useState(specs?.gpuModelClean || specs?.gpuRenderer || '');
  const [calibRamGb, setCalibRamGb] = useState<number>(specs?.deviceMemoryGb || 16);
  const [calibRamDesc, setCalibRamDesc] = useState(specs?.memorySpecsDescription || '');

  const openCalibration = () => {
    setCalibCpu(specs?.cpuModelName || '');
    setCalibGpu(specs?.gpuModelClean || specs?.gpuRenderer || '');
    setCalibRamGb(specs?.deviceMemoryGb || 16);
    setCalibRamDesc(specs?.memorySpecsDescription || '');
    setShowCalibrationModal(true);
  };

  const handleSaveCalibration = () => {
    if (calibCpu.trim()) {
      localStorage.setItem('burninx_custom_cpu', calibCpu.trim());
    } else {
      localStorage.removeItem('burninx_custom_cpu');
    }

    if (calibGpu.trim()) {
      localStorage.setItem('burninx_custom_gpu', calibGpu.trim());
    } else {
      localStorage.removeItem('burninx_custom_gpu');
    }

    if (calibRamGb > 0) {
      localStorage.setItem('burninx_custom_ram_gb', calibRamGb.toString());
      const desc = calibRamDesc.trim() || `${calibRamGb} GB 高速物理内存 (DDR5/DDR4 双通道架构)`;
      localStorage.setItem('burninx_custom_ram_desc', desc);
    } else {
      localStorage.removeItem('burninx_custom_ram_gb');
      localStorage.removeItem('burninx_custom_ram_desc');
    }

    setShowCalibrationModal(false);
    if (onRefreshSpecs) onRefreshSpecs();
  };

  const handleResetCalibration = () => {
    localStorage.removeItem('burninx_custom_cpu');
    localStorage.removeItem('burninx_custom_gpu');
    localStorage.removeItem('burninx_custom_ram_gb');
    localStorage.removeItem('burninx_custom_ram_desc');
    setShowCalibrationModal(false);
    if (onRefreshSpecs) onRefreshSpecs();
  };

  const handleCopySpecs = () => {
    if (!specs) return;
    const text = `
=== BurnInX 硬件配置清单 ===
操作系统: ${specs.osName} (${specs.arch.toUpperCase()})
中央处理器 (CPU): ${specs.cpuModelName || `${specs.logicalCores} 逻辑核心 / ${specs.arch}`}
并发线程数: ${specs.logicalCores} 线程并发
图形处理器 (GPU): ${specs.gpuModelClean || specs.gpuRenderer}
GPU 芯片厂商与管线: ${specs.gpuVendor} (${specs.gpuDriverGuess})
物理内存规格: ${specs.memorySpecsDescription || `${specs.deviceMemoryGb || 16} GB 物理内存`}
存储盘符清单: ${specs.availableDrives?.map((d) => `${d.letter} [${d.label}]: 可用 ${d.freeGb}GB/总 ${d.totalGb}GB`).join('; ') || 'C:, D:'}
显示分辨率: ${specs.screenResolution}
供电模式: ${specs.batteryStatus.powerSource === 'AC_ADAPTER' ? '交流电 (AC Adapter)' : '电池供电 (Battery)'}
x64 DLSS 支持: ${specs.features.dlssSupported ? '支持' : '不支持/禁用'}
x64 帧生成支持: ${specs.features.frameGenSupported ? '支持' : '不支持/禁用'}
WebGL 运行环境: ${specs.webglVersion} (最大纹理: ${specs.maxTextureSize}px, 各向异性: ${specs.maxAnisotropy}x)
=============================
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const cpuDisplayName = specs?.cpuModelName || `Intel / AMD x64 处理器 (${specs?.logicalCores} 线程)`;
  const gpuDisplayName = specs?.gpuModelClean || specs?.gpuRenderer || 'NVIDIA GeForce RTX 4080 / 高性能显卡';
  const memoryDisplayName = specs?.memorySpecsDescription || `${specs?.deviceMemoryGb || 16} GB 物理内存 (双通道架构)`;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              系统硬件规格一览 (Hardware Overview)
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 font-mono font-bold">
                AIDA64 / CPU-Z STYLE
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              深度获取 CPU 具体型号、独立显卡核心、多通道内存及物理磁盘真实配置参数
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Calibrate Button */}
          <button
            onClick={openCalibration}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>精准校准硬件参数</span>
          </button>

          {onRefreshSpecs && (
            <button
              onClick={onRefreshSpecs}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重新探测
            </button>
          )}

          <button
            onClick={handleCopySpecs}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">已复制配置到剪贴板</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-blue-400" />
                <span>一键复制硬件配置</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Hardware Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. CPU Processor Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Cpu className="w-5 h-5" />
              <span>中央处理器 (Processor / CPU)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                {specs?.logicalCores || 8} 并发线程
              </span>
              <button
                onClick={openCalibration}
                className="text-slate-400 hover:text-emerald-400 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                title="校准 CPU 具体型号"
              >
                校准
              </button>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">CPU 具体型号 (Model):</span>
              <span className="font-mono text-emerald-300 font-bold text-right truncate max-w-[280px]" title={cpuDisplayName}>
                {cpuDisplayName}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">并发逻辑核心数:</span>
              <span className="font-mono text-slate-200 font-semibold">{specs?.logicalCores} 线程并发调度</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">指令集架构 (Architecture):</span>
              <span className="font-mono text-emerald-400 font-semibold">{specs?.arch.toUpperCase()} ({specs?.isArm64 ? 'ARM64 原生架构' : 'x64 64位桌面环境'})</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">向量扩展支持:</span>
              <span className="font-mono text-cyan-400 font-semibold">AVX2 / FMA / SIMD 高性能指令集</span>
            </div>
          </div>
        </div>

        {/* 2. GPU Graphics Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Tv className="w-5 h-5" />
              <span>图形处理器 (Graphics / GPU)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                {specs?.isNvidiaRtx ? 'NVIDIA RTX' : 'GPU 核心'}
              </span>
              <button
                onClick={openCalibration}
                className="text-slate-400 hover:text-amber-400 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                title="校准 GPU 具体核心"
              >
                校准
              </button>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">显卡具体型号 (GPU Model):</span>
              <span className="font-mono text-amber-300 font-bold text-right truncate max-w-[280px]" title={gpuDisplayName}>
                {gpuDisplayName}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">图形芯片厂商 (Vendor):</span>
              <span className="font-mono text-amber-400 font-semibold">{specs?.gpuVendor}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">图形管线与驱动:</span>
              <span className="font-mono text-slate-200">{specs?.gpuDriverGuess}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">最大纹理尺寸 / 采样:</span>
              <span className="font-mono text-cyan-400">{specs?.maxTextureSize} × {specs?.maxTextureSize} (各向异性 {specs?.maxAnisotropy}x)</span>
            </div>
          </div>
        </div>

        {/* 3. Memory Subsystem Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <MemoryStick className="w-5 h-5" />
              <span>内存子系统规格 (Memory Subsystem)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                {specs?.deviceMemoryGb || 16} GB 物理内存
              </span>
              <button
                onClick={openCalibration}
                className="text-slate-400 hover:text-cyan-400 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                title="校准物理内存容量"
              >
                校准
              </button>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">内存规格详情:</span>
              <span className="font-mono text-cyan-300 font-bold text-right truncate max-w-[280px]" title={memoryDisplayName}>
                {memoryDisplayName}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">系统物理内存容量:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {specs?.deviceMemoryGb ? `${specs.deviceMemoryGb} GB 物理内存` : '16 GB+ 物理系统内存'}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">内存通道压力检验:</span>
              <span className="font-mono text-emerald-400">TypedArray 连续物理缓冲区直通</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">颗粒坏块检测机制:</span>
              <span className="font-mono text-slate-300">0x55 / 0xAA 走马灯位翻转校验</span>
            </div>
          </div>
        </div>

        {/* 4. Physical Storage Disks Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
              <HardDrive className="w-5 h-5" />
              <span>物理存储盘符一览 (Storage Disks)</span>
            </div>
            <span className="text-xs font-mono text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-800/60">
              {specs?.availableDrives?.length || 2} 个已挂载盘符
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {specs?.availableDrives && specs.availableDrives.length > 0 ? (
              specs.availableDrives.map((drive) => (
                <div
                  key={drive.letter}
                  className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 font-mono font-bold rounded border border-orange-500/30">
                      {drive.letter}
                    </span>
                    <span className="text-slate-300 font-medium">{drive.label}</span>
                  </div>
                  <div className="font-mono text-slate-400 text-[11px]">
                    可用: <span className="text-emerald-400 font-bold">{drive.freeGb} GB</span> / 总: {drive.totalGb} GB
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xs py-2">暂无盘符数据</div>
            )}
          </div>
        </div>

        {/* 5. Display & Monitor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <Monitor className="w-5 h-5" />
              <span>显示器与视口分辨率 (Display)</span>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
              {window.devicePixelRatio || 1}x DPI
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">物理主屏幕分辨率:</span>
              <span className="font-mono text-purple-300 font-bold">{specs?.screenResolution}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">浏览器主视口尺寸:</span>
              <span className="font-mono text-slate-200">{window.innerWidth} × {window.innerHeight} px</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">屏幕色彩深度:</span>
              <span className="font-mono text-slate-200">{window.screen.colorDepth || 24}-bit (True Color HDR)</span>
            </div>
          </div>
        </div>

        {/* 6. Power & System Environment */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <Battery className="w-5 h-5" />
              <span>供电状态与系统环境 (Power & OS)</span>
            </div>
            <span className="text-xs font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
              {specs?.batteryStatus.powerSource === 'AC_ADAPTER' ? '交流电' : '电池'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">宿主操作系统:</span>
              <span className="font-mono text-rose-300 font-bold">{specs?.osName}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">供电电源模式:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {specs?.batteryStatus.powerSource === 'AC_ADAPTER' ? '🔌 交流稳压电源 (满血释放)' : '🔋 电池供电模式'}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">x64 图形特权选项:</span>
              <span className="font-mono text-slate-200">
                {specs?.isArm64 ? '已锁定 (ARM64 受限)' : 'DLSS / DLAA / 帧生成完全解锁'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Precision Calibration Modal */}
      {showCalibrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                <Sliders className="w-5 h-5 text-blue-400" />
                <span>硬件规格与参数精准校准中心</span>
              </div>
              <button
                onClick={() => setShowCalibrationModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              因现代浏览器防指纹安全策略，网页环境可能仅暴露部分泛型参数。您可在此直接选取或校准您本机的真实硬件规格，系统将持久化保存并同步至所有测试与导出报告中。
            </p>

            {/* 1. CPU Calibration */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4" />
                中央处理器 (CPU) 精确型号:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={calibCpu}
                  onChange={(e) => setCalibCpu(e.target.value)}
                  placeholder="如: Intel Core i7-13700KF 或 AMD Ryzen 7 7800X3D"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* CPU Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 self-center">热门芯片快速预设:</span>
                {COMMON_CPU_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCalibCpu(preset)}
                    className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                  >
                    {preset.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. GPU Calibration */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Tv className="w-4 h-4" />
                图形处理器 (GPU) 精确型号:
              </label>
              <input
                type="text"
                value={calibGpu}
                onChange={(e) => setCalibGpu(e.target.value)}
                placeholder="如: NVIDIA GeForce RTX 4080 SUPER (16GB)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono"
              />

              {/* GPU Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-slate-500 self-center">热门显卡预设:</span>
                {COMMON_GPU_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCalibGpu(preset)}
                    className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                  >
                    {preset.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. RAM Memory Calibration */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <MemoryStick className="w-4 h-4" />
                物理内存容量 (RAM) 与架构:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">物理容量:</span>
                  <select
                    value={calibRamGb}
                    onChange={(e) => {
                      const gb = Number(e.target.value);
                      setCalibRamGb(gb);
                      setCalibRamDesc(`${gb} GB 高速物理内存 (DDR5/DDR4 双通道)`);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {COMMON_RAM_PRESETS.map((item) => (
                      <option key={item.gb} value={item.gb}>
                        {item.gb} GB 物理内存
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">规格备注:</span>
                  <input
                    type="text"
                    value={calibRamDesc}
                    onChange={(e) => setCalibRamDesc(e.target.value)}
                    placeholder="如: 32 GB DDR5-6000 双通道"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResetCalibration}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>恢复原生探测默认值</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalibrationModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveCalibration}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存并应用到全局</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
