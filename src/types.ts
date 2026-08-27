export interface AiConfig {
  provider: 'ollama';
  ollama_endpoint: string;
  ollama_model: string;
  temperature: number;
  custom_system_prompt?: string;
}

export interface TerminalConfig {
  font_family: string;
  font_size: number;
  theme: string;
  cursor_style: 'block' | 'underline' | 'bar';
  cursor_blink: boolean;
  opacity: number;
  shell?: string;
  scrollback: number;
  background_image?: string;
  background_opacity?: number;
  background_blur?: number;
}

export interface AppConfig {
  ai: AiConfig;
  terminal: TerminalConfig;
}

export interface OllamaStatus {
  available: boolean;
  version?: string;
  models: string[];
  error?: string;
}

export interface PtySessionInfo {
  id: string;
  pid: number;
  shell: string;
  cwd: string;
}

export interface GitStatus {
  is_repo: boolean;
  branch?: string;
  modified_count: number;
  untracked_count: number;
}

export interface TerminalContext {
  os: string;
  shell: string;
  cwd: string;
  git_branch?: string;
  recent_command?: string;
  recent_output?: string;
}

export interface CommandSuggestion {
  command: string;
  explanation: string;
  is_dangerous: boolean;
  alternatives: string[];
}

export interface ErrorExplanation {
  summary: string;
  cause: string;
  fix_command?: string;
  explanation: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface SystemInfo {
  os: string;
  kernel: string;
  hostname: string;
  default_shell: string;
  user: string;
}

export interface TerminalTab {
  id: string;
  title: string;
  sessionId: string;
  cwd: string;
  gitStatus: GitStatus;
  lastCommand?: string;
  lastExitCode?: number;
  lastOutput?: string;
  hasErrorAlert?: boolean;
}
