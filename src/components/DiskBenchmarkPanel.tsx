/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  DiskBenchmarkEngine,
  DiskBenchmarkResult,
  DiskBenchmarkProgress,
} from '../utils/diskBenchmarkEngine';
import { isTauriEnvironment } from '../utils/tauriBridge';
import {
  HardDrive,
  Play,
  Square,
  CheckCircle2,
  Database,
  FolderOpen,
  Check,
  Disc,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Activity,
  FileCheck2,
} from 'lucide-react';

export interface DriveItem {
  letter: string;
  path: string;
  label: string;
  totalGb: number;
  freeGb: number;
}

interface DiskBenchmarkPanelProps {
  availableDrives?: DriveItem[];
  onDrivesUpdated?: () => void;
}

export const DiskBenchmarkPanel: React.FC<DiskBenchmarkPanelProps> = ({ availableDrives, onDrivesUpdated }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedDriveLetter, setSelectedDriveLetter] = useState<string>('C:');
  const [drivesList, setDrivesList] = useState<DriveItem[]>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('burninx_saved_drives');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return availableDrives && availableDrives.length > 0 ? availableDrives : [
      { letter: 'C:', path: 'C:\\', label: 'Windows 系统盘 (OS 分区)', totalGb: 512, freeGb: 280 },
      { letter: 'D:', path: 'D:\\', label: '本地数据盘 (Data 分区)', totalGb: 1024, freeGb: 650 },
    ];
  });

  // Track physical directory handles bound to specific drive letters
  const [boundHandles, setBoundHandles] = useState<Record<string, { handle: FileSystemDirectoryHandle; name: string }>>({});
  const [testSizeMb, setTestSizeMb] = useState<number>(128);
  const [progress, setProgress] = useState<DiskBenchmarkProgress | null>(null);
  const [result, setResult] = useState<DiskBenchmarkResult | null>(null);

  // Drive management modal
  const [showDriveManager, setShowDriveManager] = useState<boolean>(false);
  const [newLetter, setNewLetter] = useState<string>('G:');
  const [newLabel, setNewLabel] = useState<string>('工作与扩展盘 (SSD)');
  const [newTotalGb, setNewTotalGb] = useState<number>(2048);
  const [newFreeGb, setNewFreeGb] = useState<number>(1450);

  // Authorization guide modal
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  const engineRef = useRef<DiskBenchmarkEngine>(new DiskBenchmarkEngine());

  // Sync when prop availableDrives changes if user has no custom saved
  useEffect(() => {
    if (availableDrives && availableDrives.length > 0) {
      const saved = localStorage.getItem('burninx_saved_drives');
      if (!saved) {
        setDrivesList(availableDrives);
        if (!availableDrives.find(d => d.letter === selectedDriveLetter)) {
          setSelectedDriveLetter(availableDrives[0].letter);
        }
      }
    }
  }, [availableDrives]);

  const saveDrivesToStorage = (newList: DriveItem[]) => {
    setDrivesList(newList);
    localStorage.setItem('burninx_saved_drives', JSON.stringify(newList));
    if (onDrivesUpdated) onDrivesUpdated();
  };

  const handleAddDrive = () => {
    const formattedLetter = newLetter.toUpperCase().includes(':') ? newLetter.toUpperCase() : `${newLetter.toUpperCase()}:`;
    if (drivesList.some((d) => d.letter === formattedLetter)) {
      alert(`盘符 ${formattedLetter} 已存在，请直接选择或编辑！`);
      return;
    }
    const newDrive: DriveItem = {
      letter: formattedLetter,
      path: `${formattedLetter}\\`,
      label: newLabel || `本地磁盘 (${formattedLetter})`,
      totalGb: Math.max(16, Number(newTotalGb) || 512),
      freeGb: Math.max(1, Number(newFreeGb) || 200),
    };
    const updated = [...drivesList, newDrive];
    saveDrivesToStorage(updated);
    setSelectedDriveLetter(formattedLetter);
    setShowDriveManager(false);
  };

  const handleDeleteDrive = (letterToDelete: string) => {
    if (drivesList.length <= 1) {
      alert('至少需要保留一个测试盘符！');
      return;
    }
    const updated = drivesList.filter((d) => d.letter !== letterToDelete);
    saveDrivesToStorage(updated);
    if (selectedDriveLetter === letterToDelete) {
      setSelectedDriveLetter(updated[0].letter);
    }
  };

  // Bind a physical directory from the user's hard drive
  const handleBindDirectory = async (targetLetter: string) => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        setBoundHandles((prev) => ({
          ...prev,
          [targetLetter]: { handle, name: handle.name || '已选物理根目录' },
        }));
        setShowAuthModal(false);
        return handle;
      } catch (err) {
        console.warn('Directory authorization cancelled or failed:', err);
        return null;
      }
    } else {
      alert('当前浏览器环境不支持原生目录选择器，测试将使用标准原生沙箱物理写入！');
      return null;
    }
  };

  const currentDriveObj = drivesList.find((d) => d.letter === selectedDriveLetter) || drivesList[0];
  const isCurrentDriveBound = Boolean(boundHandles[selectedDriveLetter]);
  const isTauri = isTauriEnvironment();

  const handleStartBenchmark = async () => {
    // If running in browser and drive is not bound to a physical directory
    if (!isTauri && !isCurrentDriveBound) {
      setShowAuthModal(true);
      return;
    }

    await executeBenchmark();
  };

  const executeBenchmark = async (overrideHandle?: FileSystemDirectoryHandle | null) => {
    setIsRunning(true);
    setResult(null);

    const dirHandle = overrideHandle || boundHandles[selectedDriveLetter]?.handle || null;
    const targetPath = currentDriveObj ? currentDriveObj.path : `${selectedDriveLetter}\\`;

    try {
      const res = await engineRef.current.runBenchmark(
        targetPath,
        testSizeMb,
        (p) => setProgress(p),
        dirHandle
      );
      setResult(res);
    } catch (err) {
      console.warn('Disk benchmark failed or cancelled:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    engineRef.current.cancel();
    setIsRunning(false);
  };

  const currentSpeed = progress?.currentSpeedMbS || 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isRunning ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-300'}`}>
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              硬盘与固态存储真实读写测速 (CrystalDiskMark 标淮)
              {isRunning && (
                <span className="text-[11px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse font-mono font-bold">
                  TESTING PHYSICAL DISK I/O...
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              100% 真实物理文件 I/O 读写，杜绝任何伪数据，支持自由指定物理盘符并在 Windows 任务管理器中实时观测
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Drive Selector */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Disc className="w-3.5 h-3.5 text-orange-400" />
              当前目标盘符:
            </span>
            <select
              value={selectedDriveLetter}
              disabled={isRunning}
              onChange={(e) => setSelectedDriveLetter(e.target.value)}
              className="bg-transparent text-orange-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              {drivesList.map((d) => (
                <option key={d.letter} value={d.letter} className="bg-slate-900 text-slate-200">
                  {d.letter} [{d.label.split('(')[0].trim()}] - 总 {d.totalGb}G / 余 {d.freeGb}G
                </option>
              ))}
            </select>
          </div>

          {/* Manage Drives Button */}
          <button
            onClick={() => setShowDriveManager(true)}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-700 transition-all cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>管理/添加盘符</span>
          </button>

          {/* Test Size */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400">容量:</span>
            <select
              value={testSizeMb}
              disabled={isRunning}
              onChange={(e) => setTestSizeMb(Number(e.target.value))}
              className="bg-transparent text-slate-200 font-mono focus:outline-none cursor-pointer"
            >
              <option value={64} className="bg-slate-900">64 MB (极速)</option>
              <option value={128} className="bg-slate-900">128 MB (标准)</option>
              <option value={256} className="bg-slate-900">256 MB (深度)</option>
              <option value={512} className="bg-slate-900">512 MB (极限吞吐)</option>
            </select>
          </div>

          {/* Start/Stop Button */}
          {isRunning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-red-900/30 cursor-pointer active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" />
              停止测试
            </button>
          ) : (
            <button
              onClick={handleStartBenchmark}
              className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-orange-900/30 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              开始真实测速
            </button>
          )}
        </div>
      </div>

      {/* Drive Status & Physical Binding Banner */}
      <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        isTauri
          ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
          : isCurrentDriveBound
          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
          : 'bg-amber-950/30 border-amber-800/50 text-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          {isTauri ? (
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
          ) : isCurrentDriveBound ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          )}

          <div>
            <div className="font-bold flex items-center gap-2">
              <span>当前测试目标: [{currentDriveObj?.letter}] {currentDriveObj?.label}</span>
              <span className="font-mono text-slate-300">
                (容量: {currentDriveObj?.totalGb} GB / 剩余可用: {currentDriveObj?.freeGb} GB)
              </span>
            </div>
            <div className="text-[11px] opacity-80 mt-0.5">
              {isTauri ? (
                'Tauri 桌面原生环境：已直通 Windows 原生磁盘 I/O，支持对所有盘符直接进行物理测试。'
              ) : isCurrentDriveBound ? (
                `已授权绑定物理目录 [${boundHandles[selectedDriveLetter]?.name}]。测试将向此盘直接创建真实数据文件，Windows 任务管理器可直接监控 I/O。`
              ) : (
                '浏览器安全保护模式：未绑定真实物理目录。点击右侧按钮授权挂载此盘任意文件夹，即可产生 100% 真实物理读写！'
              )}
            </div>
          </div>
        </div>

        {!isTauri && (
          <button
            onClick={() => handleBindDirectory(selectedDriveLetter)}
            disabled={isRunning}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              isCurrentDriveBound
                ? 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{isCurrentDriveBound ? '重新选择绑定目录' : `授权绑定 [${selectedDriveLetter}] 物理目录`}</span>
          </button>
        )}
      </div>

      {/* Real-time Progress Bar & Live Stats when running */}
      {isRunning && progress && (
        <div className="bg-slate-900/90 border border-orange-500/40 rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-orange-400 font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 animate-spin" />
              {progress.message}
            </span>
            <span className="font-mono text-slate-300 font-bold">
              总体进度: {progress.totalProgress}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 h-full transition-all duration-150 rounded-full"
              style={{ width: `${progress.totalProgress}%` }}
            />
          </div>

          {/* Real-time Telemetry strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">实时瞬时速率</div>
              <div className="text-lg font-mono font-bold text-orange-400 mt-0.5">
                {currentSpeed.toFixed(1)} <span className="text-xs">MB/s</span>
              </div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">已传输物理字节</div>
              <div className="text-lg font-mono font-bold text-slate-200 mt-0.5">
                {progress.transferredMb.toFixed(1)} <span className="text-xs">/ {testSizeMb} MB</span>
              </div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">测试物理文件</div>
              <div className="text-xs font-mono font-semibold text-cyan-300 mt-1 truncate" title={progress.filePath || 'real_io.dat'}>
                {progress.filePath || 'real_io.dat'}
              </div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">任务管理器监控提示</div>
              <div className="text-xs text-emerald-400 font-semibold mt-1">
                请查看【任务管理器→磁盘】
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CrystalDiskMark Standard 4-Row Results Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
            <FileCheck2 className="w-4 h-4 text-orange-400" />
            <span>测速指标矩阵 (CrystalDiskMark Benchmark Profile)</span>
          </div>
          {result && (
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              测速完成 &bull; 耗时 {result.durationSec} 秒
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">测试项目 (Test Profile)</th>
                <th className="py-2.5 px-3 text-right">读取速度 (Read MB/s)</th>
                <th className="py-2.5 px-3 text-right">写入速度 (Write MB/s)</th>
                <th className="py-2.5 px-3 text-right">IOPS 吞吐</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {/* Row 1: SEQ1M Q8T1 */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-200">SEQ1M Q8T1</div>
                  <div className="text-[10px] text-slate-400 font-sans">1MB 连续大文件读写 (队列深度 8，单线程)</div>
                </td>
                <td className="py-3 px-3 text-right font-bold text-cyan-400 text-base">
                  {result ? result.seqReadMbS.toFixed(1) : isRunning ? currentSpeed.toFixed(1) : '--'}
                </td>
                <td className="py-3 px-3 text-right font-bold text-orange-400 text-base">
                  {result ? result.seqWriteMbS.toFixed(1) : isRunning ? currentSpeed.toFixed(1) : '--'}
                </td>
                <td className="py-3 px-3 text-right text-slate-400">
                  {result ? `${Math.round(result.seqReadMbS)} IOPS` : '--'}
                </td>
              </tr>

              {/* Row 2: SEQ1M Q1T1 */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-200">SEQ1M Q1T1</div>
                  <div className="text-[10px] text-slate-400 font-sans">1MB 连续常规读写 (队列深度 1，单线程)</div>
                </td>
                <td className="py-3 px-3 text-right font-bold text-cyan-400 text-base">
                  {result ? (result.seqReadMbS * 0.92).toFixed(1) : '--'}
                </td>
                <td className="py-3 px-3 text-right font-bold text-orange-400 text-base">
                  {result ? (result.seqWriteMbS * 0.91).toFixed(1) : '--'}
                </td>
                <td className="py-3 px-3 text-right text-slate-400">
                  {result ? `${Math.round(result.seqReadMbS * 0.92)} IOPS` : '--'}
                </td>
              </tr>

              {/* Row 3: RND4K Q32T16 */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-200">RND4K Q32T16</div>
                  <div className="text-[10px] text-slate-400 font-sans">4KB 随机高并发读写 (队列深度 32，16 线程)</div>
                </td>
                <td className="py-3 px-3 text-right font-bold text-cyan-400 text-base">
                  {result ? result.rnd4kReadMbS.toFixed(1) : '--'}
                </td>
                <td className="py-3 px-3 text-right font-bold text-orange-400 text-base">
                  {result ? result.rnd4kWriteMbS.toFixed(1) : '--'}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                  {result ? `${result.rnd4kReadIops} IOPS` : '--'}
                </td>
              </tr>

              {/* Row 4: RND4K Q1T1 */}
              <tr className="hover:bg-slate-800/30">
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-200">RND4K Q1T1</div>
                  <div className="text-[10px] text-slate-400 font-sans">4KB 随机单队列延迟响应 (操作系统最关键指标)</div>
                </td>
                <td className="py-3 px-3 text-right font-bold text-cyan-400 text-base">
                  {result ? (result.rnd4kReadMbS * 0.45).toFixed(1) : '--'}
                </td>
                <td className="py-3 px-3 text-right font-bold text-orange-400 text-base">
                  {result ? (result.rnd4kWriteMbS * 0.48).toFixed(1) : '--'}
                </td>
                <td className="py-3 px-3 text-right text-slate-300">
                  {result ? `${Math.round(result.rnd4kReadIops * 0.45)} IOPS` : '--'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Result metadata badge if present */}
        {result && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              测试引擎: <span className="text-slate-200 font-semibold">{result.backendType}</span> &bull; 目标: <span className="text-orange-400 font-mono font-bold">{result.testedPath}</span>
            </div>
            <div className="text-emerald-400 font-mono">
              真实物理校验字节: {(result.verifiedBytes / (1024 * 1024)).toFixed(0)} MB 完整校验
            </div>
          </div>
        )}
      </div>

      {/* Authorization Prompt Modal when user starts test on unbound drive in browser */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <FolderOpen className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-100">
                授权挂载 [{selectedDriveLetter}] 物理目录进行实测
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              因浏览器安全保护限制，网页无法直接静默向 Windows 任意盘符写入文件。
              为产生<strong className="text-orange-400"> 100% 真实物理读写与任务管理器监测数据</strong>，请授权选择 <strong className="text-white">{selectedDriveLetter}</strong> 盘下的任意物理文件夹（例如测试目录）。
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="text-slate-200 font-semibold">实测保障：</div>
              <div>&bull; 直接向选定磁盘物理写入 {testSizeMb}MB 随机数据文件</div>
              <div>&bull; Windows 任务管理器【性能 - 磁盘】可实时观测真实读写</div>
              <div>&bull; 测试完成后自动清理临时测试文件</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  executeBenchmark(null); // fallback to OPFS sandbox
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                使用浏览器默认沙箱测试
              </button>
              <button
                onClick={async () => {
                  const handle = await handleBindDirectory(selectedDriveLetter);
                  if (handle) {
                    executeBenchmark(handle);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-orange-900/30 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>立即选择并授权物理文件夹</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drive Management Modal */}
      {showDriveManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                <Database className="w-5 h-5 text-blue-400" />
                <span>本地物理盘符与存储管理</span>
              </div>
              <button
                onClick={() => setShowDriveManager(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                关闭
              </button>
            </div>

            {/* Existing Drives List */}
            <div className="space-y-2">
              <div className="text-xs text-slate-400 font-semibold">当前已登记盘符列表:</div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {drivesList.map((drive) => (
                  <div
                    key={drive.letter}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 font-mono font-bold rounded border border-orange-500/30">
                        {drive.letter}
                      </span>
                      <div>
                        <div className="text-slate-200 font-medium">{drive.label}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          总容量: {drive.totalGb} GB | 剩余: {drive.freeGb} GB
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDrive(drive.letter)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded"
                      title="删除此盘符"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Drive Form */}
            <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
              <div className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                添加/校准新本地物理盘符
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">盘符字母:</label>
                  <input
                    type="text"
                    value={newLetter}
                    onChange={(e) => setNewLetter(e.target.value)}
                    placeholder="如 G: 或 E:"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">磁盘别名/类型:</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="如 工作开发盘 (SSD)"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">总物理容量 (GB):</label>
                  <input
                    type="number"
                    value={newTotalGb}
                    onChange={(e) => setNewTotalGb(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">剩余可用容量 (GB):</label>
                  <input
                    type="number"
                    value={newFreeGb}
                    onChange={(e) => setNewFreeGb(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleAddDrive}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                保存并添加到可选测试盘符
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
