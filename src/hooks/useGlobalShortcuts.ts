import React, { useEffect } from 'react';
import { PaneLayout, TerminalPaneInfo, TerminalTab } from '../types';

interface UseGlobalShortcutsOptions {
  activeTab?: TerminalTab;
  activePane?: TerminalPaneInfo;
  activeTabId: string;
  handleClosePane: (tabId: string, paneId: string) => void;
  handleApplyLayout: (layout: PaneLayout) => void;
  handleDirectionalFocus: (direction: 'up' | 'down' | 'left' | 'right') => void;
  handleSwapPanes: (tabId: string) => void;
  handleToggleZoomPane?: (tabId: string) => void;
  createNewTab: () => void;
  closeTab: (tabId: string) => void;
  setIsAiCommandOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsFileTreeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTimelineOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPipelineBuilderOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useGlobalShortcuts({
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
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const keyLower = e.key?.toLowerCase();
      const code = e.code;

      // Ctrl+Shift+W: Close current active pane
      if (isCtrlOrMeta && e.shiftKey && (keyLower === 'w' || code === 'KeyW')) {
        e.preventDefault();
        e.stopPropagation();
        if (activeTab && activePane) {
          handleClosePane(activeTab.id, activePane.id);
        }
        return;
      }

      // Ctrl+Shift+S: Swap panes in current split
      if (isCtrlOrMeta && e.shiftKey && (keyLower === 's' || code === 'KeyS')) {
        e.preventDefault();
        e.stopPropagation();
        if (activeTab) {
          handleSwapPanes(activeTab.id);
        }
        return;
      }

      // Ctrl+Shift+H: Session Timeline
      if (isCtrlOrMeta && e.shiftKey && (keyLower === 'h' || code === 'KeyH')) {
        e.preventDefault();
        e.stopPropagation();
        if (setIsTimelineOpen) {
          setIsTimelineOpen((prev) => !prev);
        }
        return;
      }

      // Ctrl+Shift+P: Visual Pipeline Builder
      if (isCtrlOrMeta && e.shiftKey && (keyLower === 'p' || code === 'KeyP')) {
        e.preventDefault();
        e.stopPropagation();
        if (setIsPipelineBuilderOpen) {
          setIsPipelineBuilderOpen((prev) => !prev);
        }
        return;
      }

      // Alt+Z: Zoom / restore active pane
      if (e.altKey && !e.ctrlKey && (keyLower === 'z' || code === 'KeyZ')) {
        e.preventDefault();
        e.stopPropagation();
        if (activeTab && handleToggleZoomPane) {
          handleToggleZoomPane(activeTab.id);
        }
        return;
      }

      // Alt+1 .. Alt+4: Layout switching (support both standard number row and numpad)
      if (e.altKey && !e.ctrlKey) {
        if (e.key === '1' || code === 'Digit1' || code === 'Numpad1') {
          e.preventDefault();
          e.stopPropagation();
          handleApplyLayout('single');
          return;
        }
        if (e.key === '2' || code === 'Digit2' || code === 'Numpad2') {
          e.preventDefault();
          e.stopPropagation();
          handleApplyLayout('split-2-h');
          return;
        }
        if (e.key === '3' || code === 'Digit3' || code === 'Numpad3') {
          e.preventDefault();
          e.stopPropagation();
          handleApplyLayout('split-3-left-main');
          return;
        }
        if (e.key === '4' || code === 'Digit4' || code === 'Numpad4') {
          e.preventDefault();
          e.stopPropagation();
          handleApplyLayout('grid-4');
          return;
        }

        // Alt+Arrows: Directional pane focus
        if (e.key === 'ArrowUp' || code === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          handleDirectionalFocus('up');
          return;
        }
        if (e.key === 'ArrowDown' || code === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          handleDirectionalFocus('down');
          return;
        }
        if (e.key === 'ArrowLeft' || code === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          handleDirectionalFocus('left');
          return;
        }
        if (e.key === 'ArrowRight' || code === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          handleDirectionalFocus('right');
          return;
        }
      }

      // App-level shortcuts (Ctrl/Meta)
      if (isCtrlOrMeta) {
        // Ctrl+K (or Ctrl+Shift+K outside editor): AI Command Modal
        if (keyLower === 'k' || code === 'KeyK') {
          const isInsideEditor = (e.target as HTMLElement)?.closest('.editor-container');
          if (e.shiftKey && isInsideEditor) {
            return; // Allow editor's own AI refactoring shortcut
          }
          e.preventDefault();
          e.stopPropagation();
          setIsAiCommandOpen((prev) => !prev);
        } else if (keyLower === 'e' || code === 'KeyE') {
          // Ctrl+E: Simple Editor toggle
          e.preventDefault();
          e.stopPropagation();
          setIsEditorOpen((prev) => !prev);
        } else if (keyLower === 't' || code === 'KeyT') {
          // Ctrl+T or Ctrl+Shift+T: New Tab
          e.preventDefault();
          e.stopPropagation();
          createNewTab();
        } else if (!e.shiftKey && (keyLower === 'w' || code === 'KeyW')) {
          const isInsideEditor = (e.target as HTMLElement)?.closest('.editor-container');
          if (isInsideEditor) {
            return; // Allow editor container to handle its own tab closure
          }
          // Ctrl+W: Close current tab
          e.preventDefault();
          e.stopPropagation();
          if (activeTabId) closeTab(activeTabId);
        } else if (keyLower === 'b' || code === 'KeyB') {
          // Ctrl+B: File Tree Sidebar toggle
          e.preventDefault();
          e.stopPropagation();
          setIsFileTreeOpen((prev) => !prev);
        } else if (e.key === ',' || code === 'Comma') {
          // Ctrl+,: Settings
          e.preventDefault();
          e.stopPropagation();
          setIsSettingsOpen((prev) => !prev);
        }
      }
    };

    // Use capture phase so shortcuts are handled reliably before DOM child elements
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
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
  ]);
}
