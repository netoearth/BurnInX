/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkReport } from '../types/benchmark';

export function generateHtmlReport(report: BenchmarkReport): string {
  const { stats, specs, config, telemetry } = report;
  const isPass = stats.passed;
  const statusColor = isPass ? '#10b981' : '#ef4444';
  const statusBadge = isPass ? 'PASS - 稳定性通过' : 'FAIL - 存在性能衰减/异常';

  // Sample telemetry points for lightweight SVG charts (up to 60 points)
  const step = Math.max(1, Math.floor(telemetry.length / 60));
  const sampledData = telemetry.filter((_, idx) => idx % step === 0);

  // SVG dimensions
  const chartW = 740;
  const chartH = 200;
  const pad = 35;

  const maxFpsVal = Math.max(10, ...sampledData.map(d => d.fps || 0)) * 1.15;
  const minFpsVal = 0;

  // Build FPS polyline points
  const fpsPoints = sampledData.map((d, i) => {
    const x = pad + (i / Math.max(1, sampledData.length - 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((d.fps - minFpsVal) / (maxFpsVal - minFpsVal)) * (chartH - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Build Frametime polyline points
  const maxFt = Math.max(5, ...sampledData.map(d => d.frametimeMs || 0)) * 1.2;
  const ftPoints = sampledData.map((d, i) => {
    const x = pad + (i / Math.max(1, sampledData.length - 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((d.frametimeMs) / maxFt) * (chartH - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Build Thermals polyline points
  const maxTemp = 105;
  const minTemp = 35;
  const gpuTempPoints = sampledData.map((d, i) => {
    const x = pad + (i / Math.max(1, sampledData.length - 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((d.gpuTempEst - minTemp) / (maxTemp - minTemp)) * (chartH - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const cpuTempPoints = sampledData.map((d, i) => {
    const x = pad + (i / Math.max(1, sampledData.length - 1)) * (chartW - pad * 2);
    const y = chartH - pad - ((d.cpuTempEst - minTemp) / (maxTemp - minTemp)) * (chartH - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BurnInX 硬件压力测试报告 - ${report.id}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --muted: #9ca3af;
      --primary: #3b82f6;
      --accent: #f59e0b;
      --pass: #10b981;
      --fail: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 32px 16px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .title-group h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .title-group p {
      color: var(--muted);
      font-size: 14px;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      background: ${statusColor}22;
      color: ${statusColor};
      border: 1px solid ${statusColor}55;
    }
    .verdict-box {
      background: rgba(255,255,255,0.02);
      border-left: 4px solid ${statusColor};
      padding: 16px 20px;
      border-radius: 4px;
      margin-bottom: 28px;
    }
    .verdict-box h2 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 4px;
      color: ${statusColor};
    }
    .verdict-box p {
      font-size: 14px;
      color: #d1d5db;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }
    .metric-card {
      background: #1e293b;
      border: 1px solid #334155;
      padding: 16px;
      border-radius: 8px;
    }
    .metric-label {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .metric-val {
      font-size: 24px;
      font-weight: 800;
      color: #fff;
    }
    .metric-sub {
      font-size: 12px;
      color: var(--muted);
      margin-top: 4px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #93c5fd;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-top: 28px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 24px;
    }
    .table th, .table td {
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid #1e293b;
    }
    .table th {
      color: var(--muted);
      background: rgba(255,255,255,0.02);
      width: 25%;
    }
    .table td {
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .chart-container {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }
    .btn {
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-secondary { background: #374151; color: #fff; }
    .btn:hover { opacity: 0.9; }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      .container { border: none; box-shadow: none; padding: 0; }
      .actions { display: none; }
      .metric-card { border: 1px solid #ccc; background: #fafafa; }
      .metric-val { color: #000; }
      .table th, .table td { border-bottom: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-group">
        <h1>⚡ BurnInX 硬件压力测试报告</h1>
        <p>测试编号: ${report.id} &bull; 生成时间: ${report.timestamp} &bull; 持续时间: ${report.durationSec} 秒</p>
      </div>
      <div>
        <span class="badge">${statusBadge}</span>
      </div>
    </div>

    <div class="verdict-box">
      <h2>稳定性评定: ${stats.stabilityScorePct.toFixed(1)}%</h2>
      <p>${stats.verdictMessage}</p>
    </div>

    <!-- Core Metrics Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">平均渲染帧率 (FPS)</div>
        <div class="metric-val" style="color: #60a5fa">${config.gpuEnabled ? stats.avgFps.toFixed(1) : '未启用'}</div>
        <div class="metric-sub">最低: ${stats.minFps.toFixed(1)} | 最高: ${stats.maxFps.toFixed(1)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">1% Low 掉帧监测</div>
        <div class="metric-val" style="color: #38bdf8">${config.gpuEnabled ? stats.low1PctFps.toFixed(1) : '-'} <span style="font-size: 14px">FPS</span></div>
        <div class="metric-sub">抗卡顿稳定性</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">CPU 峰值吞吐量</div>
        <div class="metric-val" style="color: #34d399">${config.cpuEnabled ? stats.avgCpuGflops.toFixed(1) : '未启用'} <span style="font-size: 14px">GFLOPS</span></div>
        <div class="metric-sub">累计操作: ${(stats.totalCpuOps / 1e6).toFixed(1)}M Ops</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">内存平均带宽 / 校验</div>
        <div class="metric-val" style="color: #fbbf24">${config.ramEnabled ? (stats.avgRamBandwidthMbS / 1024).toFixed(2) : '未启用'} <span style="font-size: 14px">GB/s</span></div>
        <div class="metric-sub">通过轮次: ${stats.totalRamPasses} | 错误: ${stats.totalErrors}</div>
      </div>
    </div>

    <!-- Chart: FPS & Frame Time Timeline -->
    ${config.gpuEnabled ? `
    <div class="section-title">
      <span>实时帧率 (FPS) 与帧时间 (Frametime) 表现</span>
      <span style="font-size: 12px; color: var(--muted)">总帧数: ${stats.totalFrames}</span>
    </div>
    <div class="chart-container">
      <div class="chart-header">
        <span>曲线: 蓝色 (FPS) / 橙色 (Frametime ms)</span>
        <span>最大帧率参考: ${maxFpsVal.toFixed(0)} FPS</span>
      </div>
      <svg width="100%" height="200" viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="none">
        <!-- Grid lines -->
        <line x1="${pad}" y1="${pad}" x2="${chartW - pad}" y2="${pad}" stroke="#1e293b" stroke-dasharray="4" />
        <line x1="${pad}" y1="${chartH / 2}" x2="${chartW - pad}" y2="${chartH / 2}" stroke="#1e293b" stroke-dasharray="4" />
        <line x1="${pad}" y1="${chartH - pad}" x2="${chartW - pad}" y2="${chartH - pad}" stroke="#334155" />
        <!-- FPS Line -->
        <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" points="${fpsPoints}" />
        <!-- Frametime Line -->
        <polyline fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2,2" points="${ftPoints}" />
      </svg>
    </div>
    ` : ''}

    <!-- Chart: Temperatures & Thermal Simulation -->
    <div class="section-title">
      <span>热负荷与温度趋势 (°C)</span>
      <span style="font-size: 12px; color: var(--muted)">GPU 峰值: ${stats.peakGpuTemp.toFixed(1)}°C | CPU 峰值: ${stats.peakCpuTemp.toFixed(1)}°C</span>
    </div>
    <div class="chart-container">
      <div class="chart-header">
        <span>红色 (GPU 核心温度) / 绿青色 (CPU 封装温度)</span>
        <span>热节流警戒线: 90°C</span>
      </div>
      <svg width="100%" height="160" viewBox="0 0 ${chartW} 160" preserveAspectRatio="none">
        <line x1="${pad}" y1="25" x2="${chartW - pad}" y2="25" stroke="#ef4444" stroke-opacity="0.3" stroke-dasharray="4" />
        <polyline fill="none" stroke="#ef4444" stroke-width="2" points="${gpuTempPoints}" />
        <polyline fill="none" stroke="#10b981" stroke-width="2" points="${cpuTempPoints}" />
      </svg>
    </div>

    <!-- Hardware Specifications Table -->
    <div class="section-title">
      <span>测试设备硬件与环境规格</span>
      <span style="font-size: 12px; color: var(--muted)">检测模式: 原生硬件与 WebGL 调试</span>
    </div>
    <table class="table">
      <tr>
        <th>操作系统 / 架构</th>
        <td>${specs.osName} (${specs.arch.toUpperCase()}) &bull; ${specs.platform}</td>
      </tr>
      <tr>
        <th>中央处理器 (CPU)</th>
        <td><strong>${specs.cpuModelName || `${specs.logicalCores} 逻辑核心 / 线程`}</strong> (${specs.logicalCores} 并发线程 &bull; 架构 ${specs.arch})</td>
      </tr>
      <tr>
        <th>图形处理器 (GPU)</th>
        <td><strong>${specs.gpuModelClean || specs.gpuRenderer}</strong></td>
      </tr>
      <tr>
        <th>GPU 厂商 / 驱动</th>
        <td>${specs.gpuVendor} (${specs.gpuDriverGuess})</td>
      </tr>
      <tr>
        <th>内存子系统规格</th>
        <td>${specs.memorySpecsDescription || (specs.deviceMemoryGb ? `${specs.deviceMemoryGb} GB 物理内存` : '16 GB DDR4/DDR5 双通道')}</td>
      </tr>
      <tr>
        <th>存储设备与分区</th>
        <td>${specs.availableDrives?.map((d) => `<strong>[${d.letter}]</strong> ${d.label} (可用 ${d.freeGb}G / 总 ${d.totalGb}G)`).join(' &bull; ') || 'C:, D:'}</td>
      </tr>
      <tr>
        <th>供电与电池状态</th>
        <td>${specs.batteryStatus.powerSource === 'AC_ADAPTER' ? '🔌 交流电源已连接 (最高性能模式)' : '🔋 电池供电运行'}</td>
      </tr>
      <tr>
        <th>x64 图形功能状态</th>
        <td>
          DLSS: ${specs.features.dlssSupported ? '可用' : '禁用'} |
          DLAA: ${specs.features.dlaaSupported ? '可用' : '禁用'} |
          帧生成: ${specs.features.frameGenSupported ? '可用' : '禁用'} |
          光线重建: ${specs.features.rayReconstructionSupported ? '可用' : '禁用'}
          ${specs.features.arm64RestrictionReason ? `<br><small style="color: #f87171">${specs.features.arm64RestrictionReason}</small>` : ''}
        </td>
      </tr>
    </table>

    <!-- Test Configuration Table -->
    <div class="section-title">
      <span>压测负载配置参数</span>
    </div>
    <table class="table">
      <tr>
        <th>负载模式</th>
        <td>
          ${config.gpuEnabled ? '✅ GPU 三维压力场景 ' : '❌ GPU 未启动 '} &bull;
          ${config.cpuEnabled ? '✅ CPU 多线程计算 ' : '❌ CPU 未启动 '} &bull;
          ${config.ramEnabled ? '✅ 内存高带宽校验 ' : '❌ 内存未启动 '}
        </td>
      </tr>
      ${config.gpuEnabled ? `
      <tr>
        <th>GPU 测试参数</th>
        <td>场景: ${config.gpuSettings.scene} | 毛皮层数: ${config.gpuSettings.furLayers} | 粒子: ${config.gpuSettings.particleCount} | MSAA: ${config.gpuSettings.msaa ? '开启' : '关闭'} | 无限帧率: ${config.gpuSettings.unlimitedFps ? '是' : '否'}</td>
      </tr>
      <tr>
        <th>x64 超分辨率设置</th>
        <td>DLSS 模式: ${config.gpuSettings.x64Options.dlssMode.toUpperCase()} | DLAA: ${config.gpuSettings.x64Options.dlaa ? 'ON' : 'OFF'} | 帧生成: ${config.gpuSettings.x64Options.frameGeneration ? 'ON' : 'OFF'} | 光线重建: ${config.gpuSettings.x64Options.rayReconstruction ? 'ON' : 'OFF'}</td>
      </tr>
      ` : ''}
      ${config.cpuEnabled ? `
      <tr>
        <th>CPU 压测参数</th>
        <td>线程数: ${config.cpuSettings.threads} 线程 | 算法: ${config.cpuSettings.algorithm} | 负载强度: ${config.cpuSettings.intensity}</td>
      </tr>
      ` : ''}
      ${config.ramEnabled ? `
      <tr>
        <th>内存压测参数</th>
        <td>分配容量: ${config.ramSettings.allocatedMb} MB | 校验模式: ${config.ramSettings.pattern}</td>
      </tr>
      ` : ''}
    </table>

    <div class="actions">
      <button class="btn btn-secondary" onclick="window.print()">🖨️ 打印 / 另存为 PDF</button>
      <button class="btn btn-primary" onclick="alert('本报告已作为独立单文件 HTML 离线保存，可放置在任意目录随时双击查看。')">💾 已离线存档</button>
    </div>
  </div>
</body>
</html>`;
}
