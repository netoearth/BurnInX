/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
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
  CheckCircle,
} from 'lucide-react';

interface TelemetrySensorsPanelProps {
  telemetry: TelemetrySample[];
  specs: SystemSpecs | null;
  latest: TelemetrySample | null;
}

export const TelemetrySensorsPanel: React.FC<TelemetrySensorsPanelProps> = ({
  telemetry,
  specs,
  latest,
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw real-time high precision telemetry chart
  useEffect(() => {
    const canvas = chartCanvasRef.current;
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

    // Draw background grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let y = 30; y < h - 20; y += 35) {
      ctx.beginPath();
      ctx.moveTo(35, y);
      ctx.lineTo(w - 15, y);
      ctx.stroke();
    }

    if (telemetry.length < 2) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px ui-monospace, monospace';
      ctx.fillText('等待压力测试数据样本采集中 (采集间隔 500ms)...', 40, h / 2);
      return;
    }

    const maxPoints = 50;
    const dataSlice = telemetry.slice(-maxPoints);
    const plotW = w - 50;
    const plotH = h - 50;
    const offsetX = 35;
    const offsetY = 25;

    // 1. Draw FPS Line (Blue)
    const maxFps = Math.max(60, ...dataSlice.map((d) => d.fps || 0)) * 1.15;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    dataSlice.forEach((d, i) => {
      const x = offsetX + (i / (dataSlice.length - 1)) * plotW;
      const y = offsetY + plotH - ((d.fps || 0) / maxFps) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. Draw GPU Temperature Line (Red)
    const maxTemp = 100;
    const minTemp = 35;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    dataSlice.forEach((d, i) => {
      const x = offsetX + (i / (dataSlice.length - 1)) * plotW;
      const y = offsetY + plotH - (((d.gpuTempEst || 40) - minTemp) / (maxTemp - minTemp)) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 3. Draw CPU Temperature Line (Emerald)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    dataSlice.forEach((d, i) => {
      const x = offsetX + (i / (dataSlice.length - 1)) * plotW;
      const y = offsetY + plotH - (((d.cpuTempEst || 40) - minTemp) / (maxTemp - minTemp)) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 4. Draw 90°C Thermal Warning Line
    const warnY = offsetY + plotH - ((90 - minTemp) / (maxTemp - minTemp)) * plotH;
    ctx.strokeStyle = '#dc2626';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(offsetX, warnY);
    ctx.lineTo(w - 15, warnY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f87171';
    ctx.font = '10px sans-serif';
    ctx.fillText('90°C 降频警戒线', w - 100, warnY - 4);
  }, [telemetry]);

  const gpuTemp = latest?.gpuTempEst ?? 42;
  const cpuTemp = latest?.cpuTempEst ?? 45;
  const stability = latest?.stabilityScorePct ?? 99.4;
  const isThrottling = gpuTemp >= 88 || cpuTemp >= 90;

  return (
    <div className="space-y-6">
      {/* Real-time Hardware Sensor Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* GPU Temp Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
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
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>功耗估算: {latest?.gpuPowerEst ? `${latest.gpuPowerEst.toFixed(0)} W` : '待机'}</span>
            <span className={gpuTemp > 85 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {gpuTemp > 85 ? '高发热' : '正常'}
            </span>
          </div>
        </div>

        {/* CPU Temp Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
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
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>计算算力: {latest ? `${latest.cpuGflops.toFixed(1)} GFLOPS` : '0'}</span>
            <span className={cpuTemp > 88 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {cpuTemp > 88 ? '预警' : '平稳'}
            </span>
          </div>
        </div>

        {/* Stability Rating Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Gauge className="w-4 h-4 text-cyan-400" />
              系统综合稳定性
            </span>
            <span className="font-mono text-[11px] text-slate-500">3DMark 标淮</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 flex items-baseline gap-1">
            <span>{stability.toFixed(1)}</span>
            <span className="text-sm font-normal text-slate-400">%</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>合格阈值: 97.0%</span>
            <span className={stability >= 97.0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {stability >= 97.0 ? '合格 PASS' : '未达标'}
            </span>
          </div>
        </div>

        {/* Power Source Sensor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Battery className="w-4 h-4 text-amber-400" />
              供电与能效状态
            </span>
            <span className="font-mono text-[11px] text-slate-500">AC/DC</span>
          </div>
          <div className="text-lg font-bold text-slate-100 flex items-baseline gap-1.5">
            <span>{specs?.batteryStatus.powerSource === 'AC_ADAPTER' ? '交流电 (最高性能)' : '电池供电'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
            <span>电量: {specs?.batteryStatus.level ? `${Math.round(specs.batteryStatus.level * 100)}%` : '100%'}</span>
            <span className="text-amber-400 font-mono">
              {specs?.batteryStatus.charging ? '充电中' : '放电中'}
            </span>
          </div>
        </div>
      </div>

      {/* Throttling Alert Banner if hot */}
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

      {/* Real-time Telemetry Graph View */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100">实时时序遥测示波器</h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-blue-400 font-mono">
              <span className="w-2.5 h-1 bg-blue-500 rounded-full" />
              渲染 FPS
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-mono">
              <span className="w-2.5 h-1 bg-rose-500 rounded-full" />
              GPU 核心温 (°C)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <span className="w-2.5 h-1 bg-emerald-500 rounded-full" />
              CPU 封装温 (°C)
            </span>
          </div>
        </div>

        <div className="w-full h-64 relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
          <canvas ref={chartCanvasRef} className="w-full h-full block" />
        </div>
      </div>
    </div>
  );
};
