/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  NetworkBenchmarkEngine,
  NetworkTestResult,
  NetworkProgressUpdate,
} from '../utils/networkBenchmarkEngine';
import {
  Wifi,
  Play,
  Square,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  Globe,
  Radio,
  CheckCircle,
  Gauge,
} from 'lucide-react';

export const NetworkBenchmarkPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<NetworkProgressUpdate | null>(null);
  const [result, setResult] = useState<NetworkTestResult | null>(null);

  const engineRef = useRef<NetworkBenchmarkEngine>(new NetworkBenchmarkEngine());
  const connInfo = engineRef.current.getConnectionInfo();

  const handleStart = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const res = await engineRef.current.runSpeedTest((p) => {
        setProgress(p);
      });
      setResult(res);
    } catch (err) {
      console.warn('Network speedtest aborted or failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    engineRef.current.cancel();
    setIsRunning(false);
  };

  // Speedometer calculation
  const currentMbps = progress?.currentMbps || 0;
  const maxDialMbps = 500;
  const dialRotation = Math.min(180, (currentMbps / maxDialMbps) * 180) - 90;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isRunning ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-300'}`}>
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              网卡与宽带速率测速 (Speedtest Engine)
              {isRunning && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse font-mono">
                  TESTING NETWORK...
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              测试网络适配器延迟 (Ping)、网络抖动 (Jitter)、多线程下载与上传带宽
            </p>
          </div>
        </div>

        <div>
          {isRunning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              停止测速
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-lg text-xs font-extrabold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              开始网络测速
            </button>
          )}
        </div>
      </div>

      {/* Network Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Ping Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-4 h-4 text-emerald-400" />
              网络延迟 (PING)
            </span>
            <span className="font-mono text-[10px] text-slate-500">RTT</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-baseline gap-1">
            <span>{progress ? progress.pingMs.toFixed(1) : (result ? result.pingMs.toFixed(1) : '-')}</span>
            <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            网络质量: <span className="text-emerald-400 font-semibold">{progress && progress.pingMs < 30 ? '极佳' : '正常'}</span>
          </div>
        </div>

        {/* Jitter Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Radio className="w-4 h-4 text-cyan-400" />
              网络抖动 (JITTER)
            </span>
            <span className="font-mono text-[10px] text-slate-500">Stability</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 flex items-baseline gap-1">
            <span>{progress ? progress.jitterMs.toFixed(1) : (result ? result.jitterMs.toFixed(1) : '-')}</span>
            <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            波动方差: <span className="text-slate-300 font-mono">&lt; 3ms</span>
          </div>
        </div>

        {/* Download Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <ArrowDownCircle className="w-4 h-4 text-blue-400" />
              下载速率 (DOWNLOAD)
            </span>
            <span className="font-mono text-[10px] text-slate-500">Bandwidth</span>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400 flex items-baseline gap-1">
            <span>{progress ? progress.downloadMbps.toFixed(1) : (result ? result.downloadMbps.toFixed(1) : '-')}</span>
            <span className="text-xs font-normal text-slate-400">Mbps</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            对应速度: <span className="text-slate-200 font-mono">{progress && progress.downloadMbps ? `${(progress.downloadMbps / 8).toFixed(1)} MB/s` : (result ? `${result.downloadMbS.toFixed(1)} MB/s` : '-')}</span>
          </div>
        </div>

        {/* Upload Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 font-medium">
              <ArrowUpCircle className="w-4 h-4 text-purple-400" />
              上传速率 (UPLOAD)
            </span>
            <span className="font-mono text-[10px] text-slate-500">Bandwidth</span>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400 flex items-baseline gap-1">
            <span>{progress ? progress.uploadMbps.toFixed(1) : (result ? result.uploadMbps.toFixed(1) : '-')}</span>
            <span className="text-xs font-normal text-slate-400">Mbps</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            对应速度: <span className="text-slate-200 font-mono">{progress && progress.uploadMbps ? `${(progress.uploadMbps / 8).toFixed(1)} MB/s` : (result ? `${result.uploadMbS.toFixed(1)} MB/s` : '-')}</span>
          </div>
        </div>
      </div>

      {/* Speedometer Dial & Network Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 Cols: Speedometer Gauge */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col items-center justify-center relative min-h-[300px]">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>实时测速动态仪表盘</span>
          </div>

          {/* SVG Speedometer Gauge */}
          <div className="relative w-64 h-36 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 200 110" className="w-full h-full">
              {/* Outer Arc track */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#1e293b"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Active colored arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#speedGradient)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray="251"
                strokeDashoffset={251 - (Math.min(maxDialMbps, currentMbps) / maxDialMbps) * 251}
              />
              <defs>
                <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="60%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Needle Pivot */}
            <div
              className="absolute bottom-2 w-1 h-20 bg-amber-400 rounded-full origin-bottom transition-transform duration-200"
              style={{
                transform: `rotate(${dialRotation}deg)`,
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.8)',
              }}
            />
            <div className="absolute bottom-1 w-4 h-4 rounded-full bg-slate-200 border-2 border-slate-900" />
          </div>

          {/* Real-time Value */}
          <div className="text-center mt-3">
            <div className="text-3xl font-extrabold font-mono text-cyan-400 tracking-tight">
              {currentMbps.toFixed(1)}
              <span className="text-sm font-normal text-slate-400 ml-1.5">Mbps</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              当前阶段: <span className="font-semibold text-slate-200 uppercase">{progress?.phase || '待机准备'}</span>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Network Interface & Diagnostics Card */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 text-xs font-bold text-slate-200">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                网络适配器与连接环境参数
              </span>
              <span className="font-mono text-emerald-400 text-[11px]">ONLINE</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 bg-slate-950/60 rounded border border-slate-800/80">
                <span className="text-slate-400">网络连接类型:</span>
                <span className="font-mono text-slate-200 font-semibold">{connInfo.type}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950/60 rounded border border-slate-800/80">
                <span className="text-slate-400">下行链路估算带宽:</span>
                <span className="font-mono text-cyan-400 font-semibold">{connInfo.downlinkMax} Mbps (峰值上限)</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950/60 rounded border border-slate-800/80">
                <span className="text-slate-400">蜂窝/宽带等级 (Effective Type):</span>
                <span className="font-mono text-amber-400 font-semibold">{connInfo.effectiveType}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950/60 rounded border border-slate-800/80">
                <span className="text-slate-400">DNS 往返时延 (Baseline RTT):</span>
                <span className="font-mono text-emerald-400 font-semibold">~{connInfo.rtt} ms</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>测速采用双通道并行分片拉取，贴近真实下载软件与视频流媒体高并发带宽。</span>
          </div>
        </div>
      </div>
    </div>
  );
};
