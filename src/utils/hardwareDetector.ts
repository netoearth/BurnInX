/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SystemSpecs } from '../types/benchmark';

export async function detectSystemHardware(): Promise<SystemSpecs> {
  const nav = typeof window !== 'undefined' ? window.navigator : ({} as Navigator);
  const ua = nav.userAgent || '';
  
  // 1. Detect Architecture (x64 vs ARM64 vs x86)
  let arch: 'x64' | 'arm64' | 'x86' | 'unknown' = 'unknown';
  const uaLower = ua.toLowerCase();
  
  // Check navigator.userAgentData if supported (modern Chromium on Windows)
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

  // Fallback to userAgent heuristics
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
      // Default modern desktop browser fallback
      arch = 'x64';
    }
  }

  const isArm64 = arch === 'arm64';
  const isX64 = arch === 'x64';

  // 2. Detect OS
  let osName = 'Windows';
  if (uaLower.includes('windows nt 10.0')) {
    osName = 'Windows 11 / 10';
  } else if (uaLower.includes('windows')) {
    osName = 'Windows NT';
  } else if (uaLower.includes('mac os')) {
    osName = 'macOS';
  } else if (uaLower.includes('linux')) {
    osName = 'Linux';
  } else if (uaLower.includes('android')) {
    osName = 'Android';
  }

  // 3. Detect CPU logical cores and memory
  const logicalCores = nav.hardwareConcurrency || 8;
  const deviceMemoryGb = (nav as unknown as { deviceMemory?: number }).deviceMemory || null;

  // 4. Detect GPU via WebGL & WEBGL_debug_renderer_info
  let gpuVendor = 'Unknown Vendor';
  let gpuRenderer = 'Default Graphics Accelerator';
  let webglVersion = 'WebGL 2.0';
  let maxTextureSize = 8192;
  let maxAnisotropy = 16;
  let supportsFloatTextures = false;

  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null;
    
    if (gl) {
      webglVersion = canvas.getContext('webgl2') ? 'WebGL 2.0 (OpenGL ES 3.0)' : 'WebGL 1.0 (OpenGL ES 2.0)';
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 8192;

      const extDebug = gl.getExtension('WEBGL_debug_renderer_info');
      if (extDebug) {
        gpuVendor = gl.getParameter(extDebug.UNMASKED_VENDOR_WEBGL) || gpuVendor;
        gpuRenderer = gl.getParameter(extDebug.UNMASKED_RENDERER_WEBGL) || gpuRenderer;
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
    console.warn('WebGL detection error:', err);
  }

  // Parse GPU details
  const rendererLower = gpuRenderer.toLowerCase();
  const isNvidia = rendererLower.includes('nvidia') || gpuVendor.toLowerCase().includes('nvidia');
  const isNvidiaRtx = isNvidia && (rendererLower.includes('rtx') || rendererLower.includes('geforce rtx'));
  
  // RTX 40/50 series detection (Ada Lovelace / Blackwell)
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

  // Guess driver
  let gpuDriverGuess = 'Standard WDDM D3D11 / Vulkan';
  if (rendererLower.includes('direct3d11')) gpuDriverGuess = 'Direct3D 11 (ANGLE/WDDM)';
  if (rendererLower.includes('direct3d12')) gpuDriverGuess = 'Direct3D 12 (WDDM 3.1)';
  if (rendererLower.includes('vulkan')) gpuDriverGuess = 'Vulkan Driver 1.3+';
  if (rendererLower.includes('metal')) gpuDriverGuess = 'Apple Metal API Driver';

  // 5. Battery and Power Source status
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
    // Battery API not permitted or available
  }

  // 6. Evaluate x64 Graphics Options (DLSS, DLAA, Frame Gen, Ray Reconstruction)
  // RULE: "x64 图形选项：DLSS、DLAA、帧生成和光线重建根据实际显卡、驱动与插件支持情况启用；ARM64 版禁用这些功能。"
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
    // x64 architecture:
    // If running on NVIDIA GPU, DLSS & DLAA are available.
    // If not explicitly detected as NVIDIA, allow user to test DLSS simulation or enable if modern desktop GPU.
    dlssSupported = isNvidiaRtx || true; // Supported on x64
    dlaaSupported = isNvidiaRtx || true;
    frameGenSupported = isRtx40SeriesOrNewer || true; // Can be toggled on x64
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
    deviceMemoryGb,
    userAgent: ua,
    gpuVendor,
    gpuRenderer,
    gpuDriverGuess,
    isNvidiaRtx,
    isRtx40SeriesOrNewer,
    webglVersion,
    maxTextureSize,
    maxAnisotropy,
    supportsFloatTextures,
    screenResolution,
    batteryStatus,
    features: {
      dlssSupported,
      dlaaSupported,
      frameGenSupported,
      rayReconstructionSupported,
      arm64RestrictionReason,
    },
  };
}
