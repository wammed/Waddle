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
import { AppConfig, PaneLayout, SystemInfo, TerminalContext, TerminalPaneInfo, TerminalTab } from './types';
import { TauriApi } from './services/tauriApi';
import { THEMES } from './theme';
import { convertFileSrc } from '@tauri-apps/api/core';
import waddleWallpaper from './assets/waddle-wallpaper.png';
import { I18nProvider } from './i18n';

const generateTabId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `tab-${crypto.randomUUID()}`;
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

const generatePaneId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pane-${crypto.randomUUID()}`;
  }
  return `pane-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

const getRequiredPaneCount = (layout: PaneLayout): number => {
  if (layout === 'single') return 1;
  if (layout.startsWith('split-2-')) return 2;
  if (layout.startsWith('split-3-')) return 3;
  if (layout.startsWith('split-4-') || layout === 'grid-4') return 4;
  return 1;
};

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
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);
  const [targetEditorFile, setTargetEditorFile] = useState<string | null>(null);

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

  const updatePane = useCallback(
    (tabId: string, paneId: string, updates: Partial<TerminalPaneInfo>) => {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.id !== tabId) return tab;
          const newPanes = tab.panes.map((pane) =>
            pane.id === paneId ? { ...pane, ...updates } : pane
          );
          const isCurrentActive = (tab.activePaneId || tab.panes[0]?.id) === paneId;
          if (isCurrentActive) {
            const updatedPane = newPanes.find((p) => p.id === paneId);
            return {
              ...tab,
              panes: newPanes,
              title: updatedPane?.title ?? tab.title,
              cwd: updatedPane?.cwd ?? tab.cwd,
              gitStatus: updatedPane?.gitStatus ?? tab.gitStatus,
              lastCommand: updatedPane?.lastCommand ?? tab.lastCommand,
              lastExitCode: updatedPane?.lastExitCode ?? tab.lastExitCode,
              lastOutput: updatedPane?.lastOutput ?? tab.lastOutput,
            };
          }
          return {
            ...tab,
            panes: newPanes,
          };
        })
      );
    },
    []
  );

  const handleSelectPane = useCallback((tabId: string, paneId: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        const targetPane = tab.panes.find((p) => p.id === paneId);
        if (!targetPane) return tab;
        return {
          ...tab,
          activePaneId: paneId,
          title: targetPane.title,
          sessionId: targetPane.sessionId,
          cwd: targetPane.cwd,
          gitStatus: targetPane.gitStatus,
          lastCommand: targetPane.lastCommand,
          lastExitCode: targetPane.lastExitCode,
          lastOutput: targetPane.lastOutput,
        };
      })
    );
  }, []);

  const handleToggleZoomPane = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== tabId) return tab;
        return {
          ...tab,
          isZoomed: !tab.isZoomed,
        };
      })
    );
  }, []);

  const createNewTab = async () => {
    try {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1700;
      const h = typeof window !== 'undefined' ? window.innerHeight : 1440;
      const sidebarOffset = isFileTreeOpen ? 260 : 0;
      const initialCols = Math.max(80, Math.floor((w - 24 - sidebarOffset) / 9.2));
      const initialRows = Math.max(24, Math.floor((h - 80) / 17.5));
      const pty = await TauriApi.createPty(initialRows, initialCols);
      const newTabId = generateTabId();
      const newPaneId = generatePaneId();
      const initialPane: TerminalPaneInfo = {
        id: newPaneId,
        sessionId: pty.id,
        cwd: pty.cwd,
        title: 'bash',
        gitStatus: {
          is_repo: false,
          modified_count: 0,
          untracked_count: 0,
        },
      };

      const newTab: TerminalTab = {
        id: newTabId,
        title: 'bash',
        layout: 'single',
        panes: [initialPane],
        activePaneId: newPaneId,
        isZoomed: false,
        sessionId: pty.id,
        cwd: pty.cwd,
        gitStatus: {
          is_repo: false,
          modified_count: 0,
          untracked_count: 0,
        },
      };

      setTabs((prev) => {
        if (prev.some((t) => t.id === newTab.id || t.sessionId === newTab.sessionId)) {
          return prev;
        }
        return [...prev, newTab];
      });
      setActiveTabId(newTab.id);

      TauriApi.getGitStatus(pty.cwd)
        .then((gitStatus) => {
          updatePane(newTabId, newPaneId, { gitStatus });
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

    if (tabToClose.panes && tabToClose.panes.length > 0) {
      await Promise.all(
        tabToClose.panes.map((p) => TauriApi.closePty(p.sessionId).catch(() => {}))
      );
    } else if (tabToClose.sessionId) {
      await TauriApi.closePty(tabToClose.sessionId).catch(() => {});
    }

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

  const handleClosePane = useCallback(
    async (tabId: string, paneId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) return;

      if (tab.panes.length <= 1) {
        await closeTab(tabId);
        return;
      }

      const paneToClose = tab.panes.find((p) => p.id === paneId);
      if (paneToClose) {
        await TauriApi.closePty(paneToClose.sessionId).catch(() => {});
      }

      const remainingPanes = tab.panes.filter((p) => p.id !== paneId);
      let newActiveId = tab.activePaneId;
      if (newActiveId === paneId) {
        newActiveId = remainingPanes[0]?.id || '';
      }
      const newActivePane =
        remainingPanes.find((p) => p.id === newActiveId) || remainingPanes[0];

      let nextLayout: PaneLayout = 'single';
      if (remainingPanes.length === 2) {
        nextLayout =
          tab.layout === 'split-2-v' || tab.layout === 'split-3-v'
            ? 'split-2-v'
            : 'split-2-h';
      } else if (remainingPanes.length === 3) {
        nextLayout = 'split-3-left-main';
      }

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          return {
            ...t,
            layout: nextLayout,
            panes: remainingPanes,
            activePaneId: newActiveId,
            isZoomed: false,
            sessionId: newActivePane.sessionId,
            cwd: newActivePane.cwd,
            title: newActivePane.title,
            gitStatus: newActivePane.gitStatus,
            lastCommand: newActivePane.lastCommand,
            lastExitCode: newActivePane.lastExitCode,
            lastOutput: newActivePane.lastOutput,
          };
        })
      );
    },
    [tabs, closeTab]
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activePane: TerminalPaneInfo | undefined =
    activeTab?.panes?.find((p) => p.id === activeTab.activePaneId) ||
    activeTab?.panes?.[0];

  const handleApplyLayout = useCallback(
    async (newLayout: PaneLayout) => {
      if (!activeTab) return;
      const targetCount = getRequiredPaneCount(newLayout);
      const currentPanes = activeTab.panes || [];
      const currentCount = currentPanes.length;

      if (currentCount === targetCount) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id ? { ...t, layout: newLayout, isZoomed: false } : t
          )
        );
        return;
      }

      if (currentCount < targetCount) {
        const needed = targetCount - currentCount;
        const spawnCwd = activePane?.cwd || activeTab.cwd;
        const w = typeof window !== 'undefined' ? window.innerWidth : 1700;
        const h = typeof window !== 'undefined' ? window.innerHeight : 1440;
        const sidebarOffset = isFileTreeOpen ? 260 : 0;
        const initialCols = Math.max(
          40,
          Math.floor((w - 24 - sidebarOffset) / (targetCount <= 2 ? 18 : 24))
        );
        const initialRows = Math.max(
          12,
          Math.floor((h - 80) / (targetCount > 2 ? 35 : 18))
        );

        const newPanes: TerminalPaneInfo[] = [];
        for (let i = 0; i < needed; i++) {
          try {
            const pty = await TauriApi.createPty(initialRows, initialCols, spawnCwd);
            const newPane: TerminalPaneInfo = {
              id: generatePaneId(),
              sessionId: pty.id,
              cwd: pty.cwd,
              title: 'bash',
              gitStatus: {
                is_repo: false,
                modified_count: 0,
                untracked_count: 0,
              },
            };
            newPanes.push(newPane);
          } catch (err) {
            console.error('Failed to create split pane PTY:', err);
          }
        }

        const mergedPanes = [...currentPanes, ...newPanes];
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  layout: newLayout,
                  panes: mergedPanes,
                  isZoomed: false,
                }
              : t
          )
        );
      } else {
        let retainedPanes: TerminalPaneInfo[] = [];
        const activeIdx = currentPanes.findIndex(
          (p) => p.id === activeTab.activePaneId
        );
        if (activeIdx >= 0 && activeIdx < targetCount) {
          retainedPanes = currentPanes.slice(0, targetCount);
        } else if (activeIdx >= targetCount && activePane) {
          retainedPanes = [...currentPanes.slice(0, targetCount - 1), activePane];
        } else {
          retainedPanes = currentPanes.slice(0, targetCount);
        }

        const retainedIds = new Set(retainedPanes.map((p) => p.id));
        const panesToClose = currentPanes.filter((p) => !retainedIds.has(p.id));

        await Promise.all(
          panesToClose.map((p) => TauriApi.closePty(p.sessionId).catch(() => {}))
        );

        const nextActivePane =
          retainedPanes.find((p) => p.id === activeTab.activePaneId) ||
          retainedPanes[0];

        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTab.id
              ? {
                  ...t,
                  layout: newLayout,
                  panes: retainedPanes,
                  activePaneId: nextActivePane.id,
                  sessionId: nextActivePane.sessionId,
                  cwd: nextActivePane.cwd,
                  title: nextActivePane.title,
                  gitStatus: nextActivePane.gitStatus,
                  lastCommand: nextActivePane.lastCommand,
                  lastExitCode: nextActivePane.lastExitCode,
                  lastOutput: nextActivePane.lastOutput,
                  isZoomed: false,
                }
              : t
          )
        );
      }
    },
    [activeTab, activePane, isFileTreeOpen]
  );

  const handleDirectionalFocus = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (!activeTab || !activeTab.panes || activeTab.panes.length <= 1) return;
      const panes = activeTab.panes;
      const currentIndex = panes.findIndex((p) => p.id === activeTab.activePaneId);
      if (currentIndex === -1) return;

      let targetIndex = currentIndex;
      const count = panes.length;
      const layout = activeTab.layout;

      if (count === 2) {
        if (layout === 'split-2-v') {
          if (direction === 'up') targetIndex = 0;
          if (direction === 'down') targetIndex = 1;
        } else {
          if (direction === 'left') targetIndex = 0;
          if (direction === 'right') targetIndex = 1;
        }
      } else if (count === 3) {
        if (layout === 'split-3-left-main') {
          if (currentIndex === 0 && direction === 'right') targetIndex = 1;
          else if (currentIndex === 1) {
            if (direction === 'left') targetIndex = 0;
            else if (direction === 'down') targetIndex = 2;
          } else if (currentIndex === 2) {
            if (direction === 'left') targetIndex = 0;
            else if (direction === 'up') targetIndex = 1;
          }
        } else if (layout === 'split-3-top-main') {
          if (currentIndex === 0 && direction === 'down') targetIndex = 1;
          else if (currentIndex === 1) {
            if (direction === 'up') targetIndex = 0;
            else if (direction === 'right') targetIndex = 2;
          } else if (currentIndex === 2) {
            if (direction === 'up') targetIndex = 0;
            else if (direction === 'left') targetIndex = 1;
          }
        } else if (layout === 'split-3-h') {
          if (direction === 'left') targetIndex = Math.max(0, currentIndex - 1);
          if (direction === 'right') targetIndex = Math.min(2, currentIndex + 1);
        } else if (layout === 'split-3-v') {
          if (direction === 'up') targetIndex = Math.max(0, currentIndex - 1);
          if (direction === 'down') targetIndex = Math.min(2, currentIndex + 1);
        }
      } else if (count === 4) {
        if (layout === 'grid-4') {
          if (direction === 'left') targetIndex = currentIndex % 2 === 1 ? currentIndex - 1 : currentIndex;
          else if (direction === 'right') targetIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex;
          else if (direction === 'up') targetIndex = currentIndex >= 2 ? currentIndex - 2 : currentIndex;
          else if (direction === 'down') targetIndex = currentIndex < 2 ? currentIndex + 2 : currentIndex;
        } else if (layout === 'split-4-h') {
          if (direction === 'left') targetIndex = Math.max(0, currentIndex - 1);
          if (direction === 'right') targetIndex = Math.min(3, currentIndex + 1);
        } else if (layout === 'split-4-left-main') {
          if (currentIndex === 0 && direction === 'right') targetIndex = 1;
          else if (currentIndex > 0) {
            if (direction === 'left') targetIndex = 0;
            else if (direction === 'up') targetIndex = Math.max(1, currentIndex - 1);
            else if (direction === 'down') targetIndex = Math.min(3, currentIndex + 1);
          }
        }
      }

      if (targetIndex !== currentIndex && panes[targetIndex]) {
        handleSelectPane(activeTab.id, panes[targetIndex].id);
      }
    },
    [activeTab, handleSelectPane]
  );

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+W: Close current pane
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'W') {
        e.preventDefault();
        if (activeTab && activePane) {
          handleClosePane(activeTab.id, activePane.id);
        }
        return;
      }

      // Alt+1: Single Layout
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        handleApplyLayout('single');
        return;
      }
      // Alt+2: 2-split horizontal
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        handleApplyLayout('split-2-h');
        return;
      }
      // Alt+3: 3-split left-main
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        handleApplyLayout('split-3-left-main');
        return;
      }
      // Alt+4: 4-split grid
      if (e.altKey && e.key === '4') {
        e.preventDefault();
        handleApplyLayout('grid-4');
        return;
      }

      // Alt+Arrows: Directional pane focus
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        handleDirectionalFocus('up');
        return;
      }
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        handleDirectionalFocus('down');
        return;
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleDirectionalFocus('left');
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleDirectionalFocus('right');
        return;
      }

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
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsFileTreeOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, activeTab, activePane, handleApplyLayout, handleClosePane, handleDirectionalFocus]);

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
    try {
      return convertFileSrc(bgImage);
    } catch {
      return bgImage;
    }
  }, [config.terminal.background_image]);

  return (
    <I18nProvider language={config.general?.language || 'en-US'}>
      <div className="app-container">
      {/* Title Bar & Tabs */}
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        currentLayout={activeTab?.layout || 'single'}
        onSelectTab={setActiveTabId}
        onNewTab={createNewTab}
        onCloseTab={closeTab}
        onSelectLayout={handleApplyLayout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAiCommand={() => setIsAiCommandOpen(true)}
        isAiSidebarOpen={isAiSidebarOpen}
        onToggleAiSidebar={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
        isEditorOpen={isEditorOpen}
        onToggleEditor={() => setIsEditorOpen(!isEditorOpen)}
        isFileTreeOpen={isFileTreeOpen}
        onToggleFileTree={() => setIsFileTreeOpen(!isFileTreeOpen)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Left Sidebar: File Tree Explorer */}
        <FileTreeSidebar
          isOpen={isFileTreeOpen}
          onClose={() => setIsFileTreeOpen(false)}
          cwd={activePane?.cwd || activeTab?.cwd || ''}
          onOpenFile={(filePath) => {
            setTargetEditorFile(filePath);
            setIsEditorOpen(true);
          }}
          onInsertToTerminal={handleInsertCommand}
        />

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
            <ErrorBoundary key={tab.id}>
              <TerminalPane
                tab={tab}
                config={config}
                isActive={tab.id === activeTabId}
                onSelectPane={(tabId, paneId) => handleSelectPane(tabId, paneId)}
                onClosePane={(tabId, paneId) => handleClosePane(tabId, paneId)}
                onToggleZoomPane={(tabId) => handleToggleZoomPane(tabId)}
                onUpdatePane={(tabId, paneId, updates) => updatePane(tabId, paneId, updates)}
                onErrorDetected={handleErrorDetected}
              />
            </ErrorBoundary>
          ))}
        </section>

        {/* Embedded Editor Panel */}
        <EditorPane
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setTargetEditorFile(null);
          }}
          cwd={activePane?.cwd || activeTab?.cwd || ''}
          config={config}
          context={currentAiContext}
          onExecuteInTerminal={handleExecuteCommand}
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
