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
