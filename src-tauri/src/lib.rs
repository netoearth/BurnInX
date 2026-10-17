// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::fs;
use std::path::PathBuf;
use tauri_plugin_opener::OpenerExt;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct NativeSystemInfo {
    pub arch: String,
    pub os: String,
    pub is_windows: bool,
    pub is_arm64: bool,
    pub is_x64: bool,
}

fn get_reports_dir() -> PathBuf {
    let mut path = dirs_fallback();
    path.push("BurnInX_Reports");
    if !path.exists() {
        let _ = fs::create_dir_all(&path);
    }
    path
}

fn dirs_fallback() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let mut p = PathBuf::from(profile);
            p.push("Documents");
            return p;
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

#[tauri::command]
fn get_native_system_info() -> NativeSystemInfo {
    let arch = std::env::consts::ARCH.to_string();
    let os = std::env::consts::OS.to_string();
    let is_arm64 = arch == "aarch64" || arch == "arm";
    let is_x64 = arch == "x86_64";
    let is_windows = os == "windows";

    NativeSystemInfo {
        arch,
        os,
        is_windows,
        is_arm64,
        is_x64,
    }
}

#[tauri::command]
fn open_report_folder(app_handle: tauri::AppHandle) -> Result<String, String> {
    let folder = get_reports_dir();
    let path_str = folder.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg(&path_str)
            .spawn();
        return Ok(path_str);
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = app_handle.opener().open_path(&path_str, None::<&str>);
        Ok(path_str)
    }
}

#[tauri::command]
fn save_report_native(filename: String, html_content: String) -> Result<String, String> {
    let mut file_path = get_reports_dir();
    file_path.push(&filename);

    fs::write(&file_path, html_content).map_err(|e| e.to_string())?;
    Ok(file_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_native_system_info,
            open_report_folder,
            save_report_native
        ])
        .run(tauri::generate_context!())
        .expect("error while running BurnInX Tauri application");
}
