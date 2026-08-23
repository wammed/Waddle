use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

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
}

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            font_family: "JetBrains Mono, Fira Code, Cascadia Code, monospace".to_string(),
            font_size: 14,
            theme: "waddle_dark".to_string(),
            cursor_style: "block".to_string(),
            cursor_blink: true,
            opacity: 0.95,
            shell: None,
            scrollback: 10000,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppConfig {
    pub ai: AiConfig,
    pub terminal: TerminalConfig,
}

pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new() -> Self {
        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("waddle");
        let _ = fs::create_dir_all(&config_dir);
        Self {
            config_path: config_dir.join("config.json"),
        }
    }

    pub fn load(&self) -> AppConfig {
        if self.config_path.exists() {
            if let Ok(content) = fs::read_to_string(&self.config_path) {
                if let Ok(cfg) = serde_json::from_str::<AppConfig>(&content) {
                    return cfg;
                }
            }
        }
        let default_cfg = AppConfig::default();
        let _ = self.save(&default_cfg);
        default_cfg
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let json = serde_json::to_string_pretty(config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&self.config_path, json)
            .map_err(|e| format!("Failed to write config file: {}", e))?;
        Ok(())
    }
}
