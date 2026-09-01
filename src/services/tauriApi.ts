import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  AppConfig,
  ChatMessage,
  CommandSuggestion,
  ErrorExplanation,
  GitStatus,
  OllamaStatus,
  PtySessionInfo,
  SystemInfo,
  TerminalContext,
} from '../types';

export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

export const TauriApi = {
  // PTY Operations
  async createPty(
    rows: number,
    cols: number,
    cwd?: string,
    shell?: string
  ): Promise<PtySessionInfo> {
    if (!isTauri()) {
      return {
        id: 'mock-session-' + Date.now(),
        pid: 1234,
        shell: '/bin/bash',
        cwd: '/home/user/workspace',
      };
    }
    return await invoke<PtySessionInfo>('create_pty', {
      rows,
      cols,
      cwd,
      shell,
    });
  },

  async writePty(sessionId: string, data: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('write_pty', { sessionId, data });
  },

  async resizePty(sessionId: string, rows: number, cols: number): Promise<void> {
    if (!isTauri()) return;
    return await invoke('resize_pty', { sessionId, rows, cols });
  },

  async closePty(sessionId: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('close_pty', { sessionId });
  },

  async getSessionCwd(sessionId: string): Promise<string> {
    if (!isTauri()) return '/home/user/workspace';
    return await invoke<string>('get_session_cwd', { sessionId });
  },

  async getGitStatus(path: string): Promise<GitStatus> {
    if (!isTauri()) {
      return {
        is_repo: true,
        branch: 'main',
        modified_count: 2,
        untracked_count: 1,
      };
    }
    return await invoke<GitStatus>('get_git_status', { path });
  },

  // Event Listeners
  async onPtyOutput(
    sessionId: string,
    callback: (data: string) => void
  ): Promise<UnlistenFn> {
    if (!isTauri()) {
      return () => {};
    }
    return await listen<string>(`pty-output-${sessionId}`, (event) => {
      callback(event.payload);
    });
  },

  async onPtyExit(sessionId: string, callback: () => void): Promise<UnlistenFn> {
    if (!isTauri()) {
      return () => {};
    }
    return await listen(`pty-exit-${sessionId}`, () => {
      callback();
    });
  },

  // File System & Editor
  async readFile(path: string): Promise<string> {
    if (!isTauri()) {
      return `# Example Script\necho "Hello from Waddle!"\nls -la\n`;
    }
    return await invoke<string>('read_file', { path });
  },

  async writeFile(path: string, content: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('write_file', { path, content });
  },

  async listDirectoryFiles(path: string): Promise<string[]> {
    if (!isTauri()) {
      return ['main.py', 'test.sh', 'package.json', 'src/'];
    }
    return await invoke<string[]>('list_directory_files', { path });
  },

  async aiEditCode(
    instruction: string,
    code: string,
    fileName?: string,
    context?: TerminalContext
  ): Promise<string> {
    if (!isTauri()) {
      return `# AI Refactored Code\necho "Modified according to: ${instruction}"\n${code}`;
    }
    return await invoke<string>('ai_edit_code', {
      instruction,
      code,
      fileName,
      context,
    });
  },

  // AI Operations (Ollama)
  async checkOllamaStatus(endpoint?: string): Promise<OllamaStatus> {
    if (!isTauri()) {
      return {
        available: true,
        version: '0.5.4',
        models: ['llama3.2', 'deepseek-r1', 'qwen2.5-coder'],
      };
    }
    return await invoke<OllamaStatus>('check_ollama_status', { endpoint });
  },

  async generateCommand(
    prompt: string,
    context: TerminalContext
  ): Promise<CommandSuggestion> {
    if (!isTauri()) {
      return {
        command: `find . -name "*${prompt}*" -type f`,
        explanation: 'ローカル Ollama モデルによる検索コマンド提案です。',
        is_dangerous: false,
        alternatives: [`locate ${prompt}`, `fd ${prompt}`],
      };
    }
    return await invoke<CommandSuggestion>('generate_command', {
      prompt,
      context,
    });
  },

  async explainError(
    command: string,
    output: string,
    exitCode: number,
    context: TerminalContext
  ): Promise<ErrorExplanation> {
    if (!isTauri()) {
      return {
        summary: `コマンド '${command}' が終了コード ${exitCode} で失敗しました`,
        cause: '指定されたファイルまたはディレクトリが存在しないか、パーミッションが不足しています。',
        fix_command: `sudo ${command}`,
        explanation: '権限を昇格して再実行するか、パスの綴りを確認してください。',
      };
    }
    return await invoke<ErrorExplanation>('explain_error', {
      command,
      output,
      exitCode,
      context,
    });
  },

  async streamAiChat(
    chatId: string,
    messages: ChatMessage[],
    context: TerminalContext,
    onChunk: (chunk: string) => void,
    onDone: () => void
  ): Promise<() => void> {
    if (!isTauri()) {
      const mockText = `Waddle (ローカル Ollama) アシスタントです！\n現在のディレクトリ: \`${context.cwd}\`\n\n\`\`\`bash\nls -la\n\`\`\``;
      let i = 0;
      const interval = setInterval(() => {
        if (i < mockText.length) {
          onChunk(mockText.slice(i, i + 4));
          i += 4;
        } else {
          clearInterval(interval);
          onDone();
        }
      }, 50);
      return () => clearInterval(interval);
    }

    const unlistenChunk = await listen<string>(`ai-chat-chunk-${chatId}`, (e) => {
      onChunk(e.payload);
    });

    const unlistenDone = await listen(`ai-chat-done-${chatId}`, () => {
      onDone();
      unlistenChunk();
      unlistenDone();
    });

    try {
      await invoke('stream_ai_chat', {
        chatId,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        context,
      });
    } catch (err) {
      console.error('stream_ai_chat error:', err);
      onChunk(`\n\n**Ollama接続エラー:** ${err}\n\n💡 \`ollama serve\` でOllamaを起動してください。`);
      onDone();
      unlistenChunk();
      unlistenDone();
    }

    return () => {
      unlistenChunk();
      unlistenDone();
    };
  },

  // Config & System
  async getConfig(): Promise<AppConfig> {
    if (!isTauri()) {
      return {
        ai: {
          provider: 'ollama',
          ollama_endpoint: 'http://localhost:11434',
          ollama_model: 'llama3.2',
          temperature: 0.2,
        },
        terminal: {
          font_family: 'JetBrains Mono, monospace',
          font_size: 14,
          theme: 'waddle_dark',
          cursor_style: 'block',
          cursor_blink: true,
          opacity: 0.95,
          scrollback: 10000,
        },
      };
    }
    return await invoke<AppConfig>('get_config');
  },

  async saveConfig(config: AppConfig): Promise<void> {
    if (!isTauri()) return;
    return await invoke('save_config', { config });
  },

  async saveWallpaperFile(
    fileName: string,
    fileData: number[] | Uint8Array
  ): Promise<string> {
    if (!isTauri()) {
      return `/home/user/Pictures/${fileName}`;
    }
    const dataArray = Array.isArray(fileData) ? fileData : Array.from(fileData);
    return await invoke<string>('save_wallpaper_file', {
      fileName,
      fileData: dataArray,
    });
  },

  async getSystemInfo(): Promise<SystemInfo> {
    if (!isTauri()) {
      return {
        os: 'Linux (CachyOS)',
        kernel: '7.2.0-cachyos',
        hostname: 'waddle-host',
        default_shell: '/bin/bash',
        user: 'susie',
      };
    }
    return await invoke<SystemInfo>('get_system_info');
  },
};
