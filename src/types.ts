export interface AiConfig {
  provider: 'ollama';
  ollama_endpoint: string;
  ollama_model: string;
  temperature: number;
  custom_system_prompt?: string;
  enable_project_rules?: boolean;
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
  mask_secrets?: boolean;
  watchdog_auto_analyze?: boolean;
}

export interface SessionCommandRecord {
  id: string;
  command: string;
  cwd: string;
  timestamp: number;
  durationMs?: number;
  exitCode?: number;
  outputSnippet?: string;
  paneId?: string;
}

export type Language = 'en-US' | 'en-GB' | 'ja';

export interface GeneralConfig {
  language: Language;
}

export interface GitConfig {
  enabled: boolean;
  restrict_to_github: boolean;
}

export interface KittyGraphicsConfig {
  enabled: boolean;
  max_dimension: number;
  max_payload_mb: number;
  cache_limit_mb: number;
  allowed_dir: string;
}

export interface AppConfig {
  general?: GeneralConfig;
  ai: AiConfig;
  terminal: TerminalConfig;
  git?: GitConfig;
  kitty_graphics?: KittyGraphicsConfig;
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

export interface GitFileEntry {
  path: string;
  status_code: string;
  staged: boolean;
  unstaged: boolean;
  is_untracked: boolean;
  is_conflicted: boolean;
}

export interface GitStatus {
  is_repo: boolean;
  branch?: string;
  ahead?: number;
  behind?: number;
  modified_count: number;
  untracked_count: number;
  staged_count?: number;
  conflicted_count?: number;
  is_github_repo?: boolean;
  blocked_remote?: string;
  files?: GitFileEntry[];
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

export type PaneLayout =
  | 'single'
  // 2 panes
  | 'split-2-h'
  | 'split-2-v'
  // 3 panes
  | 'split-3-left-main'
  | 'split-3-top-main'
  | 'split-3-h'
  | 'split-3-v'
  // 4 panes
  | 'grid-4'
  | 'split-4-left-main'
  | 'split-4-h';

export interface TerminalPaneInfo {
  id: string;
  sessionId: string;
  cwd: string;
  title: string;
  gitStatus: GitStatus;
  lastCommand?: string;
  lastExitCode?: number;
  lastOutput?: string;
}

export interface TerminalTab {
  id: string;
  title: string;
  layout: PaneLayout;
  panes: TerminalPaneInfo[];
  activePaneId: string;
  isZoomed?: boolean;

  // Active pane mirror properties for backward compatibility
  sessionId: string;
  cwd: string;
  gitStatus: GitStatus;
  lastCommand?: string;
  lastExitCode?: number;
  lastOutput?: string;
  hasErrorAlert?: boolean;
  splitRatios?: Record<string, number>;
}

export interface SavedPaneInfo {
  id: string;
  cwd: string;
  title: string;
}

export interface SavedSessionTab {
  id: string;
  title: string;
  layout: PaneLayout;
  panes: SavedPaneInfo[];
  activePaneId: string;
  splitRatios?: Record<string, number>;
}

export interface SavedSessionState {
  version: number;
  activeTabId: string;
  tabs: SavedSessionTab[];
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_symlink: boolean;
  size: number;
  readonly: boolean;
  modified?: number;
}
