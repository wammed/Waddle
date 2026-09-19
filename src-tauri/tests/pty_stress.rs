use std::fs;
use std::path::Path;
use std::time::Instant;
use waddle_lib::pty::PtyManager;

fn get_open_fd_count() -> usize {
    if let Ok(entries) = fs::read_dir("/proc/self/fd") {
        entries.count()
    } else {
        0
    }
}

fn get_zombie_child_count() -> usize {
    let my_pid = std::process::id();
    let mut zombies = 0;

    if let Ok(proc_entries) = fs::read_dir("/proc") {
        for entry in proc_entries.flatten() {
            let file_name = entry.file_name();
            let name_str = file_name.to_string_lossy();
            if name_str.chars().all(|c| c.is_ascii_digit()) {
                let stat_path = entry.path().join("stat");
                if let Ok(stat_content) = fs::read_to_string(stat_path) {
                    // /proc/[pid]/stat format: pid (comm) state ppid ...
                    // comm can contain spaces and parens, so find the last ')'
                    if let Some(rparen) = stat_content.rfind(')') {
                        let after_paren = &stat_content[rparen + 1..].trim();
                        let parts: Vec<&str> = after_paren.split_whitespace().collect();
                        if parts.len() >= 2 {
                            let state = parts[0];
                            let ppid: u32 = parts[1].parse().unwrap_or(0);
                            if ppid == my_pid && state == "Z" {
                                zombies += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    zombies
}

fn get_rss_kb() -> usize {
    if let Ok(status) = fs::read_to_string("/proc/self/status") {
        for line in status.lines() {
            if line.starts_with("VmRSS:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    return parts[1].parse().unwrap_or(0);
                }
            }
        }
    }
    0
}

#[tokio::test]
async fn test_pty_1000_cycles_stress_and_resource_safety() {
    // Only run if on Linux with /proc available
    if !Path::new("/proc/self/fd").exists() {
        println!("Skipping PTY stress test: /proc/self/fd not available");
        return;
    }

    let pty_manager = PtyManager::default();

    // Warm up one session to initialize allocator and portable-pty internals
    let warmup = pty_manager
        .create_pty_headless(24, 80, None, Some("/bin/sh".to_string()))
        .await
        .expect("Warmup PTY creation failed");
    pty_manager
        .close(&warmup.id)
        .await
        .expect("Warmup PTY close failed");

    // Give kernel a brief moment to finish reaping warmup
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    let initial_fds = get_open_fd_count();
    let initial_rss = get_rss_kb();
    let initial_zombies = get_zombie_child_count();

    println!("=== PTY Native Resource Stress Test (1,000 Cycles) ===");
    println!("Initial FDs: {}", initial_fds);
    println!("Initial RSS: {} KB", initial_rss);
    println!("Initial Zombies: {}", initial_zombies);

    let total_cycles = 1000;
    let start_time = Instant::now();

    for i in 1..=total_cycles {
        let session = pty_manager
            .create_pty_headless(24, 80, None, Some("/bin/sh".to_string()))
            .await
            .unwrap_or_else(|e| panic!("Failed to create PTY at cycle {}: {}", i, e));

        pty_manager
            .close(&session.id)
            .await
            .unwrap_or_else(|e| panic!("Failed to close PTY at cycle {}: {}", i, e));

        if i % 250 == 0 {
            let current_fds = get_open_fd_count();
            let current_rss = get_rss_kb();
            let current_zombies = get_zombie_child_count();
            println!(
                "Cycle {}/{}: FDs={}, RSS={} KB, Zombies={}",
                i, total_cycles, current_fds, current_rss, current_zombies
            );
        }
    }

    let duration = start_time.elapsed();
    println!("1,000 PTY cycles finished in {:.2?} ({:.2} ms/cycle)", duration, duration.as_millis() as f64 / total_cycles as f64);

    // Final checks
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    let final_fds = get_open_fd_count();
    let final_rss = get_rss_kb();
    let final_zombies = get_zombie_child_count();

    println!("=== Final Audit Results ===");
    println!("Final FDs: {} (Delta: {})", final_fds, (final_fds as i64) - (initial_fds as i64));
    println!("Final RSS: {} KB (Delta: {} KB)", final_rss, (final_rss as i64) - (initial_rss as i64));
    println!("Final Zombies: {}", final_zombies);

    // 1. Zero Zombie Processes
    assert_eq!(
        final_zombies, 0,
        "Zombie processes detected! Reaping failed in pty::close"
    );

    // 2. File Descriptor Leak Guard: FD delta must be essentially zero (<= 2 for tokio internals)
    let fd_delta = (final_fds as i64 - initial_fds as i64).abs();
    assert!(
        fd_delta <= 2,
        "File descriptor leak detected! FD delta was {}, expected <= 2 (Initial: {}, Final: {})",
        fd_delta,
        initial_fds,
        final_fds
    );

    // 3. Memory RSS check: Should not bloat by more than 30MB over 1,000 cycles
    let rss_growth_kb = (final_rss as i64) - (initial_rss as i64);
    assert!(
        rss_growth_kb < 30 * 1024,
        "Excessive RSS bloat detected! Grew by {} KB",
        rss_growth_kb
    );

    println!("✅ All 1,000 PTY stress test assertions passed successfully!");
}
