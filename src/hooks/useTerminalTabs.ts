import { useState, useEffect, useCallback, useRef } from 'react';
import { PaneLayout, SavedSessionState, TerminalPaneInfo, TerminalTab } from '../types';
import { TauriApi } from '../services/tauriApi';

const SESSION_STORAGE_KEY = 'waddle_session_state';

export const generateTabId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `tab-${crypto.randomUUID()}`;
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

export const generatePaneId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pane-${crypto.randomUUID()}`;
  }
  return `pane-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
};

export const getRequiredPaneCount = (layout: PaneLayout): number => {
  if (layout === 'single') return 1;
  if (layout.startsWith('split-2-')) return 2;
  if (layout.startsWith('split-3-')) return 3;
  if (layout.startsWith('split-4-') || layout === 'grid-4') return 4;
  return 1;
};

interface UseTerminalTabsOptions {
  isFileTreeOpen: boolean;
}

export function useTerminalTabs({ isFileTreeOpen }: UseTerminalTabsOptions) {
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const isInitializedRef = useRef(false);
  const isRestoredRef = useRef(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activePane: TerminalPaneInfo | undefined =
    activeTab?.panes?.find((p) => p.id === activeTab.activePaneId) ||
    activeTab?.panes?.[0];

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

  const createNewTab = useCallback(async () => {
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
  }, [isFileTreeOpen, updatePane]);

  const closeTab = useCallback(
    async (tabId: string, e?: React.MouseEvent) => {
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
    },
    [tabs, activeTabId, createNewTab]
  );

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
          if (direction === 'left') targetIndex = 0;
          if (direction === 'right') targetIndex = currentIndex === 0 ? 1 : currentIndex;
          if (direction === 'up' && currentIndex === 2) targetIndex = 1;
          if (direction === 'down' && currentIndex === 1) targetIndex = 2;
        } else if (layout === 'split-3-top-main') {
          if (direction === 'up') targetIndex = 0;
          if (direction === 'down') targetIndex = currentIndex === 0 ? 1 : currentIndex;
          if (direction === 'left' && currentIndex === 2) targetIndex = 1;
          if (direction === 'right' && currentIndex === 1) targetIndex = 2;
        } else if (layout === 'split-3-h') {
          if (direction === 'left') targetIndex = Math.max(0, currentIndex - 1);
          if (direction === 'right') targetIndex = Math.min(2, currentIndex + 1);
        } else if (layout === 'split-3-v') {
          if (direction === 'up') targetIndex = Math.max(0, currentIndex - 1);
          if (direction === 'down') targetIndex = Math.min(2, currentIndex + 1);
        }
      } else if (count === 4) {
        if (layout === 'grid-4') {
          if (direction === 'up') targetIndex = currentIndex >= 2 ? currentIndex - 2 : currentIndex;
          if (direction === 'down') targetIndex = currentIndex <= 1 ? currentIndex + 2 : currentIndex;
          if (direction === 'left') targetIndex = currentIndex % 2 === 1 ? currentIndex - 1 : currentIndex;
          if (direction === 'right') targetIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex;
        } else if (layout === 'split-4-left-main') {
          if (direction === 'left') targetIndex = 0;
          if (direction === 'right') targetIndex = currentIndex === 0 ? 1 : currentIndex;
          if (direction === 'up' && currentIndex > 1) targetIndex = currentIndex - 1;
          if (direction === 'down' && currentIndex >= 1 && currentIndex < 3) targetIndex = currentIndex + 1;
        } else if (layout === 'split-4-h') {
          if (direction === 'left') targetIndex = Math.max(0, currentIndex - 1);
          if (direction === 'right') targetIndex = Math.min(3, currentIndex + 1);
        }
      }

      if (targetIndex !== currentIndex && panes[targetIndex]) {
        handleSelectPane(activeTab.id, panes[targetIndex].id);
      }
    },
    [activeTab, handleSelectPane]
  );

  const handleSwapPanes = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId || !t.panes || t.panes.length <= 1) return t;
        const currentIdx = t.panes.findIndex((p) => p.id === t.activePaneId);
        if (currentIdx === -1) return t;
        const nextIdx = (currentIdx + 1) % t.panes.length;
        const newPanes = [...t.panes];
        const temp = newPanes[currentIdx];
        newPanes[currentIdx] = newPanes[nextIdx];
        newPanes[nextIdx] = temp;
        return {
          ...t,
          panes: newPanes,
        };
      })
    );
  }, []);

  const handleUpdateSplitRatios = useCallback(
    (tabId: string, splitRatios: Record<string, number>) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, splitRatios } : t))
      );
    },
    []
  );

  // Restore session from localStorage or create initial tab
  const restoreOrCreateTabs = useCallback(async () => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1700;
    const h = typeof window !== 'undefined' ? window.innerHeight : 1440;
    const sidebarOffset = isFileTreeOpen ? 260 : 0;
    const initialCols = Math.max(80, Math.floor((w - 24 - sidebarOffset) / 9.2));
    const initialRows = Math.max(24, Math.floor((h - 80) / 17.5));

    try {
      const savedRaw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedRaw) {
        const parsed: SavedSessionState = JSON.parse(savedRaw);
        if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
          const restoredTabs: TerminalTab[] = [];
          for (const savedTab of parsed.tabs) {
            const restoredPanes: TerminalPaneInfo[] = [];
            for (const savedPane of savedTab.panes) {
              try {
                const pty = await TauriApi.createPty(
                  initialRows,
                  initialCols,
                  savedPane.cwd
                );
                restoredPanes.push({
                  id: savedPane.id || generatePaneId(),
                  sessionId: pty.id,
                  cwd: pty.cwd,
                  title: savedPane.title || 'bash',
                  gitStatus: {
                    is_repo: false,
                    modified_count: 0,
                    untracked_count: 0,
                  },
                });
              } catch (e) {
                console.error('Failed to restore pane PTY:', e);
              }
            }

            if (restoredPanes.length > 0) {
              const activeP =
                restoredPanes.find((p) => p.id === savedTab.activePaneId) ||
                restoredPanes[0];
              restoredTabs.push({
                id: savedTab.id || generateTabId(),
                title: activeP.title,
                layout: savedTab.layout || 'single',
                panes: restoredPanes,
                activePaneId: activeP.id,
                isZoomed: false,
                sessionId: activeP.sessionId,
                cwd: activeP.cwd,
                splitRatios: savedTab.splitRatios,
                gitStatus: {
                  is_repo: false,
                  modified_count: 0,
                  untracked_count: 0,
                },
              });
            }
          }

          if (restoredTabs.length > 0) {
            setTabs(restoredTabs);
            const activeId =
              restoredTabs.find((t) => t.id === parsed.activeTabId)?.id ||
              restoredTabs[0].id;
            setActiveTabId(activeId);
            isRestoredRef.current = true;
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to restore session from localStorage:', err);
    }

    // Default fallback: create new tab
    await createNewTab();
    isRestoredRef.current = true;
  }, [createNewTab, isFileTreeOpen]);

  // Save session state to localStorage
  useEffect(() => {
    if (!isRestoredRef.current || tabs.length === 0) return;
    try {
      const sessionData: SavedSessionState = {
        version: 1,
        activeTabId,
        tabs: tabs.map((t) => ({
          id: t.id,
          title: t.title,
          layout: t.layout,
          activePaneId: t.activePaneId,
          splitRatios: t.splitRatios,
          panes: t.panes.map((p) => ({
            id: p.id,
            cwd: p.cwd,
            title: p.title,
          })),
        })),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (err) {
      console.error('Failed to save session state:', err);
    }
  }, [tabs, activeTabId]);

  // Initial tab creation on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    restoreOrCreateTabs();
  }, [restoreOrCreateTabs]);

  const handleRefreshAll = useCallback(async () => {
    try {
      // 1. Close all PTY sessions across all tabs and panes
      const closePromises: Promise<any>[] = [];
      for (const tab of tabs) {
        if (tab.panes && tab.panes.length > 0) {
          for (const pane of tab.panes) {
            closePromises.push(TauriApi.closePty(pane.sessionId).catch(() => {}));
          }
        } else if (tab.sessionId) {
          closePromises.push(TauriApi.closePty(tab.sessionId).catch(() => {}));
        }
      }
      await Promise.all(closePromises);

      // 2. Remove saved session state from localStorage
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (err) {
        console.warn('Failed to clear session storage:', err);
      }

      // 3. Create fresh single PTY session in default home directory
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

      setTabs([newTab]);
      setActiveTabId(newTabId);

      TauriApi.getGitStatus(pty.cwd)
        .then((gitStatus) => {
          updatePane(newTabId, newPaneId, { gitStatus });
        })
        .catch(() => {});
    } catch (err) {
      console.error('Failed to refresh workspace:', err);
    }
  }, [tabs, isFileTreeOpen, updatePane]);

  return {
    tabs,
    setTabs,
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
  };
}
