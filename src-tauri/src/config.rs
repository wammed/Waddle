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
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            provider: "ollama".to_string(),
            ollama_endpoint: "http://localhost:11434".to_string(),
            ollama_model: "llama3.2".to_string(),
            temperature: 0.2,
            custom_system_prompt: None,
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
    #[serde(default)]
    pub background_image: Option<String>,
    #[serde(default = "default_bg_opacity")]
    pub background_opacity: f32,
    #[serde(default)]
    pub background_blur: u32,
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
            background_image: None,
            background_opacity: 0.85,
            background_blur: 0,
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

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppConfig {
    #[serde(default)]
    pub general: GeneralConfig,
    pub ai: AiConfig,
    pub terminal: TerminalConfig,
}

pub struct ConfigManager {
    config_path: PathBuf,
    config_dir: PathBuf,
}

impl ConfigManager {
    pub fn new() -> Self {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("waddle");
        let _ = fs::create_dir_all(&config_dir);
        Self {
            config_path: config_dir.join("config.json"),
            config_dir,
        }
    }

    pub fn save_wallpaper_data(&self, file_name: &str, data: &[u8]) -> Result<String, String> {
        let wallpapers_dir = self.config_dir.join("wallpapers");
        let _ = fs::create_dir_all(&wallpapers_dir);

        let clean_name = Path::new(file_name)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("wallpaper.png");

        let file_path = if clean_name.contains('.') {
            wallpapers_dir.join(clean_name)
        } else {
            wallpapers_dir.join(format!("{}.png", clean_name))
        };

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
        self.migrate_base64_wallpaper(&mut cfg);
        self.save_internal(&cfg)
    }
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

        let dummy_png_bytes = b"fake-png-image-binary-data";
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
    }
}
