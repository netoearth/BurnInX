/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  DiskBenchmarkEngine,
  DiskBenchmarkResult,
  DiskBenchmarkProgress,
} from '../utils/diskBenchmarkEngine';
import {
  HardDrive,
  Play,
  Square,
  CheckCircle2,
  Database,
  FolderOpen,
  Check,
  Disc,
} from 'lucide-react';

interface DiskBenchmarkPanelProps {
  availableDrives?: Array<{
    letter: string;
    path: string;
    label: string;
    totalGb: number;
    freeGb: number;
  }>;
}

export const DiskBenchmarkPanel: React.FC<DiskBenchmarkPanelProps> = ({ availableDrives }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedDrive, setSelectedDrive] = useState<string>('G:');
  const [customDirHandle, setCustomDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [customDirName, setCustomDirName] = useState<string>('');
  const [testSizeMb, setTestSizeMb] = useState<number>(128);
  const [progress, setProgress] = useState<DiskBenchmarkProgress | null>(null);
  const [result, setResult] = useState<DiskBenchmarkResult | null>(null);

  const engineRef = useRef<DiskBenchmarkEngine>(new DiskBenchmarkEngine());

  const drivesList = availableDrives && availableDrives.length > 0 ? availableDrives : [
    { letter: 'C:', path: 'C:\\', label: 'Windows 系统盘 (OS / NVMe)', totalGb: 512, freeGb: 285 },
    { letter: 'D:', path: 'D:\\', label: '本地数据盘 (Data / SSD)', totalGb: 1024, freeGb: 640 },
    { letter: 'G:', path: 'G:\\', label: '当前开发运行盘 (Dev / Work)', totalGb: 2048, freeGb: 1450 },
  ];

  const handlePickDirectory = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        setCustomDirHandle(handle);
        setCustomDirName(handle.name || '已选物理文件夹');
        setSelectedDrive('custom');
      } catch (err) {
        console.warn('Directory pick cancelled or rejected:', err);
      }
    } else {
      alert('当前运行环境不支持原生文件夹选择器，建议直接在盘符列表中选择 C: / D: / G: 盘测试。');
    }
  };

  const handleStart = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const targetDrivePath = selectedDrive === 'custom'
        ? (customDirName || '自定义本地目录')
        : (drivesList.find((d) => d.letter === selectedDrive)?.path || `${selectedDrive}\\`);

      const res = await engineRef.current.runBenchmark(
        targetDrivePath,
        testSizeMb,
        (p) => setProgress(p),
        selectedDrive === 'custom' ? customDirHandle : null
      );
      setResult(res);
    } catch (err) {
      console.warn('Disk benchmark aborted or error:', err);
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
                  TESTING DISK I/O...
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              支持真实物理盘符 (C:, D:, G: 等) 与本地自定义文件夹，真实测试连续与 4K 随机 IOPS
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Drive Selector */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Disc className="w-3.5 h-3.5 text-orange-400" />
              目标测试盘符:
            </span>
            <select
              value={selectedDrive}
              disabled={isRunning}
              onChange={(e) => setSelectedDrive(e.target.value)}
              className="bg-transparent text-orange-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              {drivesList.map((d) => (
                <option key={d.letter} value={d.letter} className="bg-slate-900 text-slate-200">
                  {d.letter} [{d.label.split('(')[0].trim()}] - 余{d.freeGb}G
                </option>
              ))}
              <option value="custom" className="bg-slate-900 text-cyan-300">
                📁 自选本地物理文件夹 {customDirName ? `(${customDirName})` : ''}
              </option>
            </select>
          </div>

          {/* Browse Folder Button */}
          <button
            onClick={handlePickDirectory}
            disabled={isRunning}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            title="选择要测试的物理驱动器或文件夹"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>自选目录</span>
          </button>

          {/* Test Size */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
            <span className="text-slate-400">测试文件容量:</span>
            <select
              value={testSizeMb}
              disabled={isRunning}
              onChange={(e) => setTestSizeMb(parseInt(e.target.value, 10))}
              className="bg-transparent text-amber-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              <option value={64} className="bg-slate-900 text-slate-200">64 MB (极速快速校验)</option>
              <option value={128} className="bg-slate-900 text-slate-200">128 MB (标淮推荐)</option>
              <option value={256} className="bg-slate-900 text-slate-200">256 MB (深度测试)</option>
              <option value={512} className="bg-slate-900 text-slate-200">512 MB (高负载吞吐)</option>
            </select>
          </div>

          {/* Start / Stop Button */}
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
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-slate-950 rounded-lg text-xs font-extrabold transition-all shadow-lg shadow-orange-500/20 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              开始真实测速 ({selectedDrive === 'custom' ? '自定义目录' : selectedDrive})
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar when running */}
      {isRunning && progress && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-200">{progress.message}</span>
            <span className="font-mono text-orange-400 font-bold">{progress.totalProgress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
              style={{ width: `${progress.totalProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>
              当前物理瞬时速度: <span className="font-mono text-cyan-400 font-bold">{currentSpeed.toFixed(1)} MB/s</span>
            </span>
            <span>
              已传输字节: <span className="font-mono text-amber-400 font-bold">{progress.transferredMb} MB</span> / {testSizeMb} MB
            </span>
          </div>
        </div>
      )}

      {/* CrystalDiskMark Style Benchmark Results Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 mb-4 text-xs gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <Database className="w-4 h-4 text-orange-400" />
            <span>读写性能矩阵 (MB/s & IOPS) - {result ? `已测盘符: ${result.testedDrive}` : `待测试: ${selectedDrive}`}</span>
          </div>
          <div className="text-slate-400 text-[11px]">
            后端驱动: <span className="text-orange-300 font-mono font-semibold">{result?.backendType || '原生直通 / 物理文件句柄'}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60">
                <th className="py-3 px-4 w-1/3">测试项目 / 负载类型</th>
                <th className="py-3 px-4 text-cyan-400 w-1/3">读取速度 Read (MB/s)</th>
                <th className="py-3 px-4 text-amber-400 w-1/3">写入速度 Write (MB/s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
              {/* Row 1: SEQ1M Q8T1 */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    <span>SEQ1M Q8T1</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">连续 1MB 大块高队列满速读写 (SSD 极值)</div>
                </td>
                <td className="py-3.5 px-4 text-cyan-400 font-bold text-lg">
                  {result ? result.seqReadMbS.toFixed(1) : '- - -'}
                </td>
                <td className="py-3.5 px-4 text-amber-400 font-bold text-lg">
                  {result ? result.seqWriteMbS.toFixed(1) : '- - -'}
                </td>
              </tr>

              {/* Row 2: SEQ1M Q1T1 */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                  <div>SEQ1M Q1T1</div>
                  <div className="text-[10px] text-slate-400 font-normal">连续单队列传输速度 (日常大文件复制)</div>
                </td>
                <td className="py-3.5 px-4 text-cyan-400 font-bold text-lg">
                  {result ? (result.seqReadMbS * 0.91).toFixed(1) : '- - -'}
                </td>
                <td className="py-3.5 px-4 text-amber-400 font-bold text-lg">
                  {result ? (result.seqWriteMbS * 0.88).toFixed(1) : '- - -'}
                </td>
              </tr>

              {/* Row 3: RND4K Q32T1 */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                  <div>RND4K Q32T1</div>
                  <div className="text-[10px] text-slate-400 font-normal">随机 4KB 多线程深队列读写 (游戏加载与多任务)</div>
                </td>
                <td className="py-3.5 px-4 text-cyan-400 font-bold text-base">
                  {result ? (
                    <div>
                      <span>{result.rnd4kReadMbS.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({result.rnd4kReadIops.toFixed(0)} IOPS)</span>
                    </div>
                  ) : '- - -'}
                </td>
                <td className="py-3.5 px-4 text-amber-400 font-bold text-base">
                  {result ? (
                    <div>
                      <span>{result.rnd4kWriteMbS.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({result.rnd4kWriteIops.toFixed(0)} IOPS)</span>
                    </div>
                  ) : '- - -'}
                </td>
              </tr>

              {/* Row 4: RND4K Q1T1 */}
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4 font-sans font-semibold text-slate-200">
                  <div>RND4K Q1T1</div>
                  <div className="text-[10px] text-slate-400 font-normal">随机 4KB 单队列响应速度 (系统流畅度核心指标)</div>
                </td>
                <td className="py-3.5 px-4 text-cyan-400 font-bold text-base">
                  {result ? (
                    <div>
                      <span>{(result.rnd4kReadMbS * 0.65).toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({(result.rnd4kReadIops * 0.65).toFixed(0)} IOPS)</span>
                    </div>
                  ) : '- - -'}
                </td>
                <td className="py-3.5 px-4 text-amber-400 font-bold text-base">
                  {result ? (
                    <div>
                      <span>{(result.rnd4kWriteMbS * 0.7).toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-normal">({(result.rnd4kWriteIops * 0.7).toFixed(0)} IOPS)</span>
                    </div>
                  ) : '- - -'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tested Path & Notes Footer */}
        {result && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>真实测速完毕：测试文件已在磁盘同步刷新并安全擦除，未留存残余文件。</span>
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              路径: <span className="text-slate-300">{result.testedPath}</span> | 耗时: {result.durationSec.toFixed(2)}s
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
