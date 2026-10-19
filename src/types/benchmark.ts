/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemSpecs {
  platform: string;
  osName: string;
  arch: 'x64' | 'arm64' | 'x86' | 'unknown';
  isArm64: boolean;
  isX64: boolean;
  logicalCores: number;
  cpuModelName?: string;
  deviceMemoryGb: number | null;
  memorySpecsDescription?: string;
  userAgent: string;
  gpuVendor: string;
  gpuRenderer: string;
  gpuModelClean?: string;
  gpuDriverGuess: string;
  isNvidiaRtx: boolean;
  isRtx40SeriesOrNewer: boolean;
  webglVersion: string;
  maxTextureSize: number;
  maxAnisotropy: number;
  supportsFloatTextures: boolean;
  screenResolution: string;
  batteryStatus: {
    supported: boolean;
    charging?: boolean;
    level?: number;
    powerSource?: 'AC_ADAPTER' | 'BATTERY' | 'UNKNOWN';
  };
  features: {
    dlssSupported: boolean;
    dlaaSupported: boolean;
    frameGenSupported: boolean;
    rayReconstructionSupported: boolean;
    arm64RestrictionReason?: string;
  };
  availableDrives?: Array<{
    letter: string;
    path: string;
    label: string;
    totalGb: number;
    freeGb: number;
  }>;
}

export type DlssMode = 'off' | 'quality' | 'balanced' | 'performance' | 'ultra_performance';
export type GpuSceneType = 'fur_donut' | 'raymarched_core' | 'tessellation_mesh';
export type CpuAlgorithm = 'sgemm_matrix' | 'sha256_hash' | 'prime_sieve' | 'monte_carlo';
export type RamPattern = 'bandwidth_rw' | 'bitflip_checker' | 'cache_thrash';

export interface GpuSettings {
  scene: GpuSceneType;
  renderScale: number; // 0.5 ~ 2.0
  furLayers: number; // 16 ~ 64
  particleCount: number; // 0 ~ 50000
  msaa: boolean;
  unlimitedFps: boolean; // bypass vsync & render multiple passes per frame
  x64Options: {
    dlssMode: DlssMode;
    dlaa: boolean;
    frameGeneration: boolean;
    rayReconstruction: boolean;
    sharpness: number; // 0.0 ~ 1.0
  };
}

export interface CpuSettings {
  threads: number;
  algorithm: CpuAlgorithm;
  intensity: 'light' | 'standard' | 'heavy' | 'extreme';
}

export interface RamSettings {
  allocatedMb: number; // e.g. 512, 1024, 2048, 4096
  pattern: RamPattern;
}

export interface BenchmarkConfig {
  gpuEnabled: boolean;
  cpuEnabled: boolean;
  ramEnabled: boolean;
  durationSeconds: number; // 0 = manual unlimited, 60, 180, 300, 600
  gpuSettings: GpuSettings;
  cpuSettings: CpuSettings;
  ramSettings: RamSettings;
}

export interface TelemetrySample {
  timestamp: number;
  elapsedSec: number;
  fps: number;
  frametimeMs: number;
  fps1PctLow: number;
  gpuLoadPct: number;
  gpuTempEst: number;
  gpuPowerEst: number;
  cpuLoadPct: number;
  cpuOpsPerSec: number;
  cpuGflops: number;
  cpuTempEst: number;
  cpuErrors: number;
  ramAllocatedMb: number;
  ramBandwidthMbS: number;
  ramErrors: number;
  stabilityScorePct: number;
}

export interface BenchmarkReport {
  id: string;
  title: string;
  timestamp: string;
  durationSec: number;
  targetDuration: number;
  specs: SystemSpecs;
  config: BenchmarkConfig;
  stats: {
    avgFps: number;
    minFps: number;
    maxFps: number;
    low1PctFps: number;
    stabilityScorePct: number; // 3DMark standard: 97% is passing
    passed: boolean;
    totalFrames: number;
    totalCpuOps: number;
    avgCpuGflops: number;
    peakCpuTemp: number;
    peakGpuTemp: number;
    totalRamPasses: number;
    avgRamBandwidthMbS: number;
    totalErrors: number;
    throttlingSuspected: boolean;
    verdictMessage: string;
  };
  telemetry: TelemetrySample[];
}
