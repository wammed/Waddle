import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { TerminalPane } from './components/TerminalPane';
import { StatusBar } from './components/StatusBar';
import { AiCommandModal } from './components/AiCommandModal';
import { AiErrorBanner } from './components/AiErrorBanner';
import { AiSidebar } from './components/AiSidebar';
import { EditorPane } from './components/EditorPane';
import { FileTreeSidebar } from './components/FileTreeSidebar';
import { GitQuickPopover } from './components/GitQuickPopover';
import { GitDiffModal } from './components/GitDiffModal';
import { SettingsModal } from './components/SettingsModal';
import { TestPlanModal } from './components/TestPlanModal';
import { SessionTimelineModal } from './components/SessionTimelineModal';
import { PipelineBuilderModal } from './components/PipelineBuilderModal';
import { RichPreviewModal } from './components/RichPreviewModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppConfig, SystemInfo, TerminalContext } from './types';
import { TauriApi } from './services/tauriApi';
import { THEMES, hexToRgbString } from './theme';
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
    background_image: 'preset_cyberpunk',
    background_opacity: 0.85,
    background_blur: 0,
  },
  git: {
    enabled: true,
    restrict_to_github: true,
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
    setConfig((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(newConfig)) {
        return prev;
      }
      return newConfig;
    });
    try {
      localStorage.setItem('waddle_config_cache', JSON.stringify(newConfig));
    } catch {}
  }, []);

  // Modals and panels
  const [isAiCommandOpen, setIsAiCommandOpen] = useState(false);
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestPlanOpen, setIsTestPlanOpen] = useState(false);
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);
  const [targetEditorFile, setTargetEditorFile] = useState<string | null>(null);

  // New Modals: Timeline, Pipeline Builder, Rich Preview
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isPipelineBuilderOpen, setIsPipelineBuilderOpen] = useState(false);
  const [richPreviewState, setRichPreviewState] = useState<{
    isOpen: boolean;
    filePath: string;
    fileName: string;
    content: string;
  }>({
    isOpen: false,
    filePath: '',
    fileName: '',
    content: '',
  });

  const openedFromSettingsRef = useRef(false);

  const handleCloseAiCommand = useCallback(() => setIsAiCommandOpen(false), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleCloseTestPlan = useCallback(() => {
    setIsTestPlanOpen(false);
    if (openedFromSettingsRef.current) {
      openedFromSettingsRef.current = false;
      setIsSettingsOpen(true);
    }
  }, []);
  const handleCloseTimeline = useCallback(() => setIsTimelineOpen(false), []);
  const handleClosePipelineBuilder = useCallback(() => setIsPipelineBuilderOpen(false), []);
  const handleCloseRichPreview = useCallback(() => setRichPreviewState((prev) => ({ ...prev, isOpen: false })), []);
  const handleOpenTestPlan = useCallback(() => {
    openedFromSettingsRef.current = true;
    setIsSettingsOpen(false);
    setIsTestPlanOpen(true);
  }, []);

  const handleRichPreview = useCallback(async (filePath: string, fileName: string, content?: string) => {
    let fileContent = content;
    if (fileContent === undefined) {
      try {
        fileContent = await TauriApi.readFile(filePath);
      } catch (e) {
        fileContent = `(ファイルの読み出しに失敗しました: ${e})`;
      }
    }
    setRichPreviewState({
      isOpen: true,
      filePath,
      fileName,
      content: fileContent,
    });
  }, []);

  // Git Popover and Diff Modal
  const [isGitPopoverOpen, setIsGitPopoverOpen] = useState(false);
  const [diffModalState, setDiffModalState] = useState<{
    isOpen: boolean;
    filePath: string;
    isStaged: boolean;
  }>({
    isOpen: false,
    filePath: '',
    isStaged: false,
  });

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
    handleSwapPanes,
    handleUpdateSplitRatios,
    handleRefreshAll,
  } = useTerminalTabs({ isFileTreeOpen });

  // Workspace reset key to reinitialize file tree and workspace state
  const [workspaceKey, setWorkspaceKey] = useState(0);

  // Full workspace refresh handler
  const handleFullWorkspaceRefresh = useCallback(async () => {
    // 1. Close open editor & reset target file
    setIsEditorOpen(false);
    setTargetEditorFile(null);

    // 2. Close AI command modal, AI sidebar, git popovers and diff modal
    setIsAiCommandOpen(false);
    setIsAiSidebarOpen(false);
    setIsGitPopoverOpen(false);
    setDiffModalState({
      isOpen: false,
      filePath: '',
      isStaged: false,
    });
    setErrorAlert(null);

    // 3. Increment workspaceKey to re-mount and reset FileTreeSidebar cache & state
    setWorkspaceKey((prev) => prev + 1);

    // 4. Run tabs/panes/pty reset
    await handleRefreshAll();
  }, [handleRefreshAll]);

  // Git status refresh handler
  const handleRefreshGitStatus = useCallback(async () => {
    if (config.git?.enabled === false) return;
    const targetPane = activePane || activeTab?.panes[0];
    const cwd = targetPane?.cwd || activeTab?.cwd;
    if (!cwd || !targetPane || !activeTabId) return;
    try {
      const gitStatus = await TauriApi.getGitStatus(cwd);
      updatePane(activeTabId, targetPane.id, { gitStatus });
    } catch {
      // ignore
    }
  }, [activePane, activeTab, activeTabId, updatePane, config.git?.enabled]);

  // Global Keyboard Shortcuts hook
  useGlobalShortcuts({
    activeTab,
    activePane,
    activeTabId,
    handleClosePane,
    handleApplyLayout,
    handleDirectionalFocus,
    handleSwapPanes,
    handleToggleZoomPane,
    createNewTab,
    closeTab,
    setIsAiCommandOpen,
    setIsEditorOpen,
    setIsFileTreeOpen,
    setIsSettingsOpen,
    setIsTimelineOpen,
    setIsPipelineBuilderOpen,
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

    // Synchronize dynamic RGB and active accents for intense neon aura across the whole window
    const rgb = activeTheme.accentRgb || hexToRgbString(activeTheme.ui.accent);
    root.style.setProperty('--accent-rgb', rgb);
    root.style.setProperty('--border-active', `rgba(${rgb}, 0.5)`);
    root.style.setProperty('--accent-blue', activeTheme.ui.accent);
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
    language: config.general?.language || 'en-US',
  };

  // Commands to PTY
  const handleInsertCommand = (command: string) => {
    const targetSessionId = activePane?.sessionId || activeTab?.sessionId;
    if (targetSessionId) {
      TauriApi.writePty(targetSessionId, command);
    }
  };

  const handleExecuteCommand = (command: string, confirmed?: boolean) => {
    const targetSessionId = activePane?.sessionId || activeTab?.sessionId;
    if (targetSessionId) {
      TauriApi.writePty(targetSessionId, `${command}\n`, confirmed).catch((err) => {
        console.error('PTY command execution error:', err);
      });
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
          onRefreshAll={handleFullWorkspaceRefresh}
          onOpenTimeline={() => setIsTimelineOpen(true)}
          onOpenPipelineBuilder={() => setIsPipelineBuilderOpen(true)}
          isEditorOpen={isEditorOpen}
          isAiSidebarOpen={isAiSidebarOpen}
          isFileTreeOpen={isFileTreeOpen}
        />

        {/* Main Workspace */}
        <main className="main-content">
          {/* Left File Tree Sidebar */}
          <FileTreeSidebar
            key={workspaceKey}
            isOpen={isFileTreeOpen}
            onClose={() => setIsFileTreeOpen(false)}
            cwd={activePane?.cwd || activeTab?.cwd || '/'}
            gitStatus={
              config.git?.enabled !== false
                ? activePane?.gitStatus || activeTab?.gitStatus
                : undefined
            }
            onOpenFile={(filePath) => {
              setTargetEditorFile(filePath);
              setIsEditorOpen(true);
            }}
            onInsertToTerminal={handleInsertCommand}
            onOpenDiff={(filePath, isStaged) => {
              setDiffModalState({ isOpen: true, filePath, isStaged });
            }}
            onRichPreview={(filePath, fileName) => handleRichPreview(filePath, fileName)}
          />

          {/* Central Terminal / Editor Area */}
          <section className="terminal-area" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Wallpaper Layer */}
            {wallpaperUrl && (
              <div
                className="terminal-wallpaper-layer"
                style={{
                  opacity: `var(--live-wallpaper-opacity, ${config.terminal.background_opacity ?? 0.85})`,
                }}
              >
                <img
                  src={wallpaperUrl}
                  alt=""
                  decoding="async"
                  loading="eager"
                  style={{
                    position: 'absolute',
                    inset: '-20px',
                    width: 'calc(100% + 40px)',
                    height: 'calc(100% + 40px)',
                    objectFit: 'cover',
                    filter: `blur(var(--live-wallpaper-blur, ${Math.min(config.terminal.background_blur ?? 0, 10)}px))`,
                    transform: 'translate3d(0, 0, 0)',
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
                  backgroundColor: `rgba(10, 14, 22, var(--live-wallpaper-contrast-opacity, ${Math.max(
                    0.2,
                    1 - (config.terminal.background_opacity ?? 0.85)
                  )}))`,
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
                autoAnalyze={config.terminal.watchdog_auto_analyze !== false}
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
                  onUpdateSplitRatios={handleUpdateSplitRatios}
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
            onRichPreview={handleRichPreview}
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
        onToggleGitPopover={() => setIsGitPopoverOpen((prev) => !prev)}
        isGitPopoverOpen={isGitPopoverOpen}
        isAiActive={isAiCommandOpen || isAiSidebarOpen}
      />

      {/* Git Quick Popover */}
      {isGitPopoverOpen && config.git?.enabled !== false && (
        <GitQuickPopover
          isOpen={isGitPopoverOpen}
          onClose={() => setIsGitPopoverOpen(false)}
          repoPath={activePane?.cwd || activeTab?.cwd || ''}
          gitStatus={
            activePane?.gitStatus ||
            activeTab?.gitStatus || {
              is_repo: false,
              modified_count: 0,
              untracked_count: 0,
            }
          }
          onRefreshGit={handleRefreshGitStatus}
          onOpenDiff={(filePath, isStaged) => {
            setDiffModalState({ isOpen: true, filePath, isStaged });
          }}
        />
      )}

      {/* Git Diff Modal */}
      {diffModalState.isOpen && (
        <GitDiffModal
          isOpen={diffModalState.isOpen}
          onClose={() =>
            setDiffModalState({ isOpen: false, filePath: '', isStaged: false })
          }
          repoPath={activePane?.cwd || activeTab?.cwd || ''}
          filePath={diffModalState.filePath}
          isStaged={diffModalState.isStaged}
          onFileChanged={handleRefreshGitStatus}
        />
      )}

      {/* AI Command Generator Modal (Ctrl+K) */}
      {isAiCommandOpen && (
        <AiCommandModal
          isOpen={isAiCommandOpen}
          onClose={handleCloseAiCommand}
          context={currentAiContext}
          onInsertCommand={handleInsertCommand}
          onExecuteCommand={handleExecuteCommand}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={handleCloseSettings}
          config={config}
          onSaveConfig={handleUpdateConfig}
          onOpenTestPlan={handleOpenTestPlan}
        />
      )}

      {/* Test Verification Form Modal */}
      {isTestPlanOpen && (
        <TestPlanModal
          isOpen={isTestPlanOpen}
          onClose={handleCloseTestPlan}
        />
      )}

      {/* Session Command Timeline Modal (Ctrl+Shift+H) */}
      {isTimelineOpen && (
        <SessionTimelineModal
          isOpen={isTimelineOpen}
          onClose={handleCloseTimeline}
          onRunCommand={handleExecuteCommand}
          theme={config.terminal.theme}
        />
      )}

      {/* Visual Pipeline Builder Modal (Ctrl+Shift+P) */}
      {isPipelineBuilderOpen && (
        <PipelineBuilderModal
          isOpen={isPipelineBuilderOpen}
          onClose={handleClosePipelineBuilder}
          onExecute={handleExecuteCommand}
        />
      )}

      {/* Rich Preview Modal (Markdown / CSV / JSON) */}
      {richPreviewState.isOpen && (
        <RichPreviewModal
          isOpen={richPreviewState.isOpen}
          onClose={handleCloseRichPreview}
          filePath={richPreviewState.filePath}
          fileName={richPreviewState.fileName}
          content={richPreviewState.content}
        />
      )}
      </div>
    </I18nProvider>
  );
}

export default App;
