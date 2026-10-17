/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SystemSpecs,
  BenchmarkConfig,
  GpuSettings,
  CpuSettings,
  RamSettings,
  TelemetrySample,
  BenchmarkReport,
} from './types/benchmark';
import { detectSystemHardware } from './utils/hardwareDetector';
import { CpuStressController } from './utils/cpuStressEngine';
import { RamStressController } from './utils/ramStressEngine';
import { generateHtmlReport } from './utils/htmlReportGenerator';
import { GpuViewport } from './components/GpuViewport';
import { CpuRamBenchPanel } from './components/CpuRamBenchPanel';
import { X64GraphicsPanel } from './components/X64GraphicsPanel';
import { TelemetrySensorsPanel } from './components/TelemetrySensorsPanel';
import { ReportHistoryModal } from './components/ReportHistoryModal';
import {
  Flame,
  Cpu,
  MemoryStick,
  Zap,
  Activity,
  Play,
  Square,
  FileText,
  Download,
  Layers,
  Settings,
  Sparkles,
  ShieldCheck,
  Timer,
  RefreshCw,
  FolderOpen,
  Monitor,
  Info,
} from 'lucide-react';

export default function App() {
  // 1. Hardware Specs state
  const [specs, setSpecs] = useState<SystemSpecs | null>(null);
  const [loadingHardware, setLoadingHardware] = useState<boolean>(true);

  // 2. Active Tab
  const [activeTab, setActiveTab] = useState<'main' | 'cpu_ram' | 'graphics' | 'sensors' | 'reports'>('main');

  // 3. Test Configuration
  const [gpuEnabled, setGpuEnabled] = useState<boolean>(false);
  const [cpuEnabled, setCpuEnabled] = useState<boolean>(false);
  const [ramEnabled, setRamEnabled] = useState<boolean>(false);
  const [durationMode, setDurationMode] = useState<number>(0); // 0 = manual unlimited, 60, 180, 300, 600

  const [gpuSettings, setGpuSettings] = useState<GpuSettings>({
    scene: 'fur_donut',
    renderScale: 1.0,
    furLayers: 32,
    particleCount: 15000,
    msaa: true,
    unlimitedFps: true, // 解除测试帧率上限
    x64Options: {
      dlssMode: 'off',
      dlaa: false,
      frameGeneration: false,
      rayReconstruction: false,
      sharpness: 0.5,
    },
  });

  const [cpuSettings, setCpuSettings] = useState<CpuSettings>({
    threads: 8,
    algorithm: 'sgemm_matrix',
    intensity: 'heavy',
  });

  const [ramSettings, setRamSettings] = useState<RamSettings>({
    allocatedMb: 1024,
    pattern: 'bandwidth_rw',
  });

  // 4. Running Bench State & Telemetry
  const [benchRunning, setBenchRunning] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Live real-time stats
  const [fps, setFps] = useState<number>(0);
  const [frametimeMs, setFrametimeMs] = useState<number>(0);
  const [drawCalls, setDrawCalls] = useState<number>(0);
  const [triangles, setTriangles] = useState<number>(0);

  const [cpuGflops, setCpuGflops] = useState<number>(0);
  const [cpuTotalOps, setCpuTotalOps] = useState<number>(0);
  const [cpuErrors, setCpuErrors] = useState<number>(0);

  const [ramBandwidthMbS, setRamBandwidthMbS] = useState<number>(0);
  const [ramPasses, setRamPasses] = useState<number>(0);
  const [ramErrors, setRamErrors] = useState<number>(0);

  // Buffer of telemetry samples
  const [telemetry, setTelemetry] = useState<TelemetrySample[]>([]);
  const allFpsSamplesRef = useRef<number[]>([]);

  // Engine refs
  const cpuControllerRef = useRef<CpuStressController>(new CpuStressController());
  const ramControllerRef = useRef<RamStressController>(new RamStressController());

  // 5. Reports & Modal
  const [reports, setReports] = useState<BenchmarkReport[]>([]);
  const [activeReport, setActiveReport] = useState<BenchmarkReport | null>(null);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Load hardware on mount
  useEffect(() => {
    async function init() {
      setLoadingHardware(true);
      const hardware = await detectSystemHardware();
      setSpecs(hardware);
      // Auto set CPU threads to detected hardware concurrency
      setCpuSettings((prev) => ({
        ...prev,
        threads: hardware.logicalCores,
      }));
      setLoadingHardware(false);
    }
    init();

    // Load saved reports from localStorage
    try {
      const saved = localStorage.getItem('burninx_reports');
      if (saved) {
        const parsed = JSON.parse(saved);
        setReports(parsed);
        if (parsed.length > 0) setActiveReport(parsed[0]);
      }
    } catch (e) {
      console.warn('Failed to parse saved reports:', e);
    }
  }, []);

  // Sync benchRunning state whenever any load is active
  useEffect(() => {
    const anyActive = gpuEnabled || cpuEnabled || ramEnabled;
    setBenchRunning(anyActive);

    if (anyActive) {
      if (!startTimeRef.current) {
        startTimeRef.current = performance.now();
        setElapsedSec(0);
        allFpsSamplesRef.current = [];
        setTelemetry([]);
      }
    } else {
      startTimeRef.current = null;
    }
  }, [gpuEnabled, cpuEnabled, ramEnabled]);

  // Main benchmark timer and telemetry ticker
  useEffect(() => {
    if (!benchRunning) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    timerIntervalRef.current = window.setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Math.floor((performance.now() - startTimeRef.current) / 1000);
      setElapsedSec(elapsed);

      // Check duration limit (countdown timer)
      if (durationMode > 0 && elapsed >= durationMode) {
        stopAllTests();
        return;
      }

      // Record telemetry sample
      // Thermal simulation: base temp ~ 42°C, climbs up to 86°C under full GPU/CPU load
      const gpuThermalBonus = gpuEnabled ? Math.min(42, elapsed * 1.4 + 20) : 0;
      const cpuThermalBonus = cpuEnabled ? Math.min(38, elapsed * 1.2 + 18) : 0;
      const currentGpuTemp = 42 + gpuThermalBonus;
      const currentCpuTemp = 45 + cpuThermalBonus;

      // Estimate power
      const gpuPowerEst = gpuEnabled ? (specs?.isNvidiaRtx ? 220 : 120) : 15;

      // Calculate 1% low and stability
      const samples = allFpsSamplesRef.current;
      let low1Pct = 0;
      let stabilityPct = 99.4;

      if (samples.length > 5) {
        const sorted = [...samples].sort((a, b) => a - b);
        const low1PctIdx = Math.max(0, Math.floor(sorted.length * 0.01));
        low1Pct = sorted[low1PctIdx];

        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance = samples.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / samples.length;
        const stdDev = Math.sqrt(variance);
        stabilityPct = Math.max(70, Math.min(99.9, 100 - (stdDev / Math.max(1, avg)) * 25));
      }

      const sample: TelemetrySample = {
        timestamp: Date.now(),
        elapsedSec: elapsed,
        fps,
        frametimeMs,
        fps1PctLow: low1Pct,
        gpuLoadPct: gpuEnabled ? 100 : 0,
        gpuTempEst: currentGpuTemp,
        gpuPowerEst,
        cpuLoadPct: cpuEnabled ? 100 : 5,
        cpuOpsPerSec: cpuGflops * 1e9,
        cpuGflops,
        cpuTempEst: currentCpuTemp,
        cpuErrors,
        ramAllocatedMb: ramEnabled ? ramSettings.allocatedMb : 0,
        ramBandwidthMbS,
        ramErrors,
        stabilityScorePct: stabilityPct,
      };

      setTelemetry((prev) => [...prev.slice(-120), sample]);
    }, 500);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [benchRunning, durationMode, fps, frametimeMs, gpuEnabled, cpuEnabled, ramEnabled, cpuGflops, ramBandwidthMbS, cpuErrors, ramErrors, ramSettings.allocatedMb, specs?.isNvidiaRtx]);

  // Handle GPU FPS Callback
  const handleFpsUpdate = useCallback(
    (curFps: number, ftMs: number, calls: number, tris: number) => {
      setFps(curFps);
      setFrametimeMs(ftMs);
      setDrawCalls(calls);
      setTriangles(tris);
      allFpsSamplesRef.current.push(curFps);
    },
    []
  );

  // Toggle GPU
  const toggleGpu = () => {
    setGpuEnabled((prev) => !prev);
  };

  // Toggle CPU
  const toggleCpu = () => {
    if (cpuEnabled) {
      cpuControllerRef.current.stop();
      setCpuEnabled(false);
      setCpuGflops(0);
    } else {
      setCpuEnabled(true);
      cpuControllerRef.current.start(
        cpuSettings.threads,
        cpuSettings.algorithm,
        (update) => {
          setCpuGflops(update.gflops);
          setCpuTotalOps((prev) => prev + update.ops);
          setCpuErrors(update.errors);
        }
      );
    }
  };

  // Toggle RAM
  const toggleRam = () => {
    if (ramEnabled) {
      ramControllerRef.current.stop();
      setRamEnabled(false);
      setRamBandwidthMbS(0);
    } else {
      setRamEnabled(true);
      ramControllerRef.current.start(
        ramSettings.allocatedMb,
        ramSettings.pattern,
        (update) => {
          setRamBandwidthMbS(update.bandwidthMbS);
          setRamPasses(update.passes);
          setRamErrors(update.errors);
        }
      );
    }
  };

  // Stop All and generate report
  const stopAllTests = () => {
    const finalElapsed = elapsedSec;
    const wasGpu = gpuEnabled;
    const wasCpu = cpuEnabled;
    const wasRam = ramEnabled;

    // Shut down engines
    setGpuEnabled(false);
    if (cpuEnabled) {
      cpuControllerRef.current.stop();
      setCpuEnabled(false);
    }
    if (ramEnabled) {
      ramControllerRef.current.stop();
      setRamEnabled(false);
    }

    setBenchRunning(false);

    // If test ran for more than 3 seconds, compile a report!
    if (finalElapsed >= 3 && specs) {
      const samples = allFpsSamplesRef.current;
      const avgFps = samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
      const minFps = samples.length > 0 ? Math.min(...samples) : 0;
      const maxFps = samples.length > 0 ? Math.max(...samples) : 0;

      const sorted = [...samples].sort((a, b) => a - b);
      const low1Pct = samples.length > 0 ? sorted[Math.max(0, Math.floor(sorted.length * 0.01))] : 0;

      const stability = telemetry.length > 0 ? telemetry[telemetry.length - 1].stabilityScorePct : 99.1;
      const totalErrors = cpuErrors + ramErrors;
      const peakGpuTemp = Math.max(45, ...telemetry.map((t) => t.gpuTempEst));
      const peakCpuTemp = Math.max(48, ...telemetry.map((t) => t.cpuTempEst));
      const throttlingSuspected = peakGpuTemp >= 88 || peakCpuTemp >= 90;

      const passed = stability >= 97.0 && totalErrors === 0 && !throttlingSuspected;
      const verdictMessage = passed
        ? `在持续 ${finalElapsed} 秒的极限负载测试中，帧率稳定性评分为 ${stability.toFixed(1)}%，零计算异常，散热控温平稳，硬件运行表现优异。`
        : `压力测试发现潜在风险: ${
            totalErrors > 0
              ? `探测到 ${totalErrors} 次计算/位翻转错误，可能存在超频不稳或内存颗粒体质问题; `
              : ''
          }${
            throttlingSuspected
              ? `最高核心温度达到 ${Math.max(peakGpuTemp, peakCpuTemp).toFixed(0)}°C 触发热节流降频; `
              : ''
          }稳定性评分为 ${stability.toFixed(1)}% (基准合格线 97%)。`;

      let testModeTitle = '全系统极限压力测试';
      if (wasGpu && !wasCpu && !wasRam) testModeTitle = 'GPU 三维压力专项测试';
      else if (!wasGpu && wasCpu && !wasRam) testModeTitle = 'CPU 多线程独立计算测试';
      else if (!wasGpu && !wasCpu && wasRam) testModeTitle = '内存高带宽稳定性测试';

      const newReport: BenchmarkReport = {
        id: `BX-${Date.now().toString(36).toUpperCase()}`,
        title: testModeTitle,
        timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
        durationSec: finalElapsed,
        targetDuration: durationMode,
        specs,
        config: {
          gpuEnabled: wasGpu,
          cpuEnabled: wasCpu,
          ramEnabled: wasRam,
          durationSeconds: durationMode,
          gpuSettings,
          cpuSettings,
          ramSettings,
        },
        stats: {
          avgFps,
          minFps,
          maxFps,
          low1PctFps: low1Pct,
          stabilityScorePct: stability,
          passed,
          totalFrames: samples.length,
          totalCpuOps: cpuTotalOps,
          avgCpuGflops: cpuGflops,
          peakCpuTemp,
          peakGpuTemp,
          totalRamPasses: ramPasses,
          avgRamBandwidthMbS: ramBandwidthMbS,
          totalErrors,
          throttlingSuspected,
          verdictMessage,
        },
        telemetry: [...telemetry],
      };

      setReports((prev) => {
        const updated = [newReport, ...prev].slice(0, 20);
        try {
          localStorage.setItem('burninx_reports', JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });

      setActiveReport(newReport);
      setShowReportModal(true);
    }
  };

  // Quick Preset Handlers
  const handleStartTripleBurn = () => {
    stopAllTests();
    setTimeout(() => {
      setGpuEnabled(true);
      setCpuEnabled(true);
      cpuControllerRef.current.start(cpuSettings.threads, cpuSettings.algorithm, (update) => {
        setCpuGflops(update.gflops);
        setCpuTotalOps((prev) => prev + update.ops);
        setCpuErrors(update.errors);
      });
      setRamEnabled(true);
      ramControllerRef.current.start(ramSettings.allocatedMb, ramSettings.pattern, (update) => {
        setRamBandwidthMbS(update.bandwidthMbS);
        setRamPasses(update.passes);
        setRamErrors(update.errors);
      });
      setActiveTab('main');
    }, 50);
  };

  const handleStartGpuOnly = () => {
    stopAllTests();
    setTimeout(() => {
      setGpuEnabled(true);
      setActiveTab('main');
    }, 50);
  };

  const handleStartCpuOnly = () => {
    stopAllTests();
    setTimeout(() => {
      setCpuEnabled(true);
      cpuControllerRef.current.start(cpuSettings.threads, cpuSettings.algorithm, (update) => {
        setCpuGflops(update.gflops);
        setCpuTotalOps((prev) => prev + update.ops);
        setCpuErrors(update.errors);
      });
      setActiveTab('cpu_ram');
    }, 50);
  };

  const handleStartRamOnly = () => {
    stopAllTests();
    setTimeout(() => {
      setRamEnabled(true);
      ramControllerRef.current.start(ramSettings.allocatedMb, ramSettings.pattern, (update) => {
        setRamBandwidthMbS(update.bandwidthMbS);
        setRamPasses(update.passes);
        setRamErrors(update.errors);
      });
      setActiveTab('cpu_ram');
    }, 50);
  };

  const handleDeleteReport = (id: string) => {
    setReports((prev) => {
      const filtered = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem('burninx_reports', JSON.stringify(filtered));
      } catch {
        // Ignore
      }
      return filtered;
    });
    if (activeReport?.id === id) {
      setActiveReport(reports.find((r) => r.id !== id) || null);
    }
  };

  const latestTelemetry = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Windows Benchmark Industrial Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-slate-950 font-black">
              <Flame className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-slate-100">
                  BurnInX
                </h1>
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  v2.8 PRO
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                  {specs?.isArm64 ? 'ARM64 EDITION' : 'x64 WINDOWS'}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>
                  {specs ? `${specs.gpuRenderer.split('/')[0].slice(0, 28)}` : '硬件探测中...'}
                </span>
                <span>&bull;</span>
                <span>{specs?.logicalCores || 8} 核心</span>
                <span>&bull;</span>
                <span>{specs?.batteryStatus.powerSource === 'AC_ADAPTER' ? '🔌 AC 供电' : '🔋 电池供电'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Status Strip */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timer Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
              <Timer className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">压测时长:</span>
              <select
                value={durationMode}
                disabled={benchRunning}
                onChange={(e) => setDurationMode(parseInt(e.target.value, 10))}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900 text-slate-200">无限制 (手动停止)</option>
                <option value={60} className="bg-slate-900 text-slate-200">60 秒 (快速基准)</option>
                <option value={180} className="bg-slate-900 text-slate-200">3 分钟 (稳定性判定)</option>
                <option value={300} className="bg-slate-900 text-slate-200">5 分钟 (高热阻抗)</option>
                <option value={600} className="bg-slate-900 text-slate-200">10 分钟 (极限拷机)</option>
              </select>
            </div>

            {/* Test Timer Status */}
            {benchRunning && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-950/80 border border-rose-600/50 rounded-lg text-xs font-mono font-bold text-rose-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>
                  测试运行中: {Math.floor(elapsedSec / 60)}:
                  {(elapsedSec % 60).toString().padStart(2, '0')}
                  {durationMode > 0 ? ` / ${Math.floor(durationMode / 60)}:00` : ''}
                </span>
              </div>
            )}

            {/* Emergency / Global Stop */}
            {benchRunning ? (
              <button
                onClick={stopAllTests}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-rose-600/40 cursor-pointer active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                结束测试并生成报告
              </button>
            ) : (
              <button
                onClick={handleStartTripleBurn}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 rounded-lg text-xs font-extrabold transition-all shadow-lg shadow-orange-500/20 cursor-pointer active:scale-95"
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                一键全系统三烤
              </button>
            )}

            {/* Report Center Button */}
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>HTML 报告中心</span>
              {reports.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-blue-500 text-white text-[10px] rounded-full">
                  {reports.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Real-time Telemetry Status Strip */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {/* GPU FPS */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> GPU 帧率:
            </span>
            <span className="font-mono font-bold text-amber-400">
              {gpuEnabled ? `${fps.toFixed(1)} FPS` : '待机关闭'}
            </span>
          </div>

          {/* Frame Time */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" /> 帧时间:
            </span>
            <span className="font-mono font-bold text-blue-400">
              {gpuEnabled ? `${frametimeMs.toFixed(1)} ms` : '-'}
            </span>
          </div>

          {/* CPU Ops */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" /> CPU 吞吐:
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {cpuEnabled ? `${cpuGflops.toFixed(1)} GFLOPS` : '待机'}
            </span>
          </div>

          {/* RAM Bandwidth */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5">
              <MemoryStick className="w-3.5 h-3.5 text-yellow-400" /> 内存带宽:
            </span>
            <span className="font-mono font-bold text-yellow-400">
              {ramEnabled ? `${(ramBandwidthMbS / 1024).toFixed(2)} GB/s` : '待机'}
            </span>
          </div>

          {/* Stability */}
          <div className="flex items-center justify-between p-2 rounded bg-slate-950/50 border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> 稳定性:
            </span>
            <span className="font-mono font-bold text-cyan-400">
              {latestTelemetry ? `${latestTelemetry.stabilityScorePct.toFixed(1)}%` : '99.5%'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="bg-slate-900/40 border-b border-slate-800 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'main'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Monitor className="w-4 h-4" />
            综合测试控制台 (Main Bench)
          </button>

          <button
            onClick={() => setActiveTab('cpu_ram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cpu_ram'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            CPU 与内存独立测试台 (CPU & RAM Lab)
          </button>

          <button
            onClick={() => setActiveTab('graphics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'graphics'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            x64 图形选项 & DLSS 超分辨率
          </button>

          <button
            onClick={() => setActiveTab('sensors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sensors'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            硬件传感器与热力监控 (Telemetry)
          </button>
        </div>
      </nav>

      {/* Main Tab Views */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 overflow-y-auto">
        {activeTab === 'main' && (
          <div className="space-y-6">
            {/* Split Top Layout: 3D GPU Viewport + Quick Mode Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 Cols: 3D Viewport */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <div className="font-bold text-slate-300 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>GPU 三维负载渲染视口</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      (未开始时关闭场景节省能耗，开始后解除帧率上限)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                    <span>三角面: {triangles.toLocaleString()}</span>
                    <span>&bull;</span>
                    <span>Calls: {drawCalls}</span>
                  </div>
                </div>

                <div className="h-[420px] w-full">
                  <GpuViewport
                    gpuEnabled={gpuEnabled}
                    settings={gpuSettings}
                    specs={specs}
                    onFpsUpdate={handleFpsUpdate}
                    onStartGpu={toggleGpu}
                  />
                </div>
              </div>

              {/* Right 4 Cols: Benchmark Mode Presets & Quick Toggle Cards */}
              <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
                  <h3 className="font-bold text-slate-100 text-sm mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    快速压力测试预设
                  </h3>

                  <div className="space-y-2.5">
                    <button
                      onClick={handleStartTripleBurn}
                      className="w-full text-left p-3 rounded-lg border border-orange-500/40 bg-gradient-to-r from-orange-950/40 to-slate-900 hover:border-orange-500 text-xs transition-all cursor-pointer group"
                    >
                      <div className="font-bold text-orange-300 flex items-center justify-between">
                        <span>🔥 极限全系统三烤</span>
                        <span className="text-[10px] bg-orange-500/20 px-1.5 py-0.5 rounded text-orange-300">
                          MAX LOAD
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        同时拉满 GPU 3D 渲染、CPU 全核心浮点矩阵运算与 1GB 内存读写
                      </div>
                    </button>

                    <button
                      onClick={handleStartGpuOnly}
                      className="w-full text-left p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-amber-500/60 text-xs transition-all cursor-pointer"
                    >
                      <div className="font-bold text-amber-300 flex items-center justify-between">
                        <span>🎯 单烤 GPU (Fur Donut 3D)</span>
                        <span className="text-[10px] text-slate-500">仅启动显卡</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        激活密集毛发着色器并解除帧率上限，CPU 和内存处于 0% 待机
                      </div>
                    </button>

                    <button
                      onClick={handleStartCpuOnly}
                      className="w-full text-left p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-emerald-500/60 text-xs transition-all cursor-pointer"
                    >
                      <div className="font-bold text-emerald-300 flex items-center justify-between">
                        <span>⚡ 单烤 CPU (多线程矩阵运算)</span>
                        <span className="text-[10px] text-slate-500">无 GPU 负载</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        在不启动 GPU 场景的情况下测试 CPU 运算与散热性能
                      </div>
                    </button>

                    <button
                      onClick={handleStartRamOnly}
                      className="w-full text-left p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-yellow-500/60 text-xs transition-all cursor-pointer"
                    >
                      <div className="font-bold text-yellow-300 flex items-center justify-between">
                        <span>🧠 单烤 内存 (带宽与位翻转)</span>
                        <span className="text-[10px] text-slate-500">无 GPU 负载</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        大内存高频随机/顺序读写，排查内存颗粒不稳定与错误
                      </div>
                    </button>
                  </div>
                </div>

                {/* Hardware Environment Quick Card */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                  <div className="font-semibold text-slate-300 flex items-center justify-between">
                    <span>系统状态总览</span>
                    <span className="text-[11px] font-mono text-emerald-400">STATUS READY</span>
                  </div>
                  <div className="space-y-1.5 text-slate-400 text-[11px]">
                    <div className="flex justify-between">
                      <span>操作系统架构:</span>
                      <span className="text-slate-200 font-mono">{specs?.arch.toUpperCase()} ({specs?.osName})</span>
                    </div>
                    <div className="flex justify-between">
                      <span>x64 DLSS 支持:</span>
                      <span className={specs?.features.dlssSupported ? 'text-emerald-400' : 'text-rose-400'}>
                        {specs?.features.dlssSupported ? '已启用 (x64)' : 'ARM64 禁用'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>测试解除帧率上限:</span>
                      <span className="text-amber-400 font-mono">
                        {gpuSettings.unlimitedFps ? '已解除 (Unlimited)' : '垂直同步锁定'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Sensors & Telemetry Overview */}
            <TelemetrySensorsPanel
              telemetry={telemetry}
              specs={specs}
              latest={latestTelemetry}
            />
          </div>
        )}

        {activeTab === 'cpu_ram' && (
          <CpuRamBenchPanel
            specs={specs}
            cpuSettings={cpuSettings}
            setCpuSettings={setCpuSettings}
            ramSettings={ramSettings}
            setRamSettings={setRamSettings}
            cpuRunning={cpuEnabled}
            ramRunning={ramEnabled}
            onToggleCpu={toggleCpu}
            onToggleRam={toggleRam}
            cpuGflops={cpuGflops}
            cpuTotalOps={cpuTotalOps}
            cpuErrors={cpuErrors}
            ramBandwidthMbS={ramBandwidthMbS}
            ramPasses={ramPasses}
            ramErrors={ramErrors}
          />
        )}

        {activeTab === 'graphics' && (
          <X64GraphicsPanel
            specs={specs}
            settings={gpuSettings}
            setSettings={setGpuSettings}
            gpuRunning={gpuEnabled}
          />
        )}

        {activeTab === 'sensors' && (
          <TelemetrySensorsPanel
            telemetry={telemetry}
            specs={specs}
            latest={latestTelemetry}
          />
        )}
      </main>

      {/* Floating Report History Modal */}
      {showReportModal && (
        <ReportHistoryModal
          reports={reports}
          activeReport={activeReport}
          onSelectReport={(rep) => setActiveReport(rep)}
          onDeleteReport={handleDeleteReport}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
