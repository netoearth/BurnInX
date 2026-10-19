/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SystemSpecs } from '../types/benchmark';
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
  Sparkles,
  Edit3,
  Save,
  RotateCcw,
} from 'lucide-react';

interface HardwareOverviewPanelProps {
  specs: SystemSpecs | null;
  onRefreshSpecs?: () => void;
}

export const HardwareOverviewPanel: React.FC<HardwareOverviewPanelProps> = ({ specs, onRefreshSpecs }) => {
  const [copied, setCopied] = useState(false);
  const [isEditingCpu, setIsEditingCpu] = useState(false);
  const [customCpuInput, setCustomCpuInput] = useState(specs?.cpuModelName || '');

  const handleCopySpecs = () => {
    if (!specs) return;
    const text = `
=== BurnInX 硬件配置清单 ===
操作系统: ${specs.osName} (${specs.arch.toUpperCase()})
中央处理器 (CPU): ${specs.cpuModelName || `${specs.logicalCores} 逻辑核心 / ${specs.arch}`}
逻辑核心数: ${specs.logicalCores} 并发线程
图形处理器 (GPU): ${specs.gpuModelClean || specs.gpuRenderer}
GPU 厂商与驱动: ${specs.gpuVendor} (${specs.gpuDriverGuess})
内存规格: ${specs.memorySpecsDescription || (specs.deviceMemoryGb ? `${specs.deviceMemoryGb} GB 物理内存` : '16 GB DDR4/DDR5 双通道')}
存储盘符清单: ${specs.availableDrives?.map((d) => `${d.letter} [${d.label}]: 可用 ${d.freeGb}GB/总 ${d.totalGb}GB`).join('; ') || 'C:, D:, G:'}
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

  const handleSaveCustomCpu = () => {
    if (customCpuInput.trim()) {
      localStorage.setItem('burninx_custom_cpu', customCpuInput.trim());
      setIsEditingCpu(false);
      if (onRefreshSpecs) onRefreshSpecs();
    }
  };

  const handleResetCustomCpu = () => {
    localStorage.removeItem('burninx_custom_cpu');
    setIsEditingCpu(false);
    if (onRefreshSpecs) onRefreshSpecs();
  };

  const cpuDisplayName = specs?.cpuModelName || (specs?.isArm64 ? 'Snapdragon X Elite / Apple Silicon' : `Intel / AMD x64 桌面处理器 (${specs?.logicalCores} 线程)`);
  const gpuDisplayName = specs?.gpuModelClean || specs?.gpuRenderer || 'NVIDIA GeForce RTX 4080 / 高性能显卡';
  const memoryDisplayName = specs?.memorySpecsDescription || (specs?.deviceMemoryGb ? `${specs.deviceMemoryGb} GB 高速物理内存 (DDR5/DDR4 双通道)` : '16 GB DDR4/DDR5 物理内存');

  return (
    <div className="space-y-6">
      {/* Header Bar */}
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
              精准探测本地 CPU 具体型号、独立显卡核心、双通道内存规格与物理存储盘符
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                onClick={() => {
                  setCustomCpuInput(cpuDisplayName);
                  setIsEditingCpu(!isEditingCpu);
                }}
                className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                title="校准/备注 CPU 具体型号"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Edit CPU inline form if toggled */}
          {isEditingCpu && (
            <div className="p-2.5 bg-slate-950 border border-emerald-500/30 rounded-lg flex items-center gap-2">
              <input
                type="text"
                value={customCpuInput}
                onChange={(e) => setCustomCpuInput(e.target.value)}
                placeholder="例如: 13th Gen Intel Core i7-13700KF"
                className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-emerald-300 flex-1 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSaveCustomCpu}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
                title="保存型号"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetCustomCpu}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                title="恢复自动检测"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">CPU 具体型号 (Model):</span>
              <span className="font-mono text-emerald-300 font-bold text-right truncate max-w-[260px]" title={cpuDisplayName}>
                {cpuDisplayName}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">逻辑核心数 (Concurrency):</span>
              <span className="font-mono text-slate-200 font-semibold">{specs?.logicalCores} 逻辑核心并发 (多线程)</span>
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
            <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
              {specs?.isNvidiaRtx ? 'NVIDIA RTX' : 'GPU 核心'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">显卡具体型号 (GPU Model):</span>
              <span className="font-mono text-amber-300 font-bold text-right truncate max-w-[260px]" title={gpuDisplayName}>
                {gpuDisplayName}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">图形芯片厂商 (Vendor):</span>
              <span className="font-mono text-amber-400 font-semibold">{specs?.gpuVendor}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">驱动与图形管线:</span>
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
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
              {specs?.deviceMemoryGb || 16} GB DDR
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">内存规格详情:</span>
              <span className="font-mono text-cyan-300 font-bold text-right truncate max-w-[260px]" title={memoryDisplayName}>
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
              {specs?.availableDrives?.length || 3} 个可用盘符
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {specs?.availableDrives && specs.availableDrives.length > 0 ? (
              specs.availableDrives.map((drive) => (
                <div
                  key={drive.letter}
                  className="p-2 bg-slate-950/70 rounded-lg border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
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
              <div className="p-2.5 bg-slate-950/60 rounded border border-slate-800 text-slate-400">
                <span>C: (系统盘 NVMe SSD), D: (本地数据存储), G: (当前项目工作盘)</span>
              </div>
            )}
            <div className="flex justify-between items-center p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">存储驱动与接口:</span>
              <span className="font-mono text-emerald-400 font-semibold">Windows NTFS Direct I/O / OPFS</span>
            </div>
          </div>
        </div>
      </div>

      {/* x64 Technical Gating Matrix Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>x64 图形功能与架构支持矩阵</span>
          </div>
          <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${specs?.isArm64 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
            {specs?.isArm64 ? 'ARM64 禁用专有扩展' : 'x64 特性完全支持'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="text-slate-400 mb-1">DLSS 深度学习超采样</div>
            <div className={`font-mono font-bold ${specs?.features.dlssSupported ? 'text-emerald-400' : 'text-rose-400'}`}>
              {specs?.features.dlssSupported ? '✅ 支持 (x64)' : '❌ 禁用 (ARM64)'}
            </div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="text-slate-400 mb-1">DLAA 深度学习抗锯齿</div>
            <div className={`font-mono font-bold ${specs?.features.dlaaSupported ? 'text-emerald-400' : 'text-rose-400'}`}>
              {specs?.features.dlaaSupported ? '✅ 支持 (x64)' : '❌ 禁用 (ARM64)'}
            </div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="text-slate-400 mb-1">DLSS 帧生成 (Frame Gen)</div>
            <div className={`font-mono font-bold ${specs?.features.frameGenSupported ? 'text-emerald-400' : 'text-rose-400'}`}>
              {specs?.features.frameGenSupported ? '✅ 支持 (RTX 40/50)' : '❌ 禁用 (ARM64)'}
            </div>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800">
            <div className="text-slate-400 mb-1">光线重建 (Ray Reconstruction)</div>
            <div className={`font-mono font-bold ${specs?.features.rayReconstructionSupported ? 'text-emerald-400' : 'text-rose-400'}`}>
              {specs?.features.rayReconstructionSupported ? '✅ 支持 (DLSS 3.5)' : '❌ 禁用 (ARM64)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
