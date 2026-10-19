/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Helper bridge to safely call Tauri v2 APIs when running inside desktop runtime,
// with graceful fallback when running in a standard web browser.

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export interface NativeSysInfo {
  arch: string;
  os: string;
  is_windows: boolean;
  is_arm64: boolean;
  is_x64: boolean;
}

export interface NativeHardwareSpecs {
  cpu_name: string;
  logical_cores: number;
  total_ram_gb: number;
  available_ram_gb: number;
  gpu_name: string;
  os_name: string;
  arch: string;
}

export interface NativeDriveInfo {
  drive_letter: string;
  path: string;
  label: string;
  total_gb: number;
  free_gb: number;
  is_ready: boolean;
}

export interface NativeDiskBenchOutput {
  seq_write_mb_s: number;
  seq_read_mb_s: number;
  rnd_4k_write_iops: number;
  rnd_4k_write_mb_s: number;
  rnd_4k_read_iops: number;
  rnd_4k_read_mb_s: number;
  test_size_mb: number;
  tested_path: string;
}

export async function getNativeSystemInfo(): Promise<NativeSysInfo | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<NativeSysInfo>('get_native_system_info');
  } catch (err) {
    console.warn('Tauri get_native_system_info call failed:', err);
    return null;
  }
}

export async function getNativeHardwareSpecs(): Promise<NativeHardwareSpecs | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<NativeHardwareSpecs>('get_native_hardware_specs');
  } catch (err) {
    console.warn('Tauri get_native_hardware_specs call failed:', err);
    return null;
  }
}

export async function getAvailableDisksNative(): Promise<NativeDriveInfo[]> {
  if (!isTauriEnvironment()) return [];
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<NativeDriveInfo[]>('get_available_disks');
  } catch (err) {
    console.warn('Tauri get_available_disks call failed:', err);
    return [];
  }
}

export async function benchmarkDiskNative(drivePath?: string, sizeMb?: number): Promise<NativeDiskBenchOutput | null> {
  if (!isTauriEnvironment()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<NativeDiskBenchOutput>('benchmark_disk_native', {
      drivePath: drivePath || null,
      sizeMb: sizeMb || 128,
    });
  } catch (err) {
    console.warn('Tauri benchmark_disk_native call failed:', err);
    throw err;
  }
}

export async function openReportFolderNative(): Promise<{ success: boolean; path?: string; message: string }> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const folderPath = await invoke<string>('open_report_folder');
      return {
        success: true,
        path: folderPath,
        message: `已在 Windows 资源管理器中打开报告文件夹: ${folderPath}`,
      };
    } catch (err) {
      return {
        success: false,
        message: `调用原生文件夹打开失败: ${String(err)}`,
      };
    }
  }

  // Web Browser fallback
  return {
    success: true,
    message: '网页预览环境下，报告已保存至浏览器的默认“下载”文件夹。在桌面端原生运行时将直接呼出 Windows 资源管理器。',
  };
}

export async function saveReportNative(filename: string, htmlContent: string): Promise<{ success: boolean; path?: string }> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const savedPath = await invoke<string>('save_report_native', {
        filename,
        htmlContent,
      });
      return { success: true, path: savedPath };
    } catch (err) {
      console.warn('Native save failed, fallback to browser download:', err);
    }
  }

  // Web browser download fallback
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { success: true };
}
