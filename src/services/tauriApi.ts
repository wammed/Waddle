import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  AppConfig,
  ChatMessage,
  CommandSuggestion,
  ErrorExplanation,
  FileEntry,
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

  async startPty(sessionId: string): Promise<void> {
    if (!isTauri()) return;
    try {
      await invoke('start_pty', { sessionId });
    } catch {
      // ignore
    }
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
        ahead: 1,
        behind: 0,
        modified_count: 2,
        untracked_count: 1,
        staged_count: 1,
        conflicted_count: 0,
        files: [
          { path: 'src/components/StatusBar.tsx', status_code: ' M', staged: false, unstaged: true, is_untracked: false, is_conflicted: false },
          { path: 'src/types.ts', status_code: 'M ', staged: true, unstaged: false, is_untracked: false, is_conflicted: false },
          { path: 'scratch.txt', status_code: '??', staged: false, unstaged: true, is_untracked: true, is_conflicted: false },
        ],
      };
    }
    return await invoke<GitStatus>('get_git_status', { path });
  },

  async gitStageFile(repoPath: string, filePath: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('git_stage_file', { repoPath, filePath });
  },

  async gitUnstageFile(repoPath: string, filePath: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('git_unstage_file', { repoPath, filePath });
  },

  async gitStageAll(repoPath: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('git_stage_all', { repoPath });
  },

  async gitUnstageAll(repoPath: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('git_unstage_all', { repoPath });
  },

  async gitDiscardFile(repoPath: string, filePath: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('git_discard_file', { repoPath, filePath });
  },

  async gitCommit(repoPath: string, message: string): Promise<string> {
    if (!isTauri()) return '[main 1a2b3c] ' + message;
    return await invoke<string>('git_commit', { repoPath, message });
  },

  async gitGetBranches(repoPath: string): Promise<string[]> {
    if (!isTauri()) return ['main', 'feature/git-integration', 'dev'];
    return await invoke<string[]>('git_get_branches', { repoPath });
  },

  async gitCheckoutBranch(repoPath: string, branch: string): Promise<string> {
    if (!isTauri()) return `Switched to branch '${branch}'`;
    return await invoke<string>('git_checkout_branch', { repoPath, branch });
  },

  async gitGetDiff(repoPath: string, filePath?: string, staged?: boolean): Promise<string> {
    if (!isTauri()) {
      return `--- a/${filePath || 'file'}\n+++ b/${filePath || 'file'}\n@@ -1,5 +1,6 @@\n // Example diff\n-const oldVal = 1;\n+const newVal = 2;\n+const added = true;\n`;
    }
    return await invoke<string>('git_get_diff', {
      repoPath,
      filePath: filePath || null,
      staged: staged ?? false,
    });
  },

  async gitGenerateCommitMessage(repoPath: string): Promise<string> {
    if (!isTauri()) {
      return 'feat(git): add interactive git popover and diff viewer';
    }
    return await invoke<string>('git_generate_commit_message', { repoPath });
  },

  async gitPush(repoPath: string): Promise<string> {
    if (!isTauri()) {
      return 'Push completed successfully';
    }
    return await invoke<string>('git_push', { repoPath });
  },

  async gitPull(repoPath: string): Promise<string> {
    if (!isTauri()) {
      return 'Pull completed successfully';
    }
    return await invoke<string>('git_pull', { repoPath });
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

  async readDirectory(path: string, showHidden = false): Promise<FileEntry[]> {
    if (!isTauri()) {
      return [
        { name: 'src', path: `${path}/src`, is_dir: true, is_symlink: false, size: 4096, readonly: false },
        { name: 'public', path: `${path}/public`, is_dir: true, is_symlink: false, size: 4096, readonly: false },
        { name: 'package.json', path: `${path}/package.json`, is_dir: false, is_symlink: false, size: 1024, readonly: false },
        { name: 'README.md', path: `${path}/README.md`, is_dir: false, is_symlink: false, size: 2048, readonly: false },
      ];
    }
    return await invoke<FileEntry[]>('read_directory', { path, showHidden });
  },

  async createFile(path: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('create_file', { path });
  },

  async createDirectory(path: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('create_directory', { path });
  },

  async deleteEntry(path: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('delete_entry', { path });
  },

  async renameEntry(oldPath: string, newPath: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('rename_entry', { oldPath, newPath });
  },

  async revealInFileManager(path: string): Promise<void> {
    if (!isTauri()) return;
    return await invoke('reveal_in_file_manager', { path });
  },

  async listDirectoryFiles(path: string): Promise<string[]> {
    try {
      const entries = await this.readDirectory(path, false);
      return entries.map((e) => (e.is_dir ? `${e.name}/` : e.name));
    } catch {
      return [];
    }
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
        explanation: 'Search command suggested by local Ollama model.',
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
        summary: `Command '${command}' failed with exit code ${exitCode}`,
        cause: 'The specified file or directory does not exist, or permissions are insufficient.',
        fix_command: `sudo ${command}`,
        explanation: 'Try elevating permissions or check the file path spelling.',
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
      const mockText = `Waddle (Local Ollama) Assistant!\nCurrent directory: \`${context.cwd}\`\n\n\`\`\`bash\nls -la\n\`\`\``;
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
      onChunk(`\n\n**Ollama Connection Error:** ${err}\n\n💡 Please start Ollama with \`ollama serve\`.`);
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

  async pickWallpaperFile(): Promise<string | null> {
    if (!isTauri()) {
      return '/home/user/Pictures/wallpaper.jpg';
    }
    return await invoke<string | null>('pick_wallpaper_file');
  },

  async validateWallpaperPath(path: string): Promise<void> {
    if (!isTauri()) {
      return;
    }
    await invoke('validate_wallpaper_path', { path });
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

  // Kitty Graphics Operations
  async kittyReadFile(
    path: string,
    allowedDir?: string,
    maxBytes?: number,
    maxDimension?: number,
    isTemp?: boolean
  ): Promise<{ data: string; mime: string; width?: number; height?: number }> {
    if (!isTauri()) {
      throw new Error('kittyReadFile is only available in Tauri environment');
    }
    return await invoke<{ data: string; mime: string; width?: number; height?: number }>(
      'kitty_read_file',
      {
        path,
        allowedDir: allowedDir || null,
        maxBytes: maxBytes || null,
        maxDimension: maxDimension || null,
        isTemp: isTemp ?? false,
      }
    );
  },
};

