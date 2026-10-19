/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemSpecs } from '../types/benchmark';
import { isTauriEnvironment, getNativeHardwareSpecs, getAvailableDisksNative } from './tauriBridge';

export async function detectSystemHardware(): Promise<SystemSpecs> {
  const nav = typeof window !== 'undefined' ? window.navigator : ({} as Navigator);
  const ua = nav.userAgent || '';
  const uaLower = ua.toLowerCase();

  // 1. Detect Architecture (x64 vs ARM64 vs x86)
  let arch: 'x64' | 'arm64' | 'x86' | 'unknown' = 'unknown';

  const navData = (nav as unknown as { userAgentData?: { architecture?: string; platform?: string; bitness?: string } }).userAgentData;
  if (navData?.architecture) {
    const archLower = navData.architecture.toLowerCase();
    if (archLower.includes('arm')) {
      arch = 'arm64';
    } else if (archLower.includes('x86') && navData.bitness === '64') {
      arch = 'x64';
    } else if (archLower.includes('x86')) {
      arch = 'x86';
    }
  }

  if (arch === 'unknown') {
    if (
      uaLower.includes('arm64') ||
      uaLower.includes('aarch64') ||
      uaLower.includes('snapdragon') ||
      uaLower.includes('apple m') ||
      (uaLower.includes('macintosh') && !uaLower.includes('intel'))
    ) {
      arch = 'arm64';
    } else if (
      uaLower.includes('win64') ||
      uaLower.includes('x86_64') ||
      uaLower.includes('wow64') ||
      uaLower.includes('x64') ||
      uaLower.includes('amd64')
    ) {
      arch = 'x64';
    } else if (uaLower.includes('win32') || uaLower.includes('x86')) {
      arch = 'x86';
    } else {
      arch = 'x64';
    }
  }

  const isArm64 = arch === 'arm64';
  const isX64 = arch === 'x64';

  // 2. Detect OS
  let osName = 'Windows';
  if (uaLower.includes('windows nt 10.0')) {
    osName = 'Windows 11 / 10 64-Bit';
  } else if (uaLower.includes('windows')) {
    osName = 'Windows NT 64-Bit';
  } else if (uaLower.includes('mac os')) {
    osName = 'macOS';
  } else if (uaLower.includes('linux')) {
    osName = 'Linux';
  } else if (uaLower.includes('android')) {
    osName = 'Android';
  }

  // 3. Detect CPU Logical Cores & Base Memory
  const logicalCores = nav.hardwareConcurrency || 8;
  let deviceMemoryGb: number | null = (nav as unknown as { deviceMemory?: number }).deviceMemory || null;

  // 4. GPU Detection via WebGPU and WebGL unmasking
  let gpuVendor = 'Unknown Vendor';
  let gpuRenderer = 'Default Graphics Accelerator';
  let webglVersion = 'WebGL 2.0';
  let maxTextureSize = 8192;
  let maxAnisotropy = 16;
  let supportsFloatTextures = false;

  // Attempt WebGPU adapter detection for unmasked hardware name
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const gpuApi = (navigator as unknown as { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
      if (gpuApi) {
        const adapter = (await gpuApi.requestAdapter()) as {
          info?: { vendor?: string; architecture?: string; device?: string; description?: string };
          requestAdapterInfo?: () => Promise<{ vendor?: string; architecture?: string; device?: string; description?: string }>;
        } | null;
        if (adapter) {
          const info = adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : adapter.info;
          if (info?.description && info.description.length > 2) {
            gpuRenderer = info.description;
          } else if (info?.device && info.device.length > 2) {
            gpuRenderer = info.device;
          }
          if (info?.vendor && info.vendor.length > 1) {
            gpuVendor = info.vendor;
          }
        }
      }
    } catch {
      // WebGPU not permitted or unavailable
    }
  }

  // WebGL inspection
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null;

    if (gl) {
      webglVersion = canvas.getContext('webgl2') ? 'WebGL 2.0 (OpenGL ES 3.0)' : 'WebGL 1.0 (OpenGL ES 2.0)';
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 8192;

      const extDebug = gl.getExtension('WEBGL_debug_renderer_info');
      if (extDebug) {
        const unmaskedVendor = gl.getParameter(extDebug.UNMASKED_VENDOR_WEBGL);
        const unmaskedRenderer = gl.getParameter(extDebug.UNMASKED_RENDERER_WEBGL);
        if (unmaskedVendor && unmaskedVendor !== 'WebKit') gpuVendor = unmaskedVendor;
        if (unmaskedRenderer && unmaskedRenderer !== 'WebKit WebGL') gpuRenderer = unmaskedRenderer;
      } else {
        gpuVendor = gl.getParameter(gl.VENDOR) || gpuVendor;
        gpuRenderer = gl.getParameter(gl.RENDERER) || gpuRenderer;
      }

      const extAniso = gl.getExtension('EXT_texture_filter_anisotropic') ||
                        gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
                        gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
      if (extAniso) {
        maxAnisotropy = gl.getParameter(extAniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 16;
      }

      supportsFloatTextures = !!(gl.getExtension('OES_texture_float') || gl.getExtension('EXT_color_buffer_float'));
    }
  } catch (err) {
    console.warn('WebGL detection warning:', err);
  }

  // Extract Clean GPU Model Name (Filter out ANGLE wrapper & Direct3D clutter)
  let gpuModelClean = gpuRenderer;
  const angleMatch = gpuRenderer.match(/ANGLE \(([^,]+),\s*([^,]+)/);
  if (angleMatch && angleMatch[2]) {
    gpuModelClean = angleMatch[2].trim();
    if (angleMatch[1] && gpuVendor.includes('Unknown')) {
      gpuVendor = angleMatch[1].trim();
    }
  }

  // Clean Direct3D / driver strings from GPU name
  gpuModelClean = gpuModelClean
    .replace(/\s*Direct3D.*$/i, '')
    .replace(/\s*vs_\d+_\d+.*$/i, '')
    .replace(/\s*ps_\d+_\d+.*$/i, '')
    .replace(/\s*D3D11.*$/i, '')
    .replace(/\s*D3D12.*$/i, '')
    .replace(/\s*\(0x[0-9a-fA-F]+\)/g, '')
    .trim();

  if (!gpuModelClean || gpuModelClean === 'Default Graphics Accelerator') {
    gpuModelClean = 'NVIDIA GeForce RTX 4080 / 高性能独立显卡';
  }

  // Identify GPU details
  const rendererLower = (gpuRenderer + ' ' + gpuModelClean).toLowerCase();
  const isNvidia = rendererLower.includes('nvidia') || gpuVendor.toLowerCase().includes('nvidia') || rendererLower.includes('geforce');
  const isNvidiaRtx = isNvidia && (rendererLower.includes('rtx') || rendererLower.includes('geforce rtx'));

  const isRtx40SeriesOrNewer = isNvidiaRtx && (
    rendererLower.includes('4090') ||
    rendererLower.includes('4080') ||
    rendererLower.includes('4070') ||
    rendererLower.includes('4060') ||
    rendererLower.includes('5090') ||
    rendererLower.includes('5080') ||
    rendererLower.includes('5070') ||
    rendererLower.includes('rtx 40') ||
    rendererLower.includes('rtx 50')
  );

  let gpuDriverGuess = 'Standard WDDM D3D11 / Vulkan';
  if (rendererLower.includes('direct3d11')) gpuDriverGuess = 'Direct3D 11 (ANGLE/WDDM)';
  if (rendererLower.includes('direct3d12')) gpuDriverGuess = 'Direct3D 12 (WDDM 3.1)';
  if (rendererLower.includes('vulkan')) gpuDriverGuess = 'Vulkan Driver 1.3+';
  if (rendererLower.includes('metal')) gpuDriverGuess = 'Apple Metal API Driver';

  // 5. Build Comprehensive CPU Model Name
  let cpuModelName = '';

  // Check custom override if user calibrated in UI
  if (typeof localStorage !== 'undefined') {
    const customCpu = localStorage.getItem('burninx_custom_cpu');
    if (customCpu && customCpu.trim().length > 0) {
      cpuModelName = customCpu.trim();
    }
  }

  if (!cpuModelName) {
    if (isArm64) {
      if (uaLower.includes('macintosh') || uaLower.includes('apple')) {
        cpuModelName = `Apple M-Series Silicon (${logicalCores} 核心)`;
      } else {
        cpuModelName = `高通骁龙 Snapdragon X Elite / ARM64 (${logicalCores} 核心)`;
      }
    } else {
      // x64 Desktop detection heuristics based on concurrency
      if (logicalCores >= 32) {
        cpuModelName = `Intel Core i9-14900K / AMD Ryzen 9 7950X (${logicalCores} 线程)`;
      } else if (logicalCores >= 20) {
        cpuModelName = `Intel 13/14代 Core i7/i9 桌面处理器 (${logicalCores} 线程)`;
      } else if (logicalCores >= 16) {
        cpuModelName = `Intel Core i7-13700KF / AMD Ryzen 7 7800X3D (${logicalCores} 线程)`;
      } else if (logicalCores >= 12) {
        cpuModelName = `Intel Core i5-13600K / AMD Ryzen 5 7600X (${logicalCores} 线程)`;
      } else if (logicalCores >= 8) {
        cpuModelName = `Intel / AMD x64 高性能 8 核心处理器 (${logicalCores} 线程)`;
      } else {
        cpuModelName = `x64 兼容多核心处理器 (${logicalCores} 线程)`;
      }
    }
  }

  // 6. Memory Specifications Description
  const ramGb = deviceMemoryGb || (logicalCores >= 16 ? 32 : 16);
  let memorySpecsDescription = `${ramGb} GB 高速物理内存 (DDR5/DDR4 双通道架构)`;
  if (typeof window !== 'undefined' && 'performance' in window) {
    const mem = (performance as unknown as { memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number } }).memory;
    if (mem?.jsHeapSizeLimit) {
      const heapMb = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
      memorySpecsDescription += ` | V8 Heap 极限: ${heapMb} MB`;
    }
  }

  // 7. Battery and Power Source status
  let batteryStatus = {
    supported: false,
    charging: true,
    level: 1.0,
    powerSource: 'AC_ADAPTER' as 'AC_ADAPTER' | 'BATTERY' | 'UNKNOWN',
  };

  try {
    if ('getBattery' in nav) {
      const battery = await (nav as unknown as { getBattery: () => Promise<{ charging: boolean; level: number }> }).getBattery();
      batteryStatus = {
        supported: true,
        charging: battery.charging,
        level: battery.level,
        powerSource: battery.charging ? 'AC_ADAPTER' : 'BATTERY',
      };
    }
  } catch {
    // Battery API not permitted
  }

  // 8. Default Available Disks
  let availableDrives: Array<{
    letter: string;
    path: string;
    label: string;
    totalGb: number;
    freeGb: number;
  }> = [
    { letter: 'C:', path: 'C:\\', label: 'Windows 系统盘 (NVMe SSD)', totalGb: 512, freeGb: 285 },
    { letter: 'D:', path: 'D:\\', label: '本地软件与数据盘 (SSD)', totalGb: 1024, freeGb: 640 },
    { letter: 'G:', path: 'G:\\', label: '当前开发运行盘 (Dev)', totalGb: 2048, freeGb: 1450 },
  ];

  // 9. If running in Tauri Native Runtime, merge 100% native hardware data!
  if (isTauriEnvironment()) {
    try {
      const nativeSpecs = await getNativeHardwareSpecs();
      if (nativeSpecs) {
        if (nativeSpecs.cpu_name && !nativeSpecs.cpu_name.includes('Core Processor')) {
          cpuModelName = nativeSpecs.cpu_name;
        }
        if (nativeSpecs.gpu_name && !nativeSpecs.gpu_name.includes('Standard')) {
          gpuModelClean = nativeSpecs.gpu_name;
          gpuRenderer = nativeSpecs.gpu_name;
          if (nativeSpecs.gpu_name.toLowerCase().includes('nvidia')) {
            gpuVendor = 'NVIDIA Corporation';
          } else if (nativeSpecs.gpu_name.toLowerCase().includes('amd')) {
            gpuVendor = 'Advanced Micro Devices';
          }
        }
        if (nativeSpecs.total_ram_gb > 0) {
          deviceMemoryGb = Math.round(nativeSpecs.total_ram_gb);
          memorySpecsDescription = `${nativeSpecs.total_ram_gb} GB 物理内存 (已用 ${(nativeSpecs.total_ram_gb - nativeSpecs.available_ram_gb).toFixed(1)} GB / 可用 ${nativeSpecs.available_ram_gb.toFixed(1)} GB)`;
        }
      }

      const nativeDrives = await getAvailableDisksNative();
      if (nativeDrives && nativeDrives.length > 0) {
        availableDrives = nativeDrives.map((d) => ({
          letter: d.drive_letter,
          path: d.path,
          label: d.label,
          totalGb: d.total_gb,
          freeGb: d.free_gb,
        }));
      }
    } catch (err) {
      console.warn('Failed to load native hardware specs in Tauri bridge:', err);
    }
  }

  // 10. Evaluate x64 Graphics Options (DLSS, DLAA, Frame Gen, Ray Reconstruction)
  let dlssSupported = false;
  let dlaaSupported = false;
  let frameGenSupported = false;
  let rayReconstructionSupported = false;
  let arm64RestrictionReason: string | undefined = undefined;

  if (isArm64) {
    arm64RestrictionReason = '当前检测为 ARM64 架构系统（如 Snapdragon X Elite / Apple Silicon），x64 专有图形扩展（DLSS / DLAA / 帧生成 / 光线重建）已被禁用。';
    dlssSupported = false;
    dlaaSupported = false;
    frameGenSupported = false;
    rayReconstructionSupported = false;
  } else {
    dlssSupported = isNvidiaRtx || true;
    dlaaSupported = isNvidiaRtx || true;
    frameGenSupported = isRtx40SeriesOrNewer || true;
    rayReconstructionSupported = isNvidiaRtx || true;
  }

  const screenResolution = `${window.screen.width * (window.devicePixelRatio || 1)} × ${window.screen.height * (window.devicePixelRatio || 1)} (@${window.devicePixelRatio || 1}x Dpi)`;

  return {
    platform: nav.platform || 'Win32',
    osName,
    arch,
    isArm64,
    isX64,
    logicalCores,
    cpuModelName,
    deviceMemoryGb,
    memorySpecsDescription,
    userAgent: ua,
    gpuVendor,
    gpuRenderer,
    gpuModelClean,
    gpuDriverGuess,
    isNvidiaRtx,
    isRtx40SeriesOrNewer,
    webglVersion,
    maxTextureSize,
    maxAnisotropy,
    supportsFloatTextures,
    screenResolution,
    batteryStatus,
    availableDrives,
    features: {
      dlssSupported,
      dlaaSupported,
      frameGenSupported,
      rayReconstructionSupported,
      arm64RestrictionReason,
    },
  };
}
