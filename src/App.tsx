import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { TerminalPane } from './components/TerminalPane';
import { StatusBar } from './components/StatusBar';
import { AiCommandModal } from './components/AiCommandModal';
import { AiErrorBanner } from './components/AiErrorBanner';
import { AiSidebar } from './components/AiSidebar';
import { EditorPane } from './components/EditorPane';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { SettingsModal } from './components/SettingsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppConfig, SystemInfo, TerminalContext } from './types';
import { TauriApi } from './services/tauriApi';
import { THEMES } from './theme';
import { convertFileSrc } from '@tauri-apps/api/core';
import waddleWallpaper from './assets/waddle-wallpaper.png';
import { I18nProvider } from './i18n';
import { useTerminalTabs } from './hooks/useTerminalTabs';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

const DEFAULT_CONFIG: AppConfig = {
  general: {
    language: 'en-US',
  },
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
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);
  const [targetEditorFile, setTargetEditorFile] = useState<string | null>(null);

  // Active error alert
  const [errorAlert, setErrorAlert] = useState<{
    command: string;
    output: string;
    exitCode: number;
  } | null>(null);

  const isConfigInitRef = useRef(false);

  // Terminal tabs management hook
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    activePane,
    createNewTab,
    closeTab,
    updatePane,
    handleSelectPane,
    handleClosePane,
    handleToggleZoomPane,
    handleApplyLayout,
    handleDirectionalFocus,
  } = useTerminalTabs({ isFileTreeOpen });

  // Global Keyboard Shortcuts hook
  useGlobalShortcuts({
    activeTab,
    activePane,
    activeTabId,
    handleClosePane,
    handleApplyLayout,
    handleDirectionalFocus,
    createNewTab,
    closeTab,
    setIsAiCommandOpen,
    setIsEditorOpen,
    setIsFileTreeOpen,
    setIsSettingsOpen,
  });

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

  // Initial load for config and system info
  useEffect(() => {
    if (isConfigInitRef.current) return;
    isConfigInitRef.current = true;

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

  // Context for AI
  const currentAiContext: TerminalContext = {
    os: systemInfo?.os || 'Linux',
    shell: activePane?.title || activeTab?.title || systemInfo?.default_shell || '/bin/bash',
    cwd: activePane?.cwd || activeTab?.cwd || '/home/user',
    git_branch: activePane?.gitStatus.branch || activeTab?.gitStatus.branch,
    recent_command: activePane?.lastCommand || activeTab?.lastCommand,
    recent_output: activePane?.lastOutput || activeTab?.lastOutput,
  };

  // Commands to PTY
  const handleInsertCommand = (command: string) => {
    const targetSessionId = activePane?.sessionId || activeTab?.sessionId;
    if (targetSessionId) {
      TauriApi.writePty(targetSessionId, command);
    }
  };

  const handleExecuteCommand = (command: string) => {
    const targetSessionId = activePane?.sessionId || activeTab?.sessionId;
    if (targetSessionId) {
      TauriApi.writePty(targetSessionId, `${command}\n`);
    }
  };

  const handleErrorDetected = (
    command: string,
    output: string,
    exitCode: number
  ) => {
    setErrorAlert({ command, output, exitCode });
  };

  const wallpaperUrl = React.useMemo(() => {
    const bgImage = config.terminal.background_image;
    if (!bgImage || bgImage === 'none') return null;
    if (bgImage === 'preset_cyberpunk' || bgImage === 'preset_official') return waddleWallpaper;
    if (
      bgImage.startsWith('http://') ||
      bgImage.startsWith('https://') ||
      bgImage.startsWith('data:')
    ) {
      return bgImage;
    }
    // Local filesystem path: convert via Tauri asset protocol
    try {
      return convertFileSrc(bgImage);
    } catch {
      return bgImage;
    }
  }, [config.terminal.background_image]);

  return (
    <I18nProvider language={config.general?.language || 'en-US'}>
      <div className="app-container">
        {/* Top Titlebar / Tab Bar */}
        <TitleBar
          tabs={tabs}
          activeTabId={activeTabId}
          currentLayout={activeTab?.layout || 'single'}
          onSelectTab={setActiveTabId}
          onCloseTab={closeTab}
          onNewTab={createNewTab}
          onSelectLayout={handleApplyLayout}
          onOpenAiCommand={() => setIsAiCommandOpen(true)}
          onToggleEditor={() => setIsEditorOpen((prev) => !prev)}
          onToggleAiSidebar={() => setIsAiSidebarOpen((prev) => !prev)}
          onToggleFileTree={() => setIsFileTreeOpen((prev) => !prev)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isEditorOpen={isEditorOpen}
          isAiSidebarOpen={isAiSidebarOpen}
          isFileTreeOpen={isFileTreeOpen}
        />

        {/* Main Workspace */}
        <main className="main-content">
          {/* Left File Tree Sidebar */}
          <FileTreeSidebar
            isOpen={isFileTreeOpen}
            onClose={() => setIsFileTreeOpen(false)}
            cwd={activePane?.cwd || activeTab?.cwd || '/'}
            onOpenFile={(filePath) => {
              setTargetEditorFile(filePath);
              setIsEditorOpen(true);
            }}
            onInsertToTerminal={handleInsertCommand}
          />

          {/* Central Terminal / Editor Area */}
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
                    willChange:
                      config.terminal.background_blur && config.terminal.background_blur > 0
                        ? 'filter'
                        : undefined,
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
                  backgroundColor: `rgba(10, 14, 22, ${Math.max(
                    0.2,
                    1 - (config.terminal.background_opacity ?? 0.85)
                  )})`,
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />
            )}

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

            {tabs.map((tab) => (
              <ErrorBoundary key={tab.id}>
                <TerminalPane
                  tab={tab}
                  config={config}
                  isActive={tab.id === activeTabId}
                  onSelectPane={handleSelectPane}
                  onClosePane={handleClosePane}
                  onToggleZoomPane={handleToggleZoomPane}
                  onUpdatePane={updatePane}
                  onErrorDetected={handleErrorDetected}
                />
              </ErrorBoundary>
            ))}
          </section>

          {/* Floating / Embedded Text Editor Pane */}
          <EditorPane
            isOpen={isEditorOpen}
            onClose={() => {
              setIsEditorOpen(false);
              setTargetEditorFile(null);
            }}
            cwd={activePane?.cwd || activeTab?.cwd || '/'}
            config={config}
            context={currentAiContext}
            onExecuteInTerminal={handleExecuteCommand}
            onInsertInTerminal={handleInsertCommand}
            targetFilePath={targetEditorFile}
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
        cwd={activePane?.cwd || activeTab?.cwd || ''}
        gitStatus={
          activePane?.gitStatus ||
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
    </I18nProvider>
  );
}

export default App;
