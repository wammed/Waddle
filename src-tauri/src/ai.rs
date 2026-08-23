use crate::config::AiConfig;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalContext {
    pub os: String,
    pub shell: String,
    pub cwd: String,
    pub git_branch: Option<String>,
    pub recent_command: Option<String>,
    pub recent_output: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandSuggestion {
    pub command: String,
    pub explanation: String,
    pub is_dangerous: bool,
    pub alternatives: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ErrorExplanation {
    pub summary: String,
    pub cause: String,
    pub fix_command: Option<String>,
    pub explanation: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaStatus {
    pub available: bool,
    pub version: Option<String>,
    pub models: Vec<String>,
    pub error: Option<String>,
}

pub struct AiClient {
    client: reqwest::Client,
}

impl AiClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .timeout(Duration::from_secs(60))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
        }
    }

    /// Ollama 接続状態とインストール済みモデル一覧の取得
    pub async fn check_ollama_status(&self, endpoint: &str) -> OllamaStatus {
        let clean_endpoint = endpoint.trim_end_matches('/');
        let tags_url = format!("{}/api/tags", clean_endpoint);
        let version_url = format!("{}/api/version", clean_endpoint);

        let version_res = self.client.get(&version_url).send().await;
        let mut version = None;
        if let Ok(res) = version_res {
            if let Ok(json) = res.json::<serde_json::Value>().await {
                version = json["version"].as_str().map(|s| s.to_string());
            }
        }

        let tags_res = self.client.get(&tags_url).send().await;
        match tags_res {
            Ok(res) if res.status().is_success() => {
                let mut models = Vec::new();
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    if let Some(arr) = json["models"].as_array() {
                        for item in arr {
                            if let Some(name) = item["name"].as_str() {
                                models.push(name.to_string());
                            }
                        }
                    }
                }
                OllamaStatus {
                    available: true,
                    version,
                    models,
                    error: None,
                }
            }
            Ok(res) => OllamaStatus {
                available: false,
                version: None,
                models: Vec::new(),
                error: Some(format!("Ollama HTTP {}", res.status())),
            },
            Err(e) => OllamaStatus {
                available: false,
                version: None,
                models: Vec::new(),
                error: Some(format!("Ollama is not running at {}: {}", clean_endpoint, e)),
            },
        }
    }

    /// 自然言語プロンプトからLinuxコマンドを生成 (Ollama最適化)
    pub async fn generate_command(
        &self,
        prompt: &str,
        context: &TerminalContext,
        config: &AiConfig,
    ) -> Result<CommandSuggestion, String> {
        let system_prompt = format!(
            "You are Waddle AI, an expert Linux command line assistant. \
The user operates on OS: {}, Shell: {}, Current Working Directory: {}. Git Branch: {}. \
The user will ask for a shell command in natural language (Japanese or English). \
Respond with ONLY a JSON object matching this schema:
{{
  \"command\": \"<the exact command to run>\",
  \"explanation\": \"<short clear explanation in Japanese>\",
  \"is_dangerous\": <true if it deletes files, alters partitions, wipes git history, or shuts down the system, else false>,
  \"alternatives\": [\"<optional alternative 1>\", \"<optional alternative 2>\"]
}}
Output strictly valid JSON with no markdown formatting around it.",
            context.os,
            context.shell,
            context.cwd,
            context.git_branch.as_deref().unwrap_or("none")
        );

        let user_prompt = format!(
            "User Request: {}\nRecent command in history: {}\nRecent output context: {}",
            prompt,
            context.recent_command.as_deref().unwrap_or("none"),
            context.recent_output.as_deref().unwrap_or("none")
        );

        let raw_response = self.call_ollama(&system_prompt, &user_prompt, config).await?;

        // Extract JSON from response
        let cleaned = clean_json_string(&raw_response);
        match serde_json::from_str::<CommandSuggestion>(&cleaned) {
            Ok(res) => Ok(res),
            Err(e) => {
                // Fallback parsing
                let cmd_line = cleaned
                    .lines()
                    .next()
                    .unwrap_or(&cleaned)
                    .trim()
                    .trim_matches('`')
                    .to_string();
                let is_dang = cmd_line.contains("rm -rf")
                    || cmd_line.contains("mkfs")
                    || cmd_line.contains("dd if=");
                Ok(CommandSuggestion {
                    command: cmd_line,
                    explanation: format!("(モデル応答: {})", e),
                    is_dangerous: is_dang,
                    alternatives: vec![],
                })
            }
        }
    }

    /// コマンド実行エラーの解説と修正コマンド提案 (Ollama最適化)
    pub async fn explain_error(
        &self,
        command: &str,
        output: &str,
        exit_code: i32,
        context: &TerminalContext,
        config: &AiConfig,
    ) -> Result<ErrorExplanation, String> {
        let system_prompt = format!(
            "You are Waddle AI, an expert Linux diagnostic tool. \
The user executed a command that failed with exit code {}.\n\
OS: {}, Shell: {}, CWD: {}\n\
Analyze the error and output strictly JSON:
{{
  \"summary\": \"<one-line brief summary of the error in Japanese>\",
  \"cause\": \"<concise reason why it failed in Japanese>\",
  \"fix_command\": \"<suggested exact command to fix or retry, or null>\",
  \"explanation\": \"<helpful explanation and tips in Japanese>\"
}}
Output strictly valid JSON with no markdown wrapping.",
            exit_code, context.os, context.shell, context.cwd
        );

        let user_prompt = format!(
            "Executed Command: {}\nExit Code: {}\nOutput / Error Log:\n```\n{}\n```",
            command, exit_code, output
        );

        let raw_response = self.call_ollama(&system_prompt, &user_prompt, config).await?;

        let cleaned = clean_json_string(&raw_response);
        match serde_json::from_str::<ErrorExplanation>(&cleaned) {
            Ok(res) => Ok(res),
            Err(e) => Ok(ErrorExplanation {
                summary: format!("コマンドがエラー (Exit code {}) で終了しました", exit_code),
                cause: "エラー原因の自動解析を行いました。".to_string(),
                fix_command: None,
                explanation: format!("AI応答:\n{}\n(解析エラー: {})", raw_response, e),
            }),
        }
    }

    /// 対話型AIチャット（Ollama ストリーミング）
    pub async fn stream_chat(
        &self,
        app: AppHandle,
        chat_id: String,
        messages: Vec<ChatMessage>,
        context: &TerminalContext,
        config: &AiConfig,
    ) -> Result<(), String> {
        let system_prompt = format!(
            "You are Waddle Copilot, an AI assistant deeply integrated into the user's Linux terminal powered completely by local Ollama.\n\
System Information:\n\
- OS: {}\n\
- Shell: {}\n\
- Working Directory: {}\n\
- Git Branch: {}\n\
- Last Command: {}\n\
- Recent Output Context:\n```\n{}\n```\n\
Help the user with Linux commands, troubleshooting, script writing, and log analysis in polite Japanese.\n\
Format your responses using Markdown. When suggesting commands, use ```bash code blocks so the user can easily execute them.",
            context.os,
            context.shell,
            context.cwd,
            context.git_branch.as_deref().unwrap_or("none"),
            context.recent_command.as_deref().unwrap_or("none"),
            context.recent_output.as_deref().unwrap_or("none")
        );

        self.stream_ollama(&app, &chat_id, &system_prompt, messages, config)
            .await
    }

    /// エディタ用: コード編集・自動生成 (Ollama)
    pub async fn edit_code(
        &self,
        instruction: &str,
        code: &str,
        file_name: Option<&str>,
        context: &TerminalContext,
        config: &AiConfig,
    ) -> Result<String, String> {
        let system_prompt = format!(
            "You are Waddle Code Assistant. \
The user is editing a file (filename: {}) in their Linux terminal (OS: {}, CWD: {}). \
Follow the user's instruction and return the edited or generated full code. \
Output ONLY the resulting code. Wrap the code in a single markdown code block like ```language ... ```.",
            file_name.unwrap_or("untitled"),
            context.os,
            context.cwd
        );

        let user_prompt = format!(
            "Instruction: {}\n\nOriginal Code:\n```\n{}\n```",
            instruction, code
        );

        let endpoint = if config.ollama_endpoint.is_empty() {
            "http://localhost:11434"
        } else {
            &config.ollama_endpoint
        };
        let url = format!("{}/api/generate", endpoint.trim_end_matches('/'));

        let model = if config.ollama_model.is_empty() {
            "llama3.2"
        } else {
            &config.ollama_model
        };

        let body = serde_json::json!({
            "model": model,
            "system": system_prompt,
            "prompt": user_prompt,
            "stream": false
        });

        let res = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Ollamaへの接続に失敗しました: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let err_text = res.text().await.unwrap_or_default();
            return Err(format!("Ollama Error (HTTP {}): {}", status, err_text));
        }

        let json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

        let response = json["response"]
            .as_str()
            .ok_or_else(|| "No response from Ollama".to_string())?;

        Ok(extract_code_from_markdown(response))
    }

    // --- Ollama Implementation ---

    async fn call_ollama(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        config: &AiConfig,
    ) -> Result<String, String> {
        let endpoint = if config.ollama_endpoint.is_empty() {
            "http://localhost:11434"
        } else {
            &config.ollama_endpoint
        };
        let url = format!("{}/api/generate", endpoint.trim_end_matches('/'));

        let model = if config.ollama_model.is_empty() {
            "llama3.2"
        } else {
            &config.ollama_model
        };

        let body = serde_json::json!({
            "model": model,
            "system": system_prompt,
            "prompt": user_prompt,
            "stream": false,
            "format": "json"
        });

        let res = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Ollamaへの接続に失敗しました (Ollamaが起動しているか確認してください: `ollama serve`): {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let err_text = res.text().await.unwrap_or_default();
            return Err(format!("Ollama Error (HTTP {}): {}", status, err_text));
        }

        let json: serde_json::Value = res
            .json()
            .await
            .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

        let response = json["response"]
            .as_str()
            .ok_or_else(|| "No response text from Ollama".to_string())?;

        Ok(response.to_string())
    }

    async fn stream_ollama(
        &self,
        app: &AppHandle,
        chat_id: &str,
        system_prompt: &str,
        messages: Vec<ChatMessage>,
        config: &AiConfig,
    ) -> Result<(), String> {
        let endpoint = if config.ollama_endpoint.is_empty() {
            "http://localhost:11434"
        } else {
            &config.ollama_endpoint
        };
        let url = format!("{}/api/chat", endpoint.trim_end_matches('/'));

        let model = if config.ollama_model.is_empty() {
            "llama3.2"
        } else {
            &config.ollama_model
        };

        let mut payload_messages = vec![serde_json::json!({
            "role": "system",
            "content": system_prompt
        })];

        for m in messages {
            payload_messages.push(serde_json::json!({
                "role": m.role,
                "content": m.content
            }));
        }

        let body = serde_json::json!({
            "model": model,
            "messages": payload_messages,
            "stream": true
        });

        let res = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Ollamaへの接続に失敗しました (`ollama serve` を実行してください): {}", e))?;

        if !res.status().is_success() {
            let err_text = res.text().await.unwrap_or_default();
            return Err(format!("Ollama Error: {}", err_text));
        }

        let mut stream = res.bytes_stream();
        let chunk_event = format!("ai-chat-chunk-{}", chat_id);
        let done_event = format!("ai-chat-done-{}", chat_id);

        while let Some(chunk_result) = stream.next().await {
            if let Ok(bytes) = chunk_result {
                let text = String::from_utf8_lossy(&bytes);
                for line in text.lines() {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                        if let Some(delta) = val["message"]["content"].as_str() {
                            let _ = app.emit(&chunk_event, delta);
                        }
                    }
                }
            }
        }

        let _ = app.emit(&done_event, ());
        Ok(())
    }
}

fn clean_json_string(s: &str) -> String {
    let trimmed = s.trim();
    if trimmed.starts_with("```json") {
        let rest = &trimmed[7..];
        if let Some(end_idx) = rest.rfind("```") {
            return rest[..end_idx].trim().to_string();
        }
    } else if trimmed.starts_with("```") {
        let rest = &trimmed[3..];
        if let Some(end_idx) = rest.rfind("```") {
            return rest[..end_idx].trim().to_string();
        }
    }
    trimmed.to_string()
}

fn extract_code_from_markdown(s: &str) -> String {
    let trimmed = s.trim();
    if let Some(start) = trimmed.find("```") {
        let after_start = &trimmed[start + 3..];
        // Skip language identifier up to newline
        let code_start = if let Some(nl) = after_start.find('\n') {
            &after_start[nl + 1..]
        } else {
            after_start
        };

        if let Some(end_idx) = code_start.rfind("```") {
            return code_start[..end_idx].trim_end().to_string();
        }
    }
    trimmed.to_string()
}
