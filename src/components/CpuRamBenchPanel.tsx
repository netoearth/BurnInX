/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CpuSettings, RamSettings, SystemSpecs, CpuAlgorithm, RamPattern } from '../types/benchmark';
import { Cpu, MemoryStick, Play, Square, Activity, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

interface CpuRamBenchPanelProps {
  specs: SystemSpecs | null;
  cpuSettings: CpuSettings;
  setCpuSettings: React.Dispatch<React.SetStateAction<CpuSettings>>;
  ramSettings: RamSettings;
  setRamSettings: React.Dispatch<React.SetStateAction<RamSettings>>;
  cpuRunning: boolean;
  ramRunning: boolean;
  onToggleCpu: () => void;
  onToggleRam: () => void;
  cpuGflops: number;
  cpuTotalOps: number;
  cpuErrors: number;
  ramBandwidthMbS: number;
  ramPasses: number;
  ramErrors: number;
}

export const CpuRamBenchPanel: React.FC<CpuRamBenchPanelProps> = ({
  specs,
  cpuSettings,
  setCpuSettings,
  ramSettings,
  setRamSettings,
  cpuRunning,
  ramRunning,
  onToggleCpu,
  onToggleRam,
  cpuGflops,
  cpuTotalOps,
  cpuErrors,
  ramBandwidthMbS,
  ramPasses,
  ramErrors,
}) => {
  const logicalCores = specs?.logicalCores || 8;

  const algorithms: { id: CpuAlgorithm; name: string; desc: string }[] = [
    {
      id: 'sgemm_matrix',
      name: 'SGEMM 密集浮点矩阵乘法',
      desc: '重度压迫 AVX / FPU 浮点单元，产生极高芯片核心热量与功耗。',
    },
    {
      id: 'sha256_hash',
      name: 'SHA-256 密集哈希运算',
      desc: '测试算术逻辑单元 (ALU) 与分支预测器在高负荷下的计算稳定性。',
    },
    {
      id: 'prime_sieve',
      name: '质数大数筛法与多项式',
      desc: '大内存数组连续跳转，检验多级缓存与高速运算单元协调性。',
    },
    {
      id: 'monte_carlo',
      name: '蒙特卡洛光线追踪数学模拟',
      desc: '连续三维空间光线追踪相交测试，模拟真实物理渲染负载。',
    },
  ];

  const patterns: { id: RamPattern; name: string; desc: string }[] = [
    {
      id: 'bandwidth_rw',
      name: '极限带宽吞吐 (顺序与随机读写)',
      desc: '以最大吞吐速率对大块内存连续读写，压迫主板总线与内存控制器。',
    },
    {
      id: 'bitflip_checker',
      name: '走马灯位翻转检验 (ECC / 坏块检测)',
      desc: '写入交替模式并逐字回读校验，排查内存颗粒不稳定与高频虚焊。',
    },
    {
      id: 'cache_thrash',
      name: '多级缓存击穿测试 (DRAM 直通)',
      desc: '大步长跨度访问跳过 L1/L2/L3 命中，直接压迫 DDR 物理颗粒。',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CPU Stress Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${cpuRunning ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  CPU 多线程独立计算测试
                  {cpuRunning && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      计算满载中
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  独立多线程压测池，可在不启动 GPU 场景的情况下单独运行
                </p>
              </div>
            </div>

            <button
              onClick={onToggleCpu}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                cpuRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
              }`}
            >
              {cpuRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  停止 CPU 测试
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始 CPU 测试
                </>
              )}
            </button>
          </div>

          {/* Real-time Telemetry Dashboard */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 mb-1">当前算力吞吐</div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {cpuRunning ? cpuGflops.toFixed(1) : '0.0'}{' '}
                <span className="text-xs text-slate-400">GFLOPS</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 mb-1">已累计操作数</div>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {(cpuTotalOps / 1e6).toFixed(1)}{' '}
                <span className="text-xs text-slate-400">M Ops</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 mb-1">校验错误 / 异常</div>
              <div className={`text-xl font-bold font-mono ${cpuErrors > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                {cpuErrors} <span className="text-xs text-slate-400">Errors</span>
              </div>
            </div>
          </div>

          {/* Thread Count Selection */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-slate-300">并行工作线程数:</span>
              <span className="font-mono text-amber-400 font-bold">
                {cpuSettings.threads} 线程 / 检测到 {logicalCores} 逻辑核心
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(16, logicalCores * 2)}
              value={cpuSettings.threads}
              disabled={cpuRunning}
              onChange={(e) =>
                setCpuSettings((prev) => ({
                  ...prev,
                  threads: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
            />
            <div className="flex gap-2 mt-2">
              <button
                disabled={cpuRunning}
                onClick={() => setCpuSettings((prev) => ({ ...prev, threads: 1 }))}
                className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                单核 (1T)
              </button>
              <button
                disabled={cpuRunning}
                onClick={() =>
                  setCpuSettings((prev) => ({
                    ...prev,
                    threads: Math.max(1, Math.floor(logicalCores / 2)),
                  }))
                }
                className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                半载 ({Math.max(1, Math.floor(logicalCores / 2))}T)
              </button>
              <button
                disabled={cpuRunning}
                onClick={() => setCpuSettings((prev) => ({ ...prev, threads: logicalCores }))}
                className="px-2 py-1 text-[11px] bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 rounded border border-amber-800/60 disabled:opacity-40 cursor-pointer"
              >
                全核满载 ({logicalCores}T)
              </button>
              <button
                disabled={cpuRunning}
                onClick={() =>
                  setCpuSettings((prev) => ({ ...prev, threads: logicalCores * 2 }))
                }
                className="px-2 py-1 text-[11px] bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 rounded border border-rose-800/50 disabled:opacity-40 cursor-pointer"
              >
                超载 200% ({logicalCores * 2}T)
              </button>
            </div>
          </div>

          {/* Algorithm Selection */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-300 mb-2">测试计算算法:</div>
            <div className="space-y-2">
              {algorithms.map((alg) => (
                <label
                  key={alg.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    cpuSettings.algorithm === alg.id
                      ? 'bg-amber-950/30 border-amber-500/50 text-slate-100'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                  } ${cpuRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="cpuAlgorithm"
                    value={alg.id}
                    checked={cpuSettings.algorithm === alg.id}
                    disabled={cpuRunning}
                    onChange={() =>
                      setCpuSettings((prev) => ({ ...prev, algorithm: alg.id }))
                    }
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-200">{alg.name}</div>
                    <div className="text-[11px] text-slate-400">{alg.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>具备每毫秒校验和校对，若指令因高热发生产生逻辑翻转将即时记录。</span>
        </div>
      </div>

      {/* RAM Stress Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${ramRunning ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                <MemoryStick className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  内存带宽与高负荷稳定性测试
                  {ramRunning && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      内存压测中
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  大容量 TypedArray 物理缓冲区填充与位翻转探测
                </p>
              </div>
            </div>

            <button
              onClick={onToggleRam}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                ramRunning
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold shadow-lg shadow-amber-600/30'
              }`}
            >
              {ramRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  停止内存测试
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始内存测试
                </>
              )}
            </button>
          </div>

          {/* Real-time Telemetry Dashboard */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 mb-1">实时读写带宽</div>
              <div className="text-xl font-bold font-mono text-amber-400">
                {ramRunning ? (ramBandwidthMbS / 1024).toFixed(2) : '0.00'}{' '}
                <span className="text-xs text-slate-400">GB/s</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 mb-1">全缓冲校验轮次</div>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {ramPasses}{' '}
                <span className="text-xs text-slate-400">Passes</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 mb-1">位翻转错误 (Bitflip)</div>
              <div className={`text-xl font-bold font-mono ${ramErrors > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                {ramErrors} <span className="text-xs text-slate-400">Errors</span>
              </div>
            </div>
          </div>

          {/* RAM Allocation Size Selection */}
          <div className="mb-4">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-semibold text-slate-300">分配测试容量:</span>
              <span className="font-mono text-amber-400 font-bold">
                {ramSettings.allocatedMb} MB ({ramSettings.allocatedMb >= 1024 ? `${(ramSettings.allocatedMb / 1024).toFixed(1)} GB` : ''})
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[256, 512, 1024, 2048, 4096].map((mb) => (
                <button
                  key={mb}
                  disabled={ramRunning}
                  onClick={() => setRamSettings((prev) => ({ ...prev, allocatedMb: mb }))}
                  className={`py-2 text-xs font-mono font-bold rounded border transition-all cursor-pointer ${
                    ramSettings.allocatedMb === mb
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  } disabled:opacity-40`}
                >
                  {mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`}
                </button>
              ))}
            </div>
          </div>

          {/* Pattern Selection */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-300 mb-2">测试模式:</div>
            <div className="space-y-2">
              {patterns.map((pat) => (
                <label
                  key={pat.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    ramSettings.pattern === pat.id
                      ? 'bg-amber-950/30 border-amber-500/50 text-slate-100'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700'
                  } ${ramRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="ramPattern"
                    value={pat.id}
                    checked={ramSettings.pattern === pat.id}
                    disabled={ramRunning}
                    onChange={() =>
                      setRamSettings((prev) => ({ ...prev, pattern: pat.id }))
                    }
                    className="mt-0.5 accent-amber-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-200">{pat.name}</div>
                    <div className="text-[11px] text-slate-400">{pat.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-500" />
          <span>采用 32MB 分块连续物理分配，保障测试过程中系统响应流畅，避免浏览器 OOM。</span>
        </div>
      </div>
    </div>
  );
};
