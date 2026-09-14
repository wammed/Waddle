use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AiConfig {
    pub provider: String, // "ollama"
    pub ollama_endpoint: String,
    pub ollama_model: String,
    pub temperature: f32,
    pub custom_system_prompt: Option<String>,
    #[serde(default = "default_true")]
    pub enable_project_rules: bool,
}

fn default_true() -> bool {
    true
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            provider: "ollama".to_string(),
            ollama_endpoint: "http://localhost:11434".to_string(),
            ollama_model: "llama3.2".to_string(),
            temperature: 0.2,
            custom_system_prompt: None,
            enable_project_rules: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalConfig {
    pub font_family: String,
    pub font_size: u32,
    pub theme: String, // "tokyo_night" | "catppuccin_mocha" | "dracula" | "waddle_dark"
    pub cursor_style: String, // "block" | "underline" | "bar"
    pub cursor_blink: bool,
    pub opacity: f32,
    pub shell: Option<String>,
    pub scrollback: u32,
    #[serde(default = "default_background_image")]
    pub background_image: Option<String>,
    #[serde(default = "default_bg_opacity")]
    pub background_opacity: f32,
    #[serde(default)]
    pub background_blur: u32,
    #[serde(default = "default_true")]
    pub mask_secrets: bool,
    #[serde(default = "default_true")]
    pub watchdog_auto_analyze: bool,
}

fn default_background_image() -> Option<String> {
    Some("preset_cyberpunk".to_string())
}

fn default_bg_opacity() -> f32 {
    0.85
}

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            font_family: "JetBrainsMono Nerd Font, JetBrains Mono, monospace".to_string(),
            font_size: 14,
            theme: "waddle_dark".to_string(),
            cursor_style: "block".to_string(),
            cursor_blink: true,
            opacity: 0.95,
            shell: None,
            scrollback: 10000,
            background_image: default_background_image(),
            background_opacity: 0.85,
            background_blur: 0,
            mask_secrets: true,
            watchdog_auto_analyze: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GeneralConfig {
    #[serde(default = "default_language")]
    pub language: String,
}

fn default_language() -> String {
    "en-US".to_string()
}

impl Default for GeneralConfig {
    fn default() -> Self {
        Self {
            language: default_language(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GitIntegrationConfig {
    #[serde(default = "default_git_enabled")]
    pub enabled: bool,
    #[serde(default = "default_restrict_to_github")]
    pub restrict_to_github: bool,
}

fn default_git_enabled() -> bool {
    true
}

fn default_restrict_to_github() -> bool {
    true
}

impl Default for GitIntegrationConfig {
    fn default() -> Self {
        Self {
            enabled: default_git_enabled(),
            restrict_to_github: default_restrict_to_github(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KittyGraphicsConfig {
    #[serde(default = "default_kitty_enabled")]
    pub enabled: bool,
    #[serde(default = "default_kitty_max_dimension")]
    pub max_dimension: u32,
    #[serde(default = "default_kitty_max_payload_mb")]
    pub max_payload_mb: u32,
    #[serde(default = "default_kitty_cache_limit_mb")]
    pub cache_limit_mb: u32,
    #[serde(default = "default_kitty_allowed_dir")]
    pub allowed_dir: String,
}

fn default_kitty_enabled() -> bool {
    true
}

fn default_kitty_max_dimension() -> u32 {
    4096
}

fn default_kitty_max_payload_mb() -> u32 {
    16
}

fn default_kitty_cache_limit_mb() -> u32 {
    256
}

fn default_kitty_allowed_dir() -> String {
    "$HOME/Pictures".to_string()
}

impl Default for KittyGraphicsConfig {
    fn default() -> Self {
        Self {
            enabled: default_kitty_enabled(),
            max_dimension: default_kitty_max_dimension(),
            max_payload_mb: default_kitty_max_payload_mb(),
            cache_limit_mb: default_kitty_cache_limit_mb(),
            allowed_dir: default_kitty_allowed_dir(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    pub ai: AiConfig,
    pub terminal: TerminalConfig,
    #[serde(default)]
    pub git: GitIntegrationConfig,
    #[serde(default)]
    pub kitty_graphics: KittyGraphicsConfig,
}

pub struct ConfigManager {
    config_path: PathBuf,
    config_dir: PathBuf,
}

fn validate_image_data_and_filename(file_name: &str, data: &[u8]) -> Result<String, String> {
    if data.is_empty() {
        return Err("EINVAL: 画像データが空です。 (Image data is empty)".to_string());
    }

    // 1. Validate magic bytes for supported image formats
    let detected_ext = if data.starts_with(b"\x89PNG\r\n\x1a\n") {
        "png"
    } else if data.starts_with(b"\xFF\xD8\xFF") {
        "jpg"
    } else if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        "webp"
    } else if data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a") {
        "gif"
    } else if data.starts_with(b"BM") {
        "bmp"
    } else if data.starts_with(b"<svg")
        || (data.starts_with(b"<?xml") && String::from_utf8_lossy(&data[..data.len().min(512)]).contains("<svg"))
    {
        "svg"
    } else {
        return Err("EINVAL: 許可されていないファイル形式です。PNG, JPEG, WebP, GIF, BMP, SVG 画像のみ対応しています。 (Unsupported image format: must be PNG, JPEG, WebP, GIF, BMP, or SVG)".to_string());
    };

    // 2. Prevent path traversal by taking only the file name
    let clean_name = Path::new(file_name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("wallpaper.png");

    let allowed_extensions = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"];
    let ext = Path::new(clean_name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    let final_name = match ext {
        Some(ref e) if allowed_extensions.contains(&e.as_str()) => clean_name.to_string(),
        _ => {
            let stem = Path::new(clean_name)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("wallpaper");
            format!("{}.{}", stem, detected_ext)
        }
    };

    Ok(final_name)
}

impl ConfigManager {
    pub fn new() -> Self {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("waddle");
        let _ = fs::create_dir_all(&config_dir);
        crate::ai::ensure_global_rules(&config_dir);
        Self {
            config_path: config_dir.join("config.json"),
            config_dir,
        }
    }

    pub fn save_wallpaper_data(&self, file_name: &str, data: &[u8]) -> Result<String, String> {
        let safe_name = validate_image_data_and_filename(file_name, data)?;
        let wallpapers_dir = self.config_dir.join("wallpapers");
        let _ = fs::create_dir_all(&wallpapers_dir);

        let file_path = wallpapers_dir.join(safe_name);

        fs::write(&file_path, data)
            .map_err(|e| format!("Failed to save wallpaper image: {}", e))?;

        Ok(file_path.to_string_lossy().to_string())
    }

    pub fn migrate_base64_wallpaper(&self, cfg: &mut AppConfig) -> bool {
        if let Some(ref bg) = cfg.terminal.background_image {
            if bg.starts_with("data:image/") {
                if let Some(comma_pos) = bg.find(',') {
                    let header = &bg[..comma_pos];
                    let base64_str = &bg[comma_pos + 1..];
                    let ext = if header.contains("image/jpeg") || header.contains("image/jpg") {
                        "jpg"
                    } else if header.contains("image/webp") {
                        "webp"
                    } else if header.contains("image/gif") {
                        "gif"
                    } else {
                        "png"
                    };

                    if let Ok(decoded_bytes) = BASE64_STANDARD.decode(base64_str.trim()) {
                        let file_name = format!("migrated_wallpaper.{}", ext);
                        if let Ok(saved_path) = self.save_wallpaper_data(&file_name, &decoded_bytes) {
                            cfg.terminal.background_image = Some(saved_path);
                            return true;
                        }
                    }
                }
            }
        }
        false
    }

    pub fn load(&self) -> AppConfig {
        if self.config_path.exists() {
            if let Ok(content) = fs::read_to_string(&self.config_path) {
                if let Ok(mut cfg) = serde_json::from_str::<AppConfig>(&content) {
                    if self.migrate_base64_wallpaper(&mut cfg) {
                        let _ = self.save_internal(&cfg);
                    }
                    return cfg;
                }
            }
        }
        let default_cfg = AppConfig::default();
        let _ = self.save(&default_cfg);
        default_cfg
    }

    fn save_internal(&self, config: &AppConfig) -> Result<(), String> {
        let json = serde_json::to_string_pretty(config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&self.config_path, json)
            .map_err(|e| format!("Failed to write config file: {}", e))?;
        Ok(())
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let mut cfg = config.clone();
        if let Some(ref bg) = cfg.terminal.background_image {
            validate_wallpaper_file_path(bg)?;
        }
        self.migrate_base64_wallpaper(&mut cfg);
        self.save_internal(&cfg)
    }
}

pub fn validate_wallpaper_file_path(path_str: &str) -> Result<(), String> {
    let trimmed = path_str.trim();
    if trimmed.is_empty() || trimmed == "none" || trimmed == "preset_cyberpunk" || trimmed == "preset_official" {
        return Ok(());
    }
    let expanded = if let Some(rest) = trimmed.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            home.join(rest)
        } else {
            PathBuf::from(trimmed)
        }
    } else if let Some(rest) = trimmed.strip_prefix("$HOME/") {
        if let Some(home) = dirs::home_dir() {
            home.join(rest)
        } else {
            PathBuf::from(trimmed)
        }
    } else {
        PathBuf::from(trimmed)
    };

    if !expanded.is_file() {
        return Err(format!("ENOENT: 指定された壁紙ファイルが存在しません: {} (Wallpaper file does not exist)", trimmed));
    }

    use std::io::Read;
    let mut file = fs::File::open(&expanded)
        .map_err(|e| format!("EACCES: 壁紙ファイルを開けませんでした: {} (Failed to open wallpaper file)", e))?;
    let mut buffer = [0u8; 512];
    let bytes_read = file.read(&mut buffer)
        .map_err(|e| format!("EIO: 壁紙ファイルの読み込みに失敗しました: {} (Failed to read wallpaper file)", e))?;
    if bytes_read == 0 {
        return Err("EINVAL: 壁紙ファイルが空です。 (Wallpaper file is empty)".to_string());
    }

    validate_image_data_and_filename(
        expanded.file_name().and_then(|n| n.to_str()).unwrap_or("wallpaper.png"),
        &buffer[..bytes_read],
    ).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_base64_wallpaper_migration() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_test_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        let manager = ConfigManager {
            config_path: temp_dir.join("config.json"),
            config_dir: temp_dir.clone(),
        };

        let dummy_png_bytes = b"\x89PNG\r\n\x1a\nfake-png-image-binary-data";
        let encoded = BASE64_STANDARD.encode(dummy_png_bytes);
        let mut cfg = AppConfig::default();
        cfg.terminal.background_image = Some(format!("data:image/png;base64,{}", encoded));

        let migrated = manager.migrate_base64_wallpaper(&mut cfg);
        assert!(migrated);

        let new_bg = cfg.terminal.background_image.clone().unwrap();
        assert!(new_bg.ends_with("migrated_wallpaper.png"));
        assert!(Path::new(&new_bg).exists());

        let read_data = fs::read(&new_bg).unwrap();
        assert_eq!(read_data, dummy_png_bytes);

        // Save and verify config file does not contain base64
        manager.save(&cfg).unwrap();
        let saved_json = fs::read_to_string(&manager.config_path).unwrap();
        assert!(!saved_json.contains("data:image/png;base64"));
        assert!(saved_json.contains("migrated_wallpaper.png"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_save_wallpaper_validation() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_wp_test_{}", uuid::Uuid::new_v4()));
        let manager = ConfigManager {
            config_path: temp_dir.join("config.json"),
            config_dir: temp_dir.clone(),
        };

        // 1. Valid PNG
        let valid_png = b"\x89PNG\r\n\x1a\nvalid_png_content";
        assert!(manager.save_wallpaper_data("custom.png", valid_png).is_ok());

        // 2. Valid JPEG
        let valid_jpg = b"\xFF\xD8\xFFvalid_jpg_content";
        assert!(manager.save_wallpaper_data("photo.jpg", valid_jpg).is_ok());

        // 3. Invalid script or binary must be rejected
        let evil_script = b"#!/bin/bash\nrm -rf /";
        assert!(manager.save_wallpaper_data("script.sh", evil_script).is_err());

        let evil_png_named_script = b"#!/bin/bash\necho pwned";
        assert!(manager.save_wallpaper_data("fake.png", evil_png_named_script).is_err());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_general_config_default() {
        let json_without_general = r#"{
            "ai": {
                "provider": "ollama",
                "ollama_endpoint": "http://localhost:11434",
                "ollama_model": "llama3.2",
                "temperature": 0.2
            },
            "terminal": {
                "font_family": "monospace",
                "font_size": 14,
                "theme": "waddle_dark",
                "cursor_style": "block",
                "cursor_blink": true,
                "opacity": 0.95,
                "scrollback": 10000
            }
        }"#;

        let cfg: AppConfig = serde_json::from_str(json_without_general).unwrap();
        assert_eq!(cfg.general.language, "en-US");
        assert!(cfg.git.enabled);
        assert!(cfg.git.restrict_to_github);
    }

    #[test]
    fn test_git_config_custom() {
        let json_custom_git = r#"{
            "ai": {
                "provider": "ollama",
                "ollama_endpoint": "http://localhost:11434",
                "ollama_model": "llama3.2",
                "temperature": 0.2
            },
            "terminal": {
                "font_family": "monospace",
                "font_size": 14,
                "theme": "waddle_dark",
                "cursor_style": "block",
                "cursor_blink": true,
                "opacity": 0.95,
                "scrollback": 10000
            },
            "git": {
                "enabled": false,
                "restrict_to_github": false
            }
        }"#;

        let cfg: AppConfig = serde_json::from_str(json_custom_git).unwrap();
        assert!(!cfg.git.enabled);
        assert!(!cfg.git.restrict_to_github);
    }

    #[test]
    fn test_validate_wallpaper_file_path() {
        let temp_dir = std::env::temp_dir().join(format!("waddle_val_test_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);

        // Valid preset / none
        assert!(validate_wallpaper_file_path("none").is_ok());
        assert!(validate_wallpaper_file_path("preset_cyberpunk").is_ok());

        // Fake png with text content must be rejected
        let fake_png_path = temp_dir.join("test.png");
        fs::write(&fake_png_path, b"this is a text file masquerading as png").unwrap();
        let res = validate_wallpaper_file_path(fake_png_path.to_str().unwrap());
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("許可されていないファイル形式"));

        // Valid png must be accepted
        let real_png_path = temp_dir.join("real.png");
        fs::write(&real_png_path, b"\x89PNG\r\n\x1a\nvalid_png_header_and_data").unwrap();
        assert!(validate_wallpaper_file_path(real_png_path.to_str().unwrap()).is_ok());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
