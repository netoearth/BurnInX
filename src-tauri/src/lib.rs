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

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct NativeDiskResult {
    pub seq_write_mb_s: f64,
    pub seq_read_mb_s: f64,
    pub rnd_4k_write_iops: f64,
    pub rnd_4k_write_mb_s: f64,
    pub rnd_4k_read_iops: f64,
    pub rnd_4k_read_mb_s: f64,
    pub test_size_mb: u64,
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

#[tauri::command]
fn benchmark_disk_native(size_mb: Option<u64>) -> Result<NativeDiskResult, String> {
    let size = size_mb.unwrap_or(128).clamp(32, 1024);
    let total_bytes = (size * 1024 * 1024) as usize;

    let mut temp_file = std::env::temp_dir();
    temp_file.push(format!(
        "burninx_disk_bench_{}.tmp",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    ));

    use std::io::{Read, Seek, SeekFrom, Write};
    let block_size = 1024 * 1024;
    let block_data = vec![0xAAu8; block_size];
    let num_blocks = total_bytes / block_size;

    let mut file = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(true)
        .open(&temp_file)
        .map_err(|e| e.to_string())?;

    // 1. Sequential Write
    let t0 = std::time::Instant::now();
    for _ in 0..num_blocks {
        file.write_all(&block_data).map_err(|e| e.to_string())?;
    }
    file.flush().map_err(|e| e.to_string())?;
    let seq_write_dur = t0.elapsed().as_secs_f64().max(0.001);
    let seq_write_mb_s = (size as f64) / seq_write_dur;

    // 2. Sequential Read
    file.seek(SeekFrom::Start(0)).map_err(|e| e.to_string())?;
    let mut read_buf = vec![0u8; block_size];
    let t1 = std::time::Instant::now();
    for _ in 0..num_blocks {
        file.read_exact(&mut read_buf).map_err(|e| e.to_string())?;
    }
    let seq_read_dur = t1.elapsed().as_secs_f64().max(0.001);
    let seq_read_mb_s = (size as f64) / seq_read_dur;

    // 3. Random 4K Write
    let chunk_4k = 4096;
    let data_4k = [0x55u8; 4096];
    let max_pos = ((total_bytes - chunk_4k) as u64).max(4096);
    let ops_count = 2000;

    let t2 = std::time::Instant::now();
    for i in 0..ops_count {
        let pos = ((i * 7919) as u64) % max_pos;
        file.seek(SeekFrom::Start(pos)).map_err(|e| e.to_string())?;
        file.write_all(&data_4k).map_err(|e| e.to_string())?;
    }
    file.flush().map_err(|e| e.to_string())?;
    let rnd_w_dur = t2.elapsed().as_secs_f64().max(0.001);
    let rnd_4k_write_iops = (ops_count as f64) / rnd_w_dur;
    let rnd_4k_write_mb_s = (rnd_4k_write_iops * 4096.0) / (1024.0 * 1024.0);

    // 4. Random 4K Read
    let mut buf_4k = [0u8; 4096];
    let t3 = std::time::Instant::now();
    for i in 0..ops_count {
        let pos = ((i * 6271) as u64) % max_pos;
        file.seek(SeekFrom::Start(pos)).map_err(|e| e.to_string())?;
        file.read_exact(&mut buf_4k).map_err(|e| e.to_string())?;
    }
    let rnd_r_dur = t3.elapsed().as_secs_f64().max(0.001);
    let rnd_4k_read_iops = (ops_count as f64) / rnd_r_dur;
    let rnd_4k_read_mb_s = (rnd_4k_read_iops * 4096.0) / (1024.0 * 1024.0);

    drop(file);
    let _ = fs::remove_file(&temp_file);

    Ok(NativeDiskResult {
        seq_write_mb_s,
        seq_read_mb_s,
        rnd_4k_write_iops,
        rnd_4k_write_mb_s,
        rnd_4k_read_iops,
        rnd_4k_read_mb_s,
        test_size_mb: size,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_native_system_info,
            open_report_folder,
            save_report_native,
            benchmark_disk_native
        ])
        .run(tauri::generate_context!())
        .expect("error while running BurnInX Tauri application");
}
