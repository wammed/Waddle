import React, { useEffect } from 'react';
import { PaneLayout, TerminalPaneInfo, TerminalTab } from '../types';

interface UseGlobalShortcutsOptions {
  activeTab?: TerminalTab;
  activePane?: TerminalPaneInfo;
  activeTabId: string;
  handleClosePane: (tabId: string, paneId: string) => void;
  handleApplyLayout: (layout: PaneLayout) => void;
  handleDirectionalFocus: (direction: 'up' | 'down' | 'left' | 'right') => void;
  createNewTab: () => void;
  closeTab: (tabId: string) => void;
  setIsAiCommandOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFileTreeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useGlobalShortcuts({
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
}: UseGlobalShortcutsOptions) {
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

      // App-level shortcuts
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
  }, [
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
  ]);
}
