/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TelemetrySample, SystemSpecs } from '../types/benchmark';
import {
  Activity,
  Flame,
  Cpu,
  MemoryStick,
  Zap,
  Gauge,
  Thermometer,
  Battery,
  AlertTriangle,
  BarChart3,
  BarChart2,
  Columns,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';

interface TelemetrySensorsPanelProps {
  telemetry: TelemetrySample[];
  specs: SystemSpecs | null;
  latest: TelemetrySample | null;
}

type ViewMode = 'multitrack' | 'grouped' | 'focus';
type MetricKey = 'fps' | 'cpuGflops' | 'ramBandwidthMbS' | 'gpuTempEst' | 'cpuTempEst';

interface MetricMeta {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  icon: React.ReactNode;
  minScale: number;
  format: (v: number) => string;
  warningThreshold?: number;
}

export const TelemetrySensorsPanel: React.FC<TelemetrySensorsPanelProps> = ({
  telemetry,
  specs,
  latest,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('multitrack');
  const [windowSamples, setWindowSamples] = useState<number>(30); // 20, 30, 60
  const [focusMetric, setFocusMetric] = useState<MetricKey>('fps');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const gpuTemp = latest?.gpuTempEst ?? 42;
  const cpuTemp = latest?.cpuTempEst ?? 45;
  const stability = latest?.stabilityScorePct ?? 99.4;
  const isThrottling = gpuTemp >= 88 || cpuTemp >= 90;

  // Metadata for the 5 monitored metrics
  const metricConfigs: Record<MetricKey, MetricMeta> = {
    fps: {
      key: 'fps',
      label: 'GPU 渲染帧率',
      unit: 'FPS',
      color: '#3b82f6',
      gradientStart: '#3b82f6',
      gradientEnd: '#6366f1',
      icon: <Flame className="w-4 h-4 text-blue-400" />,
      minScale: 60,
      format: (v) => `${Math.round(v)} FPS`,
    },
    cpuGflops: {
      key: 'cpuGflops',
      label: 'CPU 浮点算力',
      unit: 'GFLOPS',
      color: '#06b6d4',
      gradientStart: '#06b6d4',
      gradientEnd: '#0ea5e9',
      icon: <Cpu className="w-4 h-4 text-cyan-400" />,
      minScale: 10,
      format: (v) => `${v.toFixed(1)} GFLOPS`,
    },
    ramBandwidthMbS: {
      key: 'ramBandwidthMbS',
      label: '内存读写带宽',
      unit: 'MB/s',
      color: '#eab308',
      gradientStart: '#eab308',
      gradientEnd: '#f59e0b',
      icon: <MemoryStick className="w-4 h-4 text-amber-400" />,
      minScale: 1024,
      format: (v) => (v >= 1024 ? `${(v / 1024).toFixed(2)} GB/s` : `${Math.round(v)} MB/s`),
    },
    gpuTempEst: {
      key: 'gpuTempEst',
      label: 'GPU 核心温度',
      unit: '°C',
      color: '#ef4444',
      gradientStart: '#f97316',
      gradientEnd: '#ef4444',
      icon: <Thermometer className="w-4 h-4 text-rose-500" />,
      minScale: 100,
      format: (v) => `${v.toFixed(1)} °C`,
      warningThreshold: 85,
    },
    cpuTempEst: {
      key: 'cpuTempEst',
      label: 'CPU 封装温度',
      unit: '°C',
      color: '#10b981',
      gradientStart: '#10b981',
      gradientEnd: '#059669',
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
      minScale: 100,
      format: (v) => `${v.toFixed(1)} °C`,
      warningThreshold: 90,
    },
  };

  // Slice the recent samples
  const activeSamples = telemetry.slice(-windowSamples);

  return (
    <div className="space-y-6">
      {/* 1. Real-time Hardware Sensor Matrix Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* GPU Temp Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Thermometer className="w-4 h-4 text-rose-500" />
                GPU 核心热力
              </span>
              <span className="font-mono text-[11px] text-slate-500">Sensor 0</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100 flex items-baseline gap-1">
              <span className={gpuTemp > 85 ? 'text-rose-400' : 'text-slate-100'}>
                {gpuTemp.toFixed(1)}
              </span>
              <span className="text-sm font-normal text-slate-400">°C</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            {/* Visual Mini Progress Bar */}
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  gpuTemp > 85 ? 'bg-rose-500' : gpuTemp > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (gpuTemp / 100) * 100))}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>功耗: {latest?.gpuPowerEst ? `${latest.gpuPowerEst.toFixed(0)} W` : '待机'}</span>
              <span className={gpuTemp > 85 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {gpuTemp > 85 ? '高热预警' : '正常温控'}
              </span>
            </div>
          </div>
        </div>

        {/* CPU Temp Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Cpu className="w-4 h-4 text-emerald-500" />
                CPU 封装温度
              </span>
              <span className="font-mono text-[11px] text-slate-500">Tctl/Tdie</span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100 flex items-baseline gap-1">
              <span className={cpuTemp > 88 ? 'text-rose-400' : 'text-slate-100'}>
                {cpuTemp.toFixed(1)}
              </span>
              <span className="text-sm font-normal text-slate-400">°C</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  cpuTemp > 88 ? 'bg-rose-500' : cpuTemp > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (cpuTemp / 105) * 100))}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>算力: {latest ? `${latest.cpuGflops.toFixed(1)} GFLOPS` : '0'}</span>
              <span className={cpuTemp > 88 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {cpuTemp > 88 ? '过温降频' : '平稳运行'}
              </span>
            </div>
          </div>
        </div>

        {/* Stability Rating Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Gauge className="w-4 h-4 text-cyan-400" />
                系统稳定性指数
              </span>
              <span className="font-mono text-[11px] text-slate-500">3DMark 标淮</span>
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400 flex items-baseline gap-1">
              <span>{stability.toFixed(1)}</span>
              <span className="text-sm font-normal text-slate-400">%</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  stability >= 97.0 ? 'bg-cyan-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, stability))}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>合格线: 97.0%</span>
              <span className={stability >= 97.0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {stability >= 97.0 ? '合格 PASS' : '未达标 FAIL'}
              </span>
            </div>
          </div>
        </div>

        {/* Power Source Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <Battery className="w-4 h-4 text-amber-400" />
                供电能效状态
              </span>
              <span className="font-mono text-[11px] text-slate-500">AC/DC</span>
            </div>
            <div className="text-lg font-bold text-slate-100 flex items-baseline gap-1.5">
              <span>{specs?.batteryStatus.powerSource === 'AC_ADAPTER' ? '交流电 (最高性能)' : '电池供电'}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex justify-between items-center">
              <span>电量: {specs?.batteryStatus.level ? `${Math.round(specs.batteryStatus.level * 100)}%` : '100%'}</span>
              <span className="text-amber-400 font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                {specs?.batteryStatus.charging ? '充电中' : '放电中'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Throttling Alert Banner */}
      {isThrottling && (
        <div className="p-4 bg-rose-950/40 border border-rose-600/60 rounded-xl flex items-center gap-3 text-rose-300">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-sm text-rose-200">
              检测到硬件温度过高，可能已触发热保护降频 (Thermal Throttling)
            </div>
            <span>请观察散热风扇转速或降低测试强度，避免硬件发生过温保护关机。</span>
          </div>
        </div>
      )}

      {/* 2. Real-time Bar Histogram Telemetry Oscilloscope */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 mb-5 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">实时时序柱状图示波器</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                  柱状图分轨模式 · 无重叠混淆
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                各项指标独立量程分轨呈现，清晰分辨单项负载与波动峰值
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Selector */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('multitrack')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  viewMode === 'multitrack'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="各项指标独立分轨柱状图，各自独立坐标轴，绝不相互遮挡"
              >
                <Columns className="w-3.5 h-3.5" />
                分轨独立柱状图
              </button>

              <button
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="同一时间点并排对比各指标负载柱"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                并排聚类柱状图
              </button>

              <button
                onClick={() => setViewMode('focus')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                  viewMode === 'focus'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="选择单一指标进行高清大柱状图深度分析"
              >
                <Sparkles className="w-3.5 h-3.5" />
                单项聚焦大图
              </button>
            </div>

            {/* Time Window Selector */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
              <span className="text-[11px] text-slate-500 px-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                采样窗:
              </span>
              {[20, 30, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setWindowSamples(sec)}
                  className={`px-2 py-1 rounded font-mono text-[11px] transition-all cursor-pointer ${
                    windowSamples === sec
                      ? 'bg-slate-800 text-slate-100 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state when no test has run yet */}
        {activeSamples.length === 0 ? (
          <div className="py-16 text-center bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="font-bold text-slate-300 text-sm mb-1">示波器待命中，暂无遥测采样数据</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              请点击上方「一键全系统三烤」或「启动 GPU 三维压力测试 / CPU 运算」，系统将以 500ms
              高采样率实时绘制分轨柱状图。
            </div>
          </div>
        ) : (
          <div>
            {/* Mode 1: Multi-track Separated Bar Charts (Default & Recommended) */}
            {viewMode === 'multitrack' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(metricConfigs) as MetricKey[]).map((key) => {
                  const meta = metricConfigs[key];
                  const values = activeSamples.map((s) => (s[key] as number) || 0);
                  const currentVal = values[values.length - 1] ?? 0;
                  const maxVal = Math.max(meta.minScale, ...values);
                  const avgVal = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
                  const minVal = Math.min(...values);

                  return (
                    <div
                      key={key}
                      className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {meta.icon}
                          <span className="font-bold text-slate-200 text-xs">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[11px] text-slate-400">当前:</span>
                          <span
                            className="font-mono font-bold text-sm"
                            style={{ color: meta.color }}
                          >
                            {meta.format(currentVal)}
                          </span>
                        </div>
                      </div>

                      {/* Bar Canvas Track */}
                      <div className="w-full h-28 my-1 relative">
                        <MetricBarTrackCanvas
                          samples={activeSamples}
                          metricKey={key}
                          meta={meta}
                          maxScale={maxVal}
                          hoveredIdx={hoveredIdx}
                          onHoverBar={setHoveredIdx}
                        />
                      </div>

                      {/* Bottom Track Stats */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 font-mono">
                        <span>最低: {meta.format(minVal)}</span>
                        <span>平均: {meta.format(avgVal)}</span>
                        <span className="text-slate-400">峰值: {meta.format(maxVal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mode 2: Grouped Side-by-Side Bar Chart */}
            {viewMode === 'grouped' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="text-slate-400">
                    每个时间节点并排展示 5 项指标的负载柱（按各自量程百分比归一化对比）
                  </div>
                  <div className="flex items-center gap-3">
                    {(Object.keys(metricConfigs) as MetricKey[]).map((key) => (
                      <span key={key} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <span
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: metricConfigs[key].color }}
                        />
                        {metricConfigs[key].label.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="w-full h-72 bg-slate-950 rounded-lg border border-slate-800 p-2">
                  <GroupedBarsCanvas
                    samples={activeSamples}
                    configs={metricConfigs}
                    hoveredIdx={hoveredIdx}
                    onHoverBar={setHoveredIdx}
                  />
                </div>
              </div>
            )}

            {/* Mode 3: Single Focus Large Bar Chart */}
            {viewMode === 'focus' && (
              <div className="space-y-4">
                {/* Metric Selector Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {(Object.keys(metricConfigs) as MetricKey[]).map((key) => {
                    const m = metricConfigs[key];
                    const val = latest ? (latest[key] as number) : 0;
                    return (
                      <button
                        key={key}
                        onClick={() => setFocusMetric(key)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          focusMetric === key
                            ? 'bg-slate-800 text-white border-2'
                            : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                        style={{
                          borderColor: focusMetric === key ? m.color : undefined,
                        }}
                      >
                        {m.icon}
                        <span>{m.label}</span>
                        <span className="font-mono text-[11px] opacity-80">({m.format(val)})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Big Master Bar Chart */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3 text-xs">
                    <div className="flex items-center gap-2">
                      {metricConfigs[focusMetric].icon}
                      <span className="font-bold text-slate-200 text-sm">
                        {metricConfigs[focusMetric].label} · 高清大柱状图深度示波
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs font-mono">
                      实时当前值: <span className="text-white font-bold">{metricConfigs[focusMetric].format((latest?.[focusMetric] as number) || 0)}</span>
                    </div>
                  </div>

                  <div className="w-full h-80 relative">
                    <FocusBarTrackCanvas
                      samples={activeSamples}
                      metricKey={focusMetric}
                      meta={metricConfigs[focusMetric]}
                      hoveredIdx={hoveredIdx}
                      onHoverBar={setHoveredIdx}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Canvas Subcomponent 1: Dedicated Metric Track Bar Canvas
// ============================================================================
interface MetricBarTrackCanvasProps {
  samples: TelemetrySample[];
  metricKey: MetricKey;
  meta: MetricMeta;
  maxScale: number;
  hoveredIdx: number | null;
  onHoverBar: (idx: number | null) => void;
}

const MetricBarTrackCanvas: React.FC<MetricBarTrackCanvasProps> = ({
  samples,
  metricKey,
  meta,
  maxScale,
  hoveredIdx,
  onHoverBar,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padLeft = 4;
    const padRight = 4;
    const padBottom = 18;
    const padTop = 10;
    const plotW = w - padLeft - padRight;
    const plotH = h - padBottom - padTop;

    // Draw horizontal faint grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let i = 1; i <= 3; i++) {
      const gy = padTop + plotH * (i / 4);
      ctx.beginPath();
      ctx.moveTo(padLeft, gy);
      ctx.lineTo(w - padRight, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (samples.length === 0) return;

    const count = samples.length;
    const barWidth = Math.max(3, (plotW / count) * 0.72);
    const step = plotW / Math.max(1, count);

    // Warning Threshold line if any
    if (meta.warningThreshold && meta.warningThreshold <= maxScale) {
      const warnY = padTop + plotH - (meta.warningThreshold / maxScale) * plotH;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padLeft, warnY);
      ctx.lineTo(w - padRight, warnY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#f87171';
      ctx.font = '9px monospace';
      ctx.fillText(`${meta.warningThreshold}°C 警戒线`, w - 75, warnY - 2);
    }

    // Draw each bar pillar
    samples.forEach((sample, i) => {
      const val = (sample[metricKey] as number) || 0;
      const ratio = Math.min(1, Math.max(0.04, val / (maxScale || 1)));
      const barH = ratio * plotH;
      const x = padLeft + i * step + (step - barWidth) / 2;
      const y = padTop + plotH - barH;

      // Color logic (for temperatures, graduate from green to amber to red)
      let fillStyle = meta.color;
      if (metricKey === 'gpuTempEst' || metricKey === 'cpuTempEst') {
        if (val > (meta.warningThreshold || 88)) {
          fillStyle = '#ef4444'; // Red
        } else if (val > 75) {
          fillStyle = '#f59e0b'; // Amber
        } else {
          fillStyle = '#10b981'; // Green
        }
      }

      const isHovered = hoveredIdx === i;

      // Draw rounded top bar
      ctx.fillStyle = fillStyle;
      if (isHovered) {
        ctx.shadowColor = fillStyle;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }

      drawRoundedBar(ctx, x, y, barWidth, barH, 2);

      // Value label on recent or hovered bar
      if (isHovered || (i === count - 1 && barWidth > 12)) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        const labelText = Math.round(val).toString();
        ctx.fillText(labelText, x + barWidth / 2, Math.max(8, y - 2));
      }
    });

    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';

    // X-axis time label
    ctx.fillStyle = '#64748b';
    ctx.font = '9px sans-serif';
    ctx.fillText(`-${samples.length}s`, padLeft, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText('实时 (0s)', w - padRight, h - 4);
  }, [samples, metricKey, meta, maxScale, hoveredIdx]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const step = (rect.width - 8) / samples.length;
    const idx = Math.min(samples.length - 1, Math.max(0, Math.floor((x - 4) / step)));
    onHoverBar(idx);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => onHoverBar(null)}
      className="w-full h-full block cursor-crosshair"
    />
  );
};

// ============================================================================
// Canvas Subcomponent 2: Grouped Side-by-Side Bars Canvas
// ============================================================================
interface GroupedBarsCanvasProps {
  samples: TelemetrySample[];
  configs: Record<MetricKey, MetricMeta>;
  hoveredIdx: number | null;
  onHoverBar: (idx: number | null) => void;
}

const GroupedBarsCanvas: React.FC<GroupedBarsCanvasProps> = ({
  samples,
  configs,
  hoveredIdx,
  onHoverBar,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padLeft = 10;
    const padRight = 10;
    const padTop = 15;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid baseline
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH);
    ctx.lineTo(w - padRight, padTop + plotH);
    ctx.stroke();

    if (samples.length === 0) return;

    const keys: MetricKey[] = ['fps', 'cpuGflops', 'ramBandwidthMbS', 'gpuTempEst', 'cpuTempEst'];
    const maxVals: Record<MetricKey, number> = {
      fps: Math.max(60, ...samples.map((s) => s.fps || 0)),
      cpuGflops: Math.max(10, ...samples.map((s) => s.cpuGflops || 0)),
      ramBandwidthMbS: Math.max(1024, ...samples.map((s) => s.ramBandwidthMbS || 0)),
      gpuTempEst: 100,
      cpuTempEst: 105,
    };

    const count = samples.length;
    const groupW = plotW / count;
    const barW = Math.max(2, (groupW * 0.8) / keys.length);

    samples.forEach((sample, i) => {
      const groupX = padLeft + i * groupW + (groupW - barW * keys.length) / 2;

      keys.forEach((k, ki) => {
        const val = (sample[k] as number) || 0;
        const ratio = Math.min(1, Math.max(0.04, val / (maxVals[k] || 1)));
        const barH = ratio * plotH;
        const bx = groupX + ki * barW;
        const by = padTop + plotH - barH;

        ctx.fillStyle = configs[k].color;
        drawRoundedBar(ctx, bx, by, barW - 0.5, barH, 1);
      });

      if (hoveredIdx === i) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(groupX - 2, padTop, barW * keys.length + 4, plotH);
      }
    });

    // Time indicators
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`-${samples.length}s 前`, padLeft, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText('实时', w - padRight, h - 8);
  }, [samples, configs, hoveredIdx]);

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={(e) => {
        const canvas = canvasRef.current;
        if (!canvas || samples.length === 0) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 10;
        const step = (rect.width - 20) / samples.length;
        const idx = Math.min(samples.length - 1, Math.max(0, Math.floor(x / step)));
        onHoverBar(idx);
      }}
      onMouseLeave={() => onHoverBar(null)}
      className="w-full h-full block cursor-crosshair"
    />
  );
};

// ============================================================================
// Canvas Subcomponent 3: Focus Bar Track Canvas
// ============================================================================
interface FocusBarTrackCanvasProps {
  samples: TelemetrySample[];
  metricKey: MetricKey;
  meta: MetricMeta;
  hoveredIdx: number | null;
  onHoverBar: (idx: number | null) => void;
}

const FocusBarTrackCanvas: React.FC<FocusBarTrackCanvasProps> = ({
  samples,
  metricKey,
  meta,
  hoveredIdx,
  onHoverBar,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const vals = samples.map((s) => (s[metricKey] as number) || 0);
    const maxVal = Math.max(meta.minScale, ...vals) * 1.1;

    // Y Axis Grid & Labels
    ctx.strokeStyle = '#1e293b';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padTop + plotH * (1 - i / 4);
      const labelVal = (maxVal * (i / 4)).toFixed(0);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      ctx.fillText(labelVal, padLeft - 6, y + 3);
    }

    if (samples.length === 0) return;

    const count = samples.length;
    const barW = Math.max(4, (plotW / count) * 0.7);
    const step = plotW / count;

    // Draw bars
    samples.forEach((sample, i) => {
      const val = (sample[metricKey] as number) || 0;
      const ratio = Math.min(1, Math.max(0.02, val / maxVal));
      const barH = ratio * plotH;
      const x = padLeft + i * step + (step - barW) / 2;
      const y = padTop + plotH - barH;

      const isHovered = hoveredIdx === i;

      // Gradient fill
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, meta.gradientEnd);
      grad.addColorStop(1, meta.gradientStart);

      ctx.fillStyle = grad;
      if (isHovered) {
        ctx.shadowColor = meta.color;
        ctx.shadowBlur = 12;
      } else {
        ctx.shadowBlur = 0;
      }

      drawRoundedBar(ctx, x, y, barW, barH, 3);

      // Value text above bar
      if (isHovered || barW > 20) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(val).toString(), x + barW / 2, Math.max(12, y - 4));
      }
    });

    ctx.shadowBlur = 0;
  }, [samples, metricKey, meta, hoveredIdx]);

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={(e) => {
        const canvas = canvasRef.current;
        if (!canvas || samples.length === 0) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - 40;
        const step = (rect.width - 60) / samples.length;
        const idx = Math.min(samples.length - 1, Math.max(0, Math.floor(x / step)));
        onHoverBar(idx);
      }}
      onMouseLeave={() => onHoverBar(null)}
      className="w-full h-full block cursor-crosshair"
    />
  );
};

// Utility function to draw rounded bar tops
function drawRoundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (h <= 0) return;
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
}
