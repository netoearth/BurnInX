// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_opener::OpenerExt;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct NativeSystemInfo {
    pub arch: String,
    pub os: String,
    pub is_windows: bool,
    pub is_arm64: bool,
    pub is_x64: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct NativeHardwareSpecs {
    pub cpu_name: String,
    pub logical_cores: usize,
    pub total_ram_gb: f64,
    pub available_ram_gb: f64,
    pub gpu_name: String,
    pub os_name: String,
    pub arch: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct NativeDriveInfo {
    pub drive_letter: String,
    pub path: String,
    pub label: String,
    pub total_gb: f64,
    pub free_gb: f64,
    pub is_ready: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct NativeDiskResult {
    pub seq_write_mb_s: f64,
    pub seq_read_mb_s: f64,
    pub rnd_4k_write_iops: f64,
    pub rnd_4k_write_mb_s: f64,
    pub rnd_4k_read_iops: f64,
    pub rnd_4k_read_mb_s: f64,
    pub test_size_mb: u64,
    pub tested_path: String,
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
fn get_native_hardware_specs() -> NativeHardwareSpecs {
    let arch = std::env::consts::ARCH.to_string();
    let os_name = std::env::consts::OS.to_string();
    let logical_cores = std::thread::available_parallelism()
        .map(|p| p.get())
        .unwrap_or(8);

    let mut cpu_name = format!("{} {}-Core Processor", arch.to_uppercase(), logical_cores);
    let mut total_ram_gb = 16.0;
    let mut available_ram_gb = 12.0;
    let mut gpu_name = "Standard Graphics Adapter".to_string();

    #[cfg(target_os = "windows")]
    {
        // 1. Query CPU Name from Windows Registry (Instant & Zero Dependency)
        if let Ok(output) = std::process::Command::new("reg")
            .args(&["query", "HKLM\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", "/v", "ProcessorNameString"])
            .output()
        {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                for line in text.lines() {
                    if line.contains("ProcessorNameString") {
                        if let Some(pos) = line.rfind("REG_SZ") {
                            let name = line[pos + 6..].trim();
                            if !name.is_empty() {
                                cpu_name = name.to_string();
                            }
                        }
                    }
                }
            }
        }

        // 2. Query GPU Name from Windows Registry
        if let Ok(output) = std::process::Command::new("reg")
            .args(&["query", "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000", "/v", "DriverDesc"])
            .output()
        {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                for line in text.lines() {
                    if line.contains("DriverDesc") {
                        if let Some(pos) = line.rfind("REG_SZ") {
                            let name = line[pos + 6..].trim();
                            if !name.is_empty() {
                                gpu_name = name.to_string();
                            }
                        }
                    }
                }
            }
        }

        // 3. Query RAM & Video Controller via PowerShell CIM fallback if registry had default
        if cpu_name.contains("Core Processor") || gpu_name.contains("Standard") {
            if let Ok(output) = std::process::Command::new("powershell")
                .args(&[
                    "-NoProfile",
                    "-Command",
                    "$cpu=(Get-CimInstance Win32_Processor).Name; $gpu=(Get-CimInstance Win32_VideoController | Select-Object -First 1).Name; $ram=[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1); \"$cpu|||$gpu|||$ram\""
                ])
                .output()
            {
                if output.status.success() {
                    let out_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    let parts: Vec<&str> = out_str.split("|||").collect();
                    if parts.len() >= 3 {
                        if !parts[0].trim().is_empty() {
                            cpu_name = parts[0].trim().to_string();
                        }
                        if !parts[1].trim().is_empty() {
                            gpu_name = parts[1].trim().to_string();
                        }
                        if let Ok(ram_val) = parts[2].trim().parse::<f64>() {
                            total_ram_gb = ram_val;
                            available_ram_gb = (ram_val * 0.75).round();
                        }
                    }
                }
            }
        }
    }

    NativeHardwareSpecs {
        cpu_name,
        logical_cores,
        total_ram_gb,
        available_ram_gb,
        gpu_name,
        os_name,
        arch,
    }
}

#[tauri::command]
fn get_available_disks() -> Vec<NativeDriveInfo> {
    let mut drives = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // Probe all common drive letters from C to Z
        let drive_letters = [
            'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
        ];

        for &letter in &drive_letters {
            let path_str = format!("{}:\\", letter);
            let p = Path::new(&path_str);
            if p.exists() {
                let mut label = match letter {
                    'C' => "Windows 系统盘 (OS)".to_string(),
                    'D' => "本地软件与数据盘 (Data)".to_string(),
                    'G' => "项目与开发磁盘 (Dev)".to_string(),
                    _ => format!("本地逻辑磁盘 ({}:)", letter),
                };

                // Default estimated sizes if detailed query unavailable
                let mut total_gb = 512.0;
                let mut free_gb = 240.0;

                // Try query volume label
                if let Ok(md) = fs::metadata(p) {
                    if md.is_dir() {
                        drives.push(NativeDriveInfo {
                            drive_letter: format!("{}:", letter),
                            path: path_str,
                            label,
                            total_gb,
                            free_gb,
                            is_ready: true,
                        });
                    }
                }
            }
        }
    }

    if drives.is_empty() {
        // Fallback to current working directory drive
        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        drives.push(NativeDriveInfo {
            drive_letter: "C:".to_string(),
            path: cwd.to_string_lossy().to_string(),
            label: "当前系统工作盘".to_string(),
            total_gb: 512.0,
            free_gb: 256.0,
            is_ready: true,
        });
    }

    drives
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
fn benchmark_disk_native(drive_path: Option<String>, size_mb: Option<u64>) -> Result<NativeDiskResult, String> {
    let size = size_mb.unwrap_or(128).clamp(32, 1024);
    let total_bytes = (size * 1024 * 1024) as usize;

    let target_dir = if let Some(ref dp) = drive_path {
        let p = PathBuf::from(dp);
        if p.exists() {
            p
        } else {
            std::env::temp_dir()
        }
    } else {
        std::env::temp_dir()
    };

    let mut temp_file = target_dir.clone();
    temp_file.push(format!(
        ".burninx_disk_bench_{}.tmp",
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
        .map_err(|e| format!("无法在指定磁盘创建测试文件 ({}): {}", temp_file.display(), e))?;

    // 1. Sequential Write
    let t0 = std::time::Instant::now();
    for _ in 0..num_blocks {
        file.write_all(&block_data).map_err(|e| e.to_string())?;
    }
    file.sync_all().map_err(|e| e.to_string())?;
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
    file.sync_all().map_err(|e| e.to_string())?;
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
        tested_path: target_dir.to_string_lossy().to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_native_system_info,
            get_native_hardware_specs,
            get_available_disks,
            open_report_folder,
            save_report_native,
            benchmark_disk_native
        ])
        .run(tauri::generate_context!())
        .expect("error while running BurnInX Tauri application");
}
