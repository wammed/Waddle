import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { TerminalPane } from './components/TerminalPane';
import { StatusBar } from './components/StatusBar';
import { AiCommandModal } from './components/AiCommandModal';
import { AiErrorBanner } from './components/AiErrorBanner';
import { AiSidebar } from './components/AiSidebar';
import { EditorPane } from './components/EditorPane';
import { SettingsModal } from './components/SettingsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppConfig, SystemInfo, TerminalContext, TerminalTab } from './types';
import { TauriApi } from './services/tauriApi';
import { THEMES } from './theme';
import { convertFileSrc } from '@tauri-apps/api/core';
import waddleWallpaper from './assets/waddle-wallpaper.png';

const generateTabId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `tab-${crypto.randomUUID()}`;
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

const DEFAULT_CONFIG: AppConfig = {
  ai: {
    provider: 'ollama',
    ollama_endpoint: 'http://localhost:11434',
    ollama_model: 'llama3.2',
    temperature: 0.2,
  },
  terminal: {
    font_family: "'JetBrainsMono Nerd Font', 'JetBrains Mono', 'Symbols Nerd Font Mono', monospace",
    font_size: 14,
    theme: 'waddle_dark',
    cursor_style: 'block',
    cursor_blink: true,
    opacity: 0.95,
    scrollback: 10000,
  },
};

const getCachedConfig = (): AppConfig => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = localStorage.getItem('waddle_config_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
  }
  return DEFAULT_CONFIG;
};

export function App() {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [config, setConfig] = useState<AppConfig>(getCachedConfig);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  const handleUpdateConfig = useCallback((newConfig: AppConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem('waddle_config_cache', JSON.stringify(newConfig));
    } catch {}
  }, []);

  // Modals and panels
  const [isAiCommandOpen, setIsAiCommandOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active error alert
  const [errorAlert, setErrorAlert] = useState<{
    command: string;
    output: string;
    exitCode: number;
  } | null>(null);

  const isInitializedRef = useRef(false);

  // Apply Theme CSS variables
  useEffect(() => {
    const activeTheme = THEMES[config.terminal.theme] || THEMES.waddle_dark;
    const root = document.documentElement;
    root.style.setProperty('--bg-main', activeTheme.ui.bg);
    root.style.setProperty('--bg-secondary', activeTheme.ui.bgSecondary);
    root.style.setProperty('--bg-tertiary', activeTheme.ui.bgTertiary);
    root.style.setProperty('--bg-card', activeTheme.ui.cardBg);
    root.style.setProperty('--fg-main', activeTheme.ui.fg);
    root.style.setProperty('--fg-muted', activeTheme.ui.fgMuted);
    root.style.setProperty('--accent', activeTheme.ui.accent);
    root.style.setProperty('--accent-glow', activeTheme.ui.accentGlow);
    root.style.setProperty('--border', activeTheme.ui.border);
  }, [config.terminal.theme]);

  // Initial load (guarded against React StrictMode double invocation)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Immediately launch initial terminal tab
    createNewTab();

    // Fetch config & system info in background
    const init = async () => {
      try {
        const [loadedConfig, sysInfo] = await Promise.all([
          TauriApi.getConfig(),
          TauriApi.getSystemInfo(),
        ]);
        handleUpdateConfig(loadedConfig);
        setSystemInfo(sysInfo);
      } catch (err) {
        console.warn('Init fetch failed:', err);
      }
    };

    init();
  }, [handleUpdateConfig]);

  const updateTab = useCallback((tabId: string, updates: Partial<TerminalTab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, ...updates } : t))
    );
  }, []);

  const createNewTab = async () => {
    try {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const h = typeof window !== 'undefined' ? window.innerHeight : 1440;
      const initialCols = Math.max(80, Math.floor((w - 24) / 9.2));
      const initialRows = Math.max(24, Math.floor((h - 80) / 17.5));
      const pty = await TauriApi.createPty(initialRows, initialCols);
      const newTabId = generateTabId();
      const newTab: TerminalTab = {
        id: newTabId,
        title: 'bash',
        sessionId: pty.id,
        cwd: pty.cwd,
        gitStatus: {
          is_repo: false,
          modified_count: 0,
          untracked_count: 0,
        },
      };

      setTabs((prev) => {
        // Prevent duplicate tab ID insertion
        if (prev.some((t) => t.id === newTab.id || t.sessionId === newTab.sessionId)) {
          return prev;
        }
        return [...prev, newTab];
      });
      setActiveTabId(newTab.id);

      // Fetch git status in background asynchronously without blocking tab render
      TauriApi.getGitStatus(pty.cwd)
        .then((gitStatus) => {
          updateTab(newTabId, { gitStatus });
        })
        .catch(() => {});
    } catch (err) {
      console.error('Failed to create tab PTY:', err);
    }
  };

  const closeTab = async (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (!tabToClose) return;

    await TauriApi.closePty(tabToClose.sessionId);

    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);

    if (activeTabId === tabId) {
      if (nextTabs.length > 0) {
        setActiveTabId(nextTabs[nextTabs.length - 1].id);
      } else {
        createNewTab();
      }
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Context for AI
  const currentAiContext: TerminalContext = {
    os: systemInfo?.os || 'Linux',
    shell: activeTab?.title || systemInfo?.default_shell || '/bin/bash',
    cwd: activeTab?.cwd || '/home/user',
    git_branch: activeTab?.gitStatus.branch,
    recent_command: activeTab?.lastCommand,
    recent_output: activeTab?.lastOutput,
  };

  // Commands to PTY
  const handleInsertCommand = (command: string) => {
    if (activeTab) {
      TauriApi.writePty(activeTab.sessionId, command);
    }
  };

  const handleExecuteCommand = (command: string) => {
    if (activeTab) {
      TauriApi.writePty(activeTab.sessionId, `${command}\n`);
    }
  };

  const handleErrorDetected = (
    command: string,
    output: string,
    exitCode: number
  ) => {
    setErrorAlert({ command, output, exitCode });
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsAiCommandOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsEditorOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        createNewTab();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs]);

  const wallpaperUrl = React.useMemo(() => {
    const bgImage = config.terminal.background_image;
    if (!bgImage || bgImage === 'none') return null;
    if (bgImage === 'preset_cyberpunk') return waddleWallpaper;
    if (
      bgImage.startsWith('http://') ||
      bgImage.startsWith('https://') ||
      bgImage.startsWith('data:')
    ) {
      return bgImage;
    }
    try {
      return convertFileSrc(bgImage);
    } catch {
      return bgImage;
    }
  }, [config.terminal.background_image]);

  return (
    <div className="app-container">
      {/* Title Bar & Tabs */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onNewTab={createNewTab}
        onCloseTab={closeTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAiCommand={() => setIsAiCommandOpen(true)}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
        isEditorOpen={isEditorOpen}
        onToggleEditor={() => setIsEditorOpen(!isEditorOpen)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        <section className="terminal-area" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Wallpaper Layer */}
          {wallpaperUrl && (
            <div
              className="terminal-wallpaper-layer"
              style={{
                opacity: config.terminal.background_opacity ?? 0.85,
              }}
            >
              <img
                src={wallpaperUrl}
                alt=""
                decoding="async"
                loading="eager"
                style={{
                  position: 'absolute',
                  inset:
                    config.terminal.background_blur && config.terminal.background_blur > 0
                      ? '-20px'
                      : 0,
                  width:
                    config.terminal.background_blur && config.terminal.background_blur > 0
                      ? 'calc(100% + 40px)'
                      : '100%',
                  height:
                    config.terminal.background_blur && config.terminal.background_blur > 0
                      ? 'calc(100% + 40px)'
                      : '100%',
                  objectFit: 'cover',
                  filter:
                    config.terminal.background_blur && config.terminal.background_blur > 0
                      ? `blur(${Math.min(config.terminal.background_blur, 10)}px)`
                      : undefined,
                  transform: 'translate3d(0, 0, 0)',
                  willChange: config.terminal.background_blur && config.terminal.background_blur > 0 ? 'filter' : undefined,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            </div>
          )}

          {/* Dark Contrast Overlay for Terminal Text Readability */}
          {wallpaperUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: `rgba(10, 14, 22, ${Math.max(0.2, 1 - (config.terminal.background_opacity ?? 0.85))})`,
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          )}

          {/* Smart Error Banner */}
          {errorAlert && (
            <AiErrorBanner
              command={errorAlert.command}
              output={errorAlert.output}
              exitCode={errorAlert.exitCode}
              context={currentAiContext}
              onDismiss={() => setErrorAlert(null)}
              onInsertCommand={handleInsertCommand}
              onExecuteCommand={handleExecuteCommand}
            />
          )}

          {/* Terminal Tabs */}
          {tabs.map((tab) => (
            <ErrorBoundary key={tab.id} fallbackTitle="ターミナルの初期化でエラーが発生しました">
              <TerminalPane
                tab={tab}
                config={config}
                isActive={tab.id === activeTabId}
                onUpdateTab={updateTab}
                onErrorDetected={handleErrorDetected}
              />
            </ErrorBoundary>
          ))}
        </section>

        {/* Embedded Editor Panel */}
        <EditorPane
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          cwd={activeTab?.cwd || ''}
          config={config}
          context={currentAiContext}
          onExecuteInTerminal={handleExecuteCommand}
        />

        {/* AI Sidebar (Copilot) */}
        <AiSidebar
          isOpen={isAiSidebarOpen}
          onClose={() => setIsAiSidebarOpen(false)}
          context={currentAiContext}
          onInsertCommand={handleInsertCommand}
          onExecuteCommand={handleExecuteCommand}
        />
      </main>

      {/* Status Bar */}
      <StatusBar
        cwd={activeTab?.cwd || ''}
        gitStatus={
          activeTab?.gitStatus || {
            is_repo: false,
            modified_count: 0,
            untracked_count: 0,
          }
        }
        config={config}
        systemInfo={systemInfo}
        onOpenAiCommand={() => setIsAiCommandOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* AI Command Generator Modal (Ctrl+K) */}
      <AiCommandModal
        isOpen={isAiCommandOpen}
        onClose={() => setIsAiCommandOpen(false)}
        context={currentAiContext}
        onInsertCommand={handleInsertCommand}
        onExecuteCommand={handleExecuteCommand}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={handleUpdateConfig}
      />
    </div>
  );
}

export default App;
