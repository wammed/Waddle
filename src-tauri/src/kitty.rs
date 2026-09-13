use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KittyFileData {
    pub data: String, // Base64 encoded payload
    pub mime: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

/// Expands leading `~` or `$HOME` to the user's home directory.
fn expand_path(p: &str) -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    if p == "~" {
        return home;
    }
    if let Some(stripped) = p.strip_prefix("~/") {
        return home.join(stripped);
    }
    if let Some(stripped) = p.strip_prefix("$HOME/") {
        return home.join(stripped);
    }
    if p == "$HOME" {
        return home;
    }
    PathBuf::from(p)
}

/// Validates whether a directory is a dangerous system root directory.
fn is_dangerous_dir(path: &Path) -> bool {
    let s = path.to_string_lossy();
    let normalized = s.trim_end_matches('/');

    if normalized.is_empty()
        || normalized == "/"
        || normalized == "/etc"
        || normalized == "/usr"
        || normalized == "/bin"
        || normalized == "/sbin"
        || normalized == "/lib"
        || normalized == "/lib64"
        || normalized == "/dev"
        || normalized == "/proc"
        || normalized == "/sys"
        || normalized == "/var"
        || normalized == "/root"
        || normalized == "/boot"
    {
        return true;
    }

    if normalized.ends_with("/.ssh")
        || normalized.ends_with("/.gnupg")
        || normalized.contains("/.ssh/")
        || normalized.contains("/.gnupg/")
    {
        return true;
    }

    false
}

/// Validates whether a file or directory path is located in a sensitive system directory.
fn is_dangerous_path(path: &Path) -> bool {
    let s = path.to_string_lossy();
    let normalized = s.trim_end_matches('/');

    if normalized.is_empty()
        || normalized == "/"
        || normalized == "/etc"
        || normalized.starts_with("/etc/")
        || normalized == "/usr"
        || normalized.starts_with("/usr/")
        || normalized == "/bin"
        || normalized.starts_with("/bin/")
        || normalized == "/sbin"
        || normalized.starts_with("/sbin/")
        || normalized == "/lib"
        || normalized.starts_with("/lib/")
        || normalized == "/lib64"
        || normalized.starts_with("/lib64/")
        || normalized == "/dev"
        || (normalized.starts_with("/dev/") && !normalized.starts_with("/dev/shm/") && normalized != "/dev/shm")
        || normalized == "/proc"
        || normalized.starts_with("/proc/")
        || normalized == "/sys"
        || normalized.starts_with("/sys/")
        || normalized == "/root"
        || normalized.starts_with("/root/")
        || normalized == "/boot"
        || normalized.starts_with("/boot/")
    {
        return true;
    }

    if normalized.ends_with("/.ssh")
        || normalized.ends_with("/.gnupg")
        || normalized.contains("/.ssh/")
        || normalized.contains("/.gnupg/")
    {
        return true;
    }

    false
}

/// Checks whether a canonical path is located inside a system temporary directory.
fn is_in_temp_dir(path: &Path) -> bool {
    let mut temp_roots = Vec::new();
    if let Ok(sys_temp) = fs::canonicalize(std::env::temp_dir()) {
        temp_roots.push(sys_temp);
    }
    if let Ok(tmp) = fs::canonicalize("/tmp") {
        temp_roots.push(tmp);
    }
    if let Ok(var_tmp) = fs::canonicalize("/var/tmp") {
        temp_roots.push(var_tmp);
    }
    if let Ok(dev_shm) = fs::canonicalize("/dev/shm") {
        temp_roots.push(dev_shm);
    }
    if let Ok(run_shm) = fs::canonicalize("/run/shm") {
        temp_roots.push(run_shm);
    }
    temp_roots.iter().any(|root| path.starts_with(root))
}

/// Inspects image header to detect MIME type and extract image dimensions.
/// Prevents decompression bombs before images are passed to frontend.
fn inspect_image_dimensions(data: &[u8]) -> Result<(String, Option<u32>, Option<u32>), String> {
    if data.is_empty() {
        return Err("ENOENT: Image data is empty".to_string());
    }

    // 1. PNG check: magic bytes 89 50 4E 47 0D 0A 1A 0A
    if data.starts_with(b"\x89PNG\r\n\x1a\n") {
        if data.len() >= 24 && &data[12..16] == b"IHDR" {
            let width = u32::from_be_bytes([data[16], data[17], data[18], data[19]]);
            let height = u32::from_be_bytes([data[20], data[21], data[22], data[23]]);
            return Ok(("image/png".to_string(), Some(width), Some(height)));
        }
        return Ok(("image/png".to_string(), None, None));
    }

    // 2. JPEG check: magic bytes FF D8 FF
    if data.starts_with(b"\xFF\xD8\xFF") {
        let mut idx = 2;
        let len = data.len();
        while idx + 8 < len {
            if data[idx] != 0xFF {
                idx += 1;
                continue;
            }
            let marker = data[idx + 1];
            // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
            if marker == 0xC0 || marker == 0xC1 || marker == 0xC2 {
                let height = u16::from_be_bytes([data[idx + 5], data[idx + 6]]) as u32;
                let width = u16::from_be_bytes([data[idx + 7], data[idx + 8]]) as u32;
                return Ok(("image/jpeg".to_string(), Some(width), Some(height)));
            }
            // Skip marker segment
            let seg_len = u16::from_be_bytes([data[idx + 2], data[idx + 3]]) as usize;
            if seg_len == 0 {
                break;
            }
            idx += 2 + seg_len;
        }
        return Ok(("image/jpeg".to_string(), None, None));
    }

    // 3. GIF check: GIF87a or GIF89a
    if data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a") {
        if data.len() >= 10 {
            let width = u16::from_le_bytes([data[6], data[7]]) as u32;
            let height = u16::from_le_bytes([data[8], data[9]]) as u32;
            return Ok(("image/gif".to_string(), Some(width), Some(height)));
        }
        return Ok(("image/gif".to_string(), None, None));
    }

    // 4. WebP check: RIFF .... WEBP
    if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        return Ok(("image/webp".to_string(), None, None));
    }

    // 5. SVG check
    if data.starts_with(b"<svg")
        || (data.starts_with(b"<?xml") && String::from_utf8_lossy(&data[..data.len().min(512)]).contains("<svg"))
    {
        return Ok(("image/svg+xml".to_string(), None, None));
    }

    // Fallback binary
    Ok(("application/octet-stream".to_string(), None, None))
}

/// Reads an image file with strict directory sandboxing and decompression bomb validation.
/// If `is_temp` is true (Kitty `t=t`), allows system temp directories and immediately unlinks the file after reading.
pub fn read_kitty_file(
    path: &str,
    allowed_dir: Option<&str>,
    max_bytes: usize,
    max_dimension: u32,
    is_temp: bool,
) -> Result<KittyFileData, String> {
    // 1. Resolve and validate allowed directory
    let raw_allowed = match allowed_dir {
        Some(d) if !d.trim().is_empty() => expand_path(d.trim()),
        _ => dirs::picture_dir()
            .or_else(|| dirs::home_dir().map(|h| h.join("Pictures")))
            .unwrap_or_else(|| PathBuf::from("/tmp")),
    };

    let canonical_allowed = fs::canonicalize(&raw_allowed)
        .map_err(|e| format!("ENOENT: Allowed directory does not exist or cannot be resolved: {}", e))?;

    if is_dangerous_dir(&canonical_allowed) {
        return Err("EACCES: Target directory is restricted by security policy".to_string());
    }

    // 2. Resolve target path relative to allowed directory or system temp directory
    let raw_target = expand_path(path.trim());
    let target_to_check = if raw_target.is_relative() {
        if is_temp {
            let in_temp = std::env::temp_dir().join(&raw_target);
            if in_temp.exists() {
                in_temp
            } else {
                canonical_allowed.join(&raw_target)
            }
        } else {
            canonical_allowed.join(raw_target)
        }
    } else {
        raw_target
    };

    // 3. Canonicalize target path (resolves all `..` traversal and symlinks)
    let canonical_target = fs::canonicalize(&target_to_check)
        .map_err(|e| format!("ENOENT: Cannot resolve file path: {}", e))?;

    // 4. Strict dangerous system path check
    if is_dangerous_path(&canonical_target) {
        return Err("EACCES: Target path is restricted by security policy".to_string());
    }

    // 5. Sandbox enforcement:
    // If temporary file (is_temp = true): must be in system temp directory or allowed directory.
    // If standard file: must be in allowed directory.
    let in_allowed = canonical_target.starts_with(&canonical_allowed);
    let in_temp = is_temp && is_in_temp_dir(&canonical_target);

    if !in_allowed && !in_temp {
        return Err("EACCES: Path traversal or symlink escape detected. File is outside the allowed directory.".to_string());
    }

    // 6. Must be a regular file
    if !canonical_target.is_file() {
        return Err("ENOENT: Path is not a regular file".to_string());
    }

    // 7. Check file size against max_bytes
    let metadata = fs::metadata(&canonical_target)
        .map_err(|e| format!("ENOENT: Failed to read file metadata: {}", e))?;

    if metadata.len() as usize > max_bytes {
        if is_temp {
            let _ = fs::remove_file(&canonical_target);
        }
        return Err(format!(
            "EFBIG: File size ({} bytes) exceeds maximum allowed payload limit ({} bytes)",
            metadata.len(),
            max_bytes
        ));
    }

    // 8. Read file contents into memory
    let bytes = fs::read(&canonical_target)
        .map_err(|e| format!("EIO: Failed to read file: {}", e))?;

    // 9. If temporary file (t=t), automatically delete it immediately after reading to avoid disk leaks
    if is_temp {
        fs::remove_file(&canonical_target)
            .map_err(|e| format!("EIO: Failed to remove temporary file: {}", e))?;
    }

    // 10. Inspect dimensions to prevent decompression bombs
    let (mime, width, height) = inspect_image_dimensions(&bytes)?;

    if let (Some(w), Some(h)) = (width, height) {
        if w > max_dimension || h > max_dimension {
            return Err(format!(
                "EBADMSG: Image dimensions ({}x{} px) exceed maximum permitted limit ({} px)",
                w, h, max_dimension
            ));
        }
    }

    // 11. Return Base64 payload with metadata
    let base64_payload = BASE64_STANDARD.encode(&bytes);

    Ok(KittyFileData {
        data: base64_payload,
        mime,
        width,
        height,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    fn create_test_dir(name: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!("waddle_test_{}", name));
        let _ = fs::remove_dir_all(&path);
        fs::create_dir_all(&path).unwrap();
        fs::canonicalize(&path).unwrap()
    }

    fn create_dummy_png(path: &Path, width: u32, height: u32) {
        let mut f = File::create(path).unwrap();
        // PNG Header
        f.write_all(b"\x89PNG\r\n\x1a\n").unwrap();
        // IHDR chunk: 4 bytes len (13), 4 bytes "IHDR", 13 bytes data, 4 bytes CRC
        f.write_all(&13u32.to_be_bytes()).unwrap();
        f.write_all(b"IHDR").unwrap();
        f.write_all(&width.to_be_bytes()).unwrap();
        f.write_all(&height.to_be_bytes()).unwrap();
        f.write_all(&[8, 6, 0, 0, 0]).unwrap(); // 8bit RGBA
        f.write_all(&[0, 0, 0, 0]).unwrap(); // dummy CRC
    }

    #[test]
    fn test_valid_file_in_sandbox() {
        let dir = create_test_dir("valid_sandbox");
        let file_path = dir.join("test.png");
        create_dummy_png(&file_path, 100, 100);

        let res = read_kitty_file(
            file_path.to_str().unwrap(),
            Some(dir.to_str().unwrap()),
            1024 * 1024,
            4096,
            false,
        );
        assert!(res.is_ok(), "Expected valid file read to succeed: {:?}", res);
        let data = res.unwrap();
        assert_eq!(data.mime, "image/png");
        assert_eq!(data.width, Some(100));
        assert_eq!(data.height, Some(100));
        assert!(!data.data.is_empty());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_reject_path_traversal() {
        let sandbox = create_test_dir("sandbox_traversal");
        let outside = create_test_dir("outside_traversal");
        let outside_file = outside.join("secret.png");
        create_dummy_png(&outside_file, 50, 50);

        // Try accessing via relative `../` traversal
        let traversal_path = format!("{}/../{}/secret.png", sandbox.to_str().unwrap(), outside.file_name().unwrap().to_str().unwrap());

        let res = read_kitty_file(
            &traversal_path,
            Some(sandbox.to_str().unwrap()),
            1024 * 1024,
            4096,
            false,
        );
        assert!(res.is_err());
        let err = res.unwrap_err();
        assert!(err.contains("EACCES"), "Error should be EACCES: {}", err);

        let _ = fs::remove_dir_all(&sandbox);
        let _ = fs::remove_dir_all(&outside);
    }

    #[test]
    fn test_reject_symlink_escape() {
        let sandbox = create_test_dir("sandbox_symlink");
        let outside = create_test_dir("outside_symlink");
        let outside_file = outside.join("secret.png");
        create_dummy_png(&outside_file, 50, 50);

        // Create symlink inside sandbox pointing to outside file
        let symlink_path = sandbox.join("symlink_to_outside.png");
        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let _ = symlink(&outside_file, &symlink_path);
            if symlink_path.exists() {
                let res = read_kitty_file(
                    symlink_path.to_str().unwrap(),
                    Some(sandbox.to_str().unwrap()),
                    1024 * 1024,
                    4096,
                    false,
                );
                assert!(res.is_err(), "Symlink escape outside sandbox must be rejected!");
                let err = res.unwrap_err();
                assert!(err.contains("EACCES"), "Expected EACCES error: {}", err);
            }
        }

        let _ = fs::remove_dir_all(&sandbox);
        let _ = fs::remove_dir_all(&outside);
    }

    #[test]
    fn test_reject_dangerous_allowed_dir() {
        let res = read_kitty_file("/etc/passwd", Some("/etc"), 1024 * 1024, 4096, false);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("EACCES"));
    }

    #[test]
    fn test_reject_oversized_file() {
        let dir = create_test_dir("oversized");
        let file_path = dir.join("big.png");
        create_dummy_png(&file_path, 10, 10);

        // max_bytes = 10 bytes, file is ~33 bytes
        let res = read_kitty_file(
            file_path.to_str().unwrap(),
            Some(dir.to_str().unwrap()),
            10,
            4096,
            false,
        );
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("EFBIG"));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_reject_decompression_bomb_dimensions() {
        let dir = create_test_dir("bomb");
        let file_path = dir.join("bomb.png");
        // 5000 x 5000 exceeds max_dimension 4096
        create_dummy_png(&file_path, 5000, 5000);

        let res = read_kitty_file(
            file_path.to_str().unwrap(),
            Some(dir.to_str().unwrap()),
            1024 * 1024,
            4096,
            false,
        );
        assert!(res.is_err());
        let err = res.unwrap_err();
        assert!(err.contains("EBADMSG"), "Expected EBADMSG error: {}", err);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_temp_file_auto_deletion() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join(format!("waddle_test_temp_autodel_{}.png", std::process::id()));
        create_dummy_png(&file_path, 80, 80);
        assert!(file_path.exists(), "Temp test file should exist before read");

        let res = read_kitty_file(
            file_path.to_str().unwrap(),
            None,
            1024 * 1024,
            4096,
            true, // is_temp
        );
        assert!(res.is_ok(), "Expected temp file read to succeed: {:?}", res);
        let data = res.unwrap();
        assert_eq!(data.width, Some(80));
        assert_eq!(data.height, Some(80));

        // CRITICAL: File must be deleted immediately after reading!
        assert!(!file_path.exists(), "Temp file MUST be deleted after reading!");
    }

    #[test]
    fn test_temp_file_sandbox_rejection() {
        // Attempting to read a sensitive system file even with is_temp=true must be rejected
        let res = read_kitty_file("/etc/passwd", None, 1024 * 1024, 4096, true);
        assert!(res.is_err());
        let err = res.unwrap_err();
        assert!(err.contains("EACCES"), "Expected EACCES error: {}", err);
    }

    #[test]
    fn test_temp_file_deletion_on_invalid_dimensions() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join(format!("waddle_test_temp_bomb_{}.png", std::process::id()));
        create_dummy_png(&file_path, 5000, 5000);
        assert!(file_path.exists(), "Temp bomb file should exist before read");

        let res = read_kitty_file(
            file_path.to_str().unwrap(),
            None,
            1024 * 1024,
            4096,
            true, // is_temp
        );
        assert!(res.is_err(), "Expected decompression bomb check to fail");
        assert!(res.unwrap_err().contains("EBADMSG"));

        // File must still be deleted despite dimension check failure
        assert!(!file_path.exists(), "Temp file MUST be deleted even if validation fails!");
    }

    #[test]
    fn test_temp_file_deletion_on_efbig() {
        let temp_dir = std::env::temp_dir();
        let file_path = temp_dir.join(format!("waddle_test_temp_efbig_{}.png", std::process::id()));
        create_dummy_png(&file_path, 80, 80);
        assert!(file_path.exists(), "Temp file should exist before read");

        // max_bytes = 10, file is ~70 bytes, so EFBIG will trigger
        let res = read_kitty_file(
            file_path.to_str().unwrap(),
            None,
            10,
            4096,
            true, // is_temp
        );
        assert!(res.is_err(), "Expected EFBIG error");
        assert!(res.unwrap_err().contains("EFBIG"));

        // File must be deleted even on EFBIG!
        assert!(!file_path.exists(), "Temp file MUST be deleted even if EFBIG occurs!");
    }

    #[test]
    fn test_temp_file_in_dev_shm_allowed() {
        let dev_shm = PathBuf::from("/dev/shm");
        if dev_shm.exists() && dev_shm.is_dir() {
            let file_path = dev_shm.join(format!("waddle_test_shm_{}.png", std::process::id()));
            create_dummy_png(&file_path, 64, 64);
            assert!(file_path.exists());

            let res = read_kitty_file(
                file_path.to_str().unwrap(),
                None,
                1024 * 1024,
                4096,
                true, // is_temp
            );
            assert!(res.is_ok(), "Temporary files in /dev/shm must be allowed: {:?}", res);
            assert!(!file_path.exists(), "Temporary files in /dev/shm must be unlinked after read!");
        }
    }
}
