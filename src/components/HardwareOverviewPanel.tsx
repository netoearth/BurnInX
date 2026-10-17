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
  ShieldAlert,
  Copy,
  Check,
  Zap,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HardwareOverviewPanelProps {
  specs: SystemSpecs | null;
}

export const HardwareOverviewPanel: React.FC<HardwareOverviewPanelProps> = ({ specs }) => {
  const [copied, setCopied] = useState(false);

  const handleCopySpecs = () => {
    if (!specs) return;
    const text = `
=== BurnInX 硬件配置清单 ===
操作系统: ${specs.osName} (${specs.arch.toUpperCase()})
中央处理器 (CPU): ${specs.logicalCores} 逻辑核心 / 架构 ${specs.arch}
图形处理器 (GPU): ${specs.gpuRenderer}
GPU 厂商与驱动: ${specs.gpuVendor} (${specs.gpuDriverGuess})
内存规格: ${specs.deviceMemoryGb ? `${specs.deviceMemoryGb} GB 物理内存` : '系统可用动态内存'}
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
              深度解析当前设备 CPU、GPU、内存、显示屏与供电架构
            </p>
          </div>
        </div>

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

      {/* Grid of Hardware Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. CPU Processor Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Cpu className="w-5 h-5" />
              <span>中央处理器 (Processor / CPU)</span>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              {specs?.logicalCores || 8} Threads
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">逻辑核心数 (Concurrency):</span>
              <span className="font-mono text-slate-200 font-semibold">{specs?.logicalCores} 线程并发</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">指令集架构 (Architecture):</span>
              <span className="font-mono text-emerald-400 font-semibold">{specs?.arch.toUpperCase()} ({specs?.isArm64 ? 'ARM64 架构' : 'x64 64位桌面'})</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">多线程计算算力估算:</span>
              <span className="font-mono text-cyan-400 font-semibold">AVX2 / FMA / SIMD 支持</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">CPU 调度策略:</span>
              <span className="font-mono text-slate-300">Web Worker 并行计算隔离池</span>
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
              {specs?.isNvidiaRtx ? 'NVIDIA RTX' : 'GPU-Z'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">显卡核心型号:</span>
              <span className="font-mono text-slate-200 font-semibold truncate max-w-[200px]" title={specs?.gpuRenderer}>
                {specs?.gpuRenderer.split('/')[0]}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">图形芯片厂商 (Vendor):</span>
              <span className="font-mono text-amber-400 font-semibold">{specs?.gpuVendor}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">驱动与图形管线:</span>
              <span className="font-mono text-slate-300">{specs?.gpuDriverGuess}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">最大纹理尺寸 / 采样:</span>
              <span className="font-mono text-cyan-400">{specs?.maxTextureSize} × {specs?.maxTextureSize} (Aniso: {specs?.maxAnisotropy}x)</span>
            </div>
          </div>
        </div>

        {/* 3. Memory & Storage Architecture */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <MemoryStick className="w-5 h-5" />
              <span>内存与存储子系统 (Memory & Storage)</span>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
              DDR / NVMe
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">物理内存容量估计:</span>
              <span className="font-mono text-cyan-400 font-semibold">
                {specs?.deviceMemoryGb ? `${specs.deviceMemoryGb} GB 物理内存` : '系统可用物理内存'}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">内存通道压力检验:</span>
              <span className="font-mono text-slate-200">TypedArray 连续物理缓冲区直通</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">存储引擎 (Storage Driver):</span>
              <span className="font-mono text-emerald-400 font-semibold">Windows NTFS Direct I/O / OPFS</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">坏块检测机制:</span>
              <span className="font-mono text-slate-300">0x55 / 0xAA 走马灯位翻转校验</span>
            </div>
          </div>
        </div>

        {/* 4. Display, OS & Power Architecture */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <Monitor className="w-5 h-5" />
              <span>显示屏与操作系统环境 (OS & Power)</span>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
              {specs?.osName}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">屏幕物理分辨率:</span>
              <span className="font-mono text-purple-400 font-semibold">{specs?.screenResolution}</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">操作系统版本:</span>
              <span className="font-mono text-slate-200 font-semibold">{specs?.osName} ({specs?.platform})</span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">供电电源模式:</span>
              <span className="font-mono text-amber-400 font-semibold">
                {specs?.batteryStatus.powerSource === 'AC_ADAPTER' ? '🔌 交流电已插上 (最高性能状态)' : '🔋 电池供电'}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-slate-950/60 rounded border border-slate-800/80">
              <span className="text-slate-400">电池充电与电量:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {specs?.batteryStatus.charging ? '充电中' : '放电中'} ({specs?.batteryStatus.level ? `${Math.round(specs.batteryStatus.level * 100)}%` : '100%'})
              </span>
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
