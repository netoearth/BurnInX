/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BenchmarkReport } from '../types/benchmark';
import { generateHtmlReport } from '../utils/htmlReportGenerator';
import {
  openReportFolderNative,
  saveReportNative,
  isTauriEnvironment,
} from '../utils/tauriBridge';
import {
  FileText,
  Download,
  Printer,
  Trash2,
  FolderOpen,
  ArrowRightLeft,
  X,
  CheckCircle,
  AlertCircle,
  Flame,
  Cpu,
  MemoryStick,
  ExternalLink,
} from 'lucide-react';

interface ReportHistoryModalProps {
  reports: BenchmarkReport[];
  activeReport: BenchmarkReport | null;
  onSelectReport: (report: BenchmarkReport) => void;
  onDeleteReport: (id: string) => void;
  onClose: () => void;
}

export const ReportHistoryModal: React.FC<ReportHistoryModalProps> = ({
  reports,
  activeReport,
  onSelectReport,
  onDeleteReport,
  onClose,
}) => {
  const [compareReportId, setCompareReportId] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const handleDownloadHtml = async (report: BenchmarkReport) => {
    const htmlContent = generateHtmlReport(report);
    const filename = `BurnInX_Report_${report.id.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.html`;
    const res = await saveReportNative(filename, htmlContent);
    if (res.path) {
      setDownloadSuccessMessage(`已通过原生系统写入保存至: ${res.path}`);
    } else {
      setDownloadSuccessMessage(`已下载独立 HTML 报告至本地文件夹！随时双击离线打开。`);
    }
    setTimeout(() => setDownloadSuccessMessage(null), 5000);
  };

  const handleOpenFolder = async () => {
    const res = await openReportFolderNative();
    setDownloadSuccessMessage(res.message);
    setTimeout(() => setDownloadSuccessMessage(null), 5000);
  };

  const handleOpenInNewWindow = (report: BenchmarkReport) => {
    const htmlContent = generateHtmlReport(report);
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    }
  };

  const compareReport = reports.find((r) => r.id === compareReportId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                测试诊断报告与历史留存中心
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                  已留存 {reports.length} 份报告
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                可生成自包含单文件 HTML 报告保存至电脑，支持离线查看、打印及多次烤机对比
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="在 Windows 资源管理器中直接定位并打开报告文件夹"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>打开报告文件夹</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadSuccessMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-600/40 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{downloadSuccessMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Reports List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>测试报告历史记录</span>
            </div>

            {reports.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/50 border border-slate-800 rounded-xl text-slate-400 text-xs">
                暂无历史记录，完成一次压力测试后将自动留存。
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {reports.map((rep) => {
                  const isSelected = activeReport?.id === rep.id;
                  const isCompare = compareReportId === rep.id;

                  return (
                    <div
                      key={rep.id}
                      onClick={() => onSelectReport(rep)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500/60 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-slate-400 text-[11px]">
                          {rep.timestamp.slice(11, 19)} &bull; {rep.durationSec}s
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            rep.stats.passed
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {rep.stats.passed ? 'PASS' : 'FAIL'} ({rep.stats.stabilityScorePct.toFixed(1)}%)
                        </span>
                      </div>

                      <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span className="truncate">{rep.title}</span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        {rep.config.gpuEnabled && <span>GPU: {rep.stats.avgFps.toFixed(0)} FPS</span>}
                        {rep.config.cpuEnabled && <span>CPU: {rep.stats.avgCpuGflops.toFixed(1)} G</span>}
                        {rep.config.ramEnabled && <span>RAM: {(rep.stats.avgRamBandwidthMbS / 1024).toFixed(1)} GB/s</span>}
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCompareReportId(isCompare ? null : rep.id);
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            isCompare
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isCompare ? '取消对比' : '加入对比'}
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReport(rep.id);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Report Detailed Preview & Compare */}
          <div className="lg:col-span-8 bg-slate-950/60 border border-slate-800 rounded-xl p-5 overflow-y-auto">
            {activeReport ? (
              <div className="space-y-6">
                {/* Header Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">
                      {activeReport.title}
                    </h3>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      报告 ID: {activeReport.id} &bull; 生成于 {activeReport.timestamp}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenFolder}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      打开报告文件夹
                    </button>
                    <button
                      onClick={() => handleDownloadHtml(activeReport)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      下载/导出 HTML 报告
                    </button>
                    <button
                      onClick={() => handleOpenInNewWindow(activeReport)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-all cursor-pointer border border-slate-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      在新窗口预览
                    </button>
                  </div>
                </div>

                {/* Compare Mode Banner if enabled */}
                {compareReport && compareReport.id !== activeReport.id && (
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-3">
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>对比模式: 【当前报告】 对比 【历史对比项: {compareReport.title}】</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 mb-1">平均 FPS</div>
                        <div className="font-bold text-slate-200">
                          {activeReport.stats.avgFps.toFixed(1)} vs{' '}
                          <span className="text-amber-400">{compareReport.stats.avgFps.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 mb-1">稳定性评分</div>
                        <div className="font-bold text-slate-200">
                          {activeReport.stats.stabilityScorePct.toFixed(1)}% vs{' '}
                          <span className="text-amber-400">{compareReport.stats.stabilityScorePct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400 mb-1">峰值 GPU 温度</div>
                        <div className="font-bold text-slate-200">
                          {activeReport.stats.peakGpuTemp.toFixed(1)}°C vs{' '}
                          <span className="text-amber-400">{compareReport.stats.peakGpuTemp.toFixed(1)}°C</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verdict Card */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    activeReport.stats.passed
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {activeReport.stats.passed ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold text-sm">
                      稳定性评定: {activeReport.stats.stabilityScorePct.toFixed(1)}% (
                      {activeReport.stats.passed ? '测试通过' : '未通过'})
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {activeReport.stats.verdictMessage}
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="text-[11px] text-slate-400">平均帧率 (FPS)</div>
                    <div className="text-xl font-bold font-mono text-blue-400">
                      {activeReport.config.gpuEnabled ? activeReport.stats.avgFps.toFixed(1) : '未开启'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      1% Low: {activeReport.stats.low1PctFps.toFixed(1)} FPS
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="text-[11px] text-slate-400">CPU 算力</div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {activeReport.config.cpuEnabled ? activeReport.stats.avgCpuGflops.toFixed(1) : '未开启'}{' '}
                      <span className="text-xs">GFLOPS</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {(activeReport.stats.totalCpuOps / 1e6).toFixed(1)}M Ops
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="text-[11px] text-slate-400">内存平均带宽</div>
                    <div className="text-xl font-bold font-mono text-amber-400">
                      {activeReport.config.ramEnabled
                        ? (activeReport.stats.avgRamBandwidthMbS / 1024).toFixed(2)
                        : '未开启'}{' '}
                      <span className="text-xs">GB/s</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      错误数: {activeReport.stats.totalErrors}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                    <div className="text-[11px] text-slate-400">最高热度 / 降频</div>
                    <div className="text-xl font-bold font-mono text-rose-400">
                      {Math.max(activeReport.stats.peakGpuTemp, activeReport.stats.peakCpuTemp).toFixed(0)}°C
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {activeReport.stats.throttlingSuspected ? '存在降频' : '温控良好'}
                    </div>
                  </div>
                </div>

                {/* Specs Summary */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-2">
                  <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1.5">
                    设备规格与配置
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-400">
                    <div>
                      系统与架构:{' '}
                      <span className="text-slate-200">
                        {activeReport.specs.osName} ({activeReport.specs.arch.toUpperCase()})
                      </span>
                    </div>
                    <div>
                      图形芯片:{' '}
                      <span className="text-slate-200">
                        {activeReport.specs.gpuRenderer.split('/')[0]}
                      </span>
                    </div>
                    <div>
                      CPU 核心:{' '}
                      <span className="text-slate-200">
                        {activeReport.specs.logicalCores} 逻辑核心
                      </span>
                    </div>
                    <div>
                      DLSS 模式:{' '}
                      <span className="text-slate-200">
                        {activeReport.config.gpuSettings.x64Options.dlssMode.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                <FileText className="w-10 h-10 mb-2 text-slate-600" />
                请从左侧列表选择一份报告查看详细指标。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
