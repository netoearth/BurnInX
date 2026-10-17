/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GpuSettings, SystemSpecs, DlssMode } from '../types/benchmark';
import {
  Layers,
  Sparkles,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Lock,
  Cpu,
  Tv,
  Eye,
  Zap,
} from 'lucide-react';

interface X64GraphicsPanelProps {
  specs: SystemSpecs | null;
  settings: GpuSettings;
  setSettings: React.Dispatch<React.SetStateAction<GpuSettings>>;
  gpuRunning: boolean;
}

export const X64GraphicsPanel: React.FC<X64GraphicsPanelProps> = ({
  specs,
  settings,
  setSettings,
  gpuRunning,
}) => {
  const isArm64 = specs?.isArm64 ?? false;
  const isX64 = specs?.isX64 ?? true;
  const dlssSupported = specs?.features.dlssSupported ?? false;
  const frameGenSupported = specs?.features.frameGenSupported ?? false;
  const rayReconSupported = specs?.features.rayReconstructionSupported ?? false;

  const dlssModes: { id: DlssMode; label: string; scale: string; desc: string }[] = [
    { id: 'off', label: '关闭 (原生)', scale: '1.0x', desc: '100% 原始渲染分辨率，纯着色器负荷' },
    { id: 'quality', label: '质量 (Quality)', scale: '0.67x', desc: '67% 内部渲染 + 神经网络超分重构' },
    { id: 'balanced', label: '平衡 (Balanced)', scale: '0.58x', desc: '58% 内部渲染，兼顾画质与高帧率' },
    { id: 'performance', label: '性能 (Performance)', scale: '0.50x', desc: '50% 内部渲染，压榨最高帧数' },
    { id: 'ultra_performance', label: '极限 (Ultra Perf)', scale: '0.33x', desc: '33% 超低内部渲染，专为 4K/8K 极限压测' },
  ];

  return (
    <div className="space-y-6">
      {/* Platform & Architecture Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isArm64
            ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
            : 'bg-indigo-950/30 border-indigo-800/60 text-indigo-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg ${
              isArm64 ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
            }`}
          >
            {isArm64 ? <ShieldAlert className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">
                系统运行架构: {specs?.arch.toUpperCase()} ({specs?.osName})
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  isArm64
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isArm64 ? 'ARM64 模式' : 'x64 原生模式'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              图形硬件: {specs?.gpuRenderer || '检测中...'} &bull; 驱动环境: {specs?.gpuDriverGuess}
            </p>
          </div>
        </div>

        {isArm64 && (
          <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>ARM64 版已禁用 DLSS、DLAA、帧生成与光线重建</span>
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: x64 Graphics & Neural Upscaling */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-slate-100">x64 专有图形扩展与超分辨率技术</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">RTX 驱动功能模拟</span>
          </div>

          {/* DLSS Mode Selector */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-slate-300">DLSS 深度学习超采样:</span>
              {isArm64 ? (
                <span className="text-rose-400 text-[11px] flex items-center gap-1">
                  <Lock className="w-3 h-3" /> ARM64 不支持
                </span>
              ) : (
                <span className="text-indigo-400 font-mono text-[11px] font-bold">
                  {settings.x64Options.dlssMode.toUpperCase()}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {dlssModes.map((mode) => (
                <label
                  key={mode.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    isArm64
                      ? 'opacity-40 cursor-not-allowed bg-slate-950/30 border-slate-800'
                      : settings.x64Options.dlssMode === mode.id
                      ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="dlssMode"
                      disabled={isArm64}
                      value={mode.id}
                      checked={settings.x64Options.dlssMode === mode.id}
                      onChange={() =>
                        setSettings((prev) => ({
                          ...prev,
                          x64Options: {
                            ...prev.x64Options,
                            dlssMode: mode.id,
                            dlaa: mode.id === 'off' ? prev.x64Options.dlaa : false,
                          },
                        }))
                      }
                      className="accent-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-200">{mode.label}</span>
                      <span className="text-[11px] text-slate-400 block">{mode.desc}</span>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {mode.scale}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* DLAA (Deep Learning Anti-Aliasing) */}
          <div
            className={`p-3 rounded-lg border flex items-center justify-between ${
              isArm64 ? 'opacity-40 bg-slate-950/20 border-slate-800' : 'bg-slate-950/40 border-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>DLAA 深度学习抗锯齿</span>
              </div>
              <div className="text-[11px] text-slate-400">
                以 1.0x 原生全分辨率运行 AI 重建算法，追求极致抗锯齿边缘与细节
              </div>
            </div>
            <input
              type="checkbox"
              disabled={isArm64}
              checked={settings.x64Options.dlaa}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  x64Options: {
                    ...prev.x64Options,
                    dlaa: e.target.checked,
                    dlssMode: e.target.checked ? 'off' : prev.x64Options.dlssMode,
                  },
                }))
              }
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Frame Generation (DLSS 3) */}
          <div
            className={`p-3 rounded-lg border flex items-center justify-between ${
              isArm64 ? 'opacity-40 bg-slate-950/20 border-slate-800' : 'bg-slate-950/40 border-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-indigo-400" />
                <span>DLSS 帧生成 (Frame Generation)</span>
                <span className="text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-1.5 rounded">
                  Ada Lovelace / RTX 40+
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                利用光学流加速器生成中间插帧，帧率上限实现 2X 翻倍输出
              </div>
            </div>
            <input
              type="checkbox"
              disabled={isArm64}
              checked={settings.x64Options.frameGeneration}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  x64Options: {
                    ...prev.x64Options,
                    frameGeneration: e.target.checked,
                  },
                }))
              }
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Ray Reconstruction */}
          <div
            className={`p-3 rounded-lg border flex items-center justify-between ${
              isArm64 ? 'opacity-40 bg-slate-950/20 border-slate-800' : 'bg-slate-950/40 border-slate-800'
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>光线重建 (Ray Reconstruction / DLSS 3.5)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                用神经网络降噪器取代传统人工降噪，消除多重高频毛发反弹噪点
              </div>
            </div>
            <input
              type="checkbox"
              disabled={isArm64}
              checked={settings.x64Options.rayReconstruction}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  x64Options: {
                    ...prev.x64Options,
                    rayReconstruction: e.target.checked,
                  },
                }))
              }
              className="w-4 h-4 accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Column: GPU Shader & Rendering Intensity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-slate-100">三维压力场景与负荷参数</h3>
            </div>
            <span className="text-xs text-amber-400 font-mono">Pixel & Geometry Stress</span>
          </div>

          {/* Fur Layers Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-slate-300">FurMark 甜甜圈毛发层数 (Shell Layers):</span>
              <span className="font-mono text-amber-400 font-bold">{settings.furLayers} 层</span>
            </div>
            <input
              type="range"
              min="8"
              max="64"
              step="4"
              value={settings.furLayers}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  furLayers: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>8 层 (基础轻载)</span>
              <span>32 层 (标准烤机)</span>
              <span>64 层 (极限重载)</span>
            </div>
          </div>

          {/* Fiery Particles Count */}
          <div>
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-slate-300">动态高温粒子风暴数量:</span>
              <span className="font-mono text-orange-400 font-bold">
                {settings.particleCount.toLocaleString()} 粒子
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50000"
              step="2500"
              value={settings.particleCount}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  particleCount: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0 (纯几何)</span>
              <span>25,000 (顶点流)</span>
              <span>50,000 (极限粒子)</span>
            </div>
          </div>

          {/* Unlimited FPS Toggle */}
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-rose-400" />
                <span>解除测试帧率上限 (Unlimited FPS)</span>
              </div>
              <div className="text-[11px] text-slate-400">
                绕过垂直同步与屏幕刷新率限制，执行多重着色遍历以最大化 GPU 核心占用
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.unlimitedFps}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  unlimitedFps: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-rose-500 cursor-pointer"
            />
          </div>

          {/* MSAA */}
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">硬件 MSAA 多重采样抗锯齿</div>
              <div className="text-[11px] text-slate-400">开启后消耗更多显存带宽与片元测试运算</div>
            </div>
            <input
              type="checkbox"
              checked={settings.msaa}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  msaa: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
