import React, { useState } from 'react';
import {
  Plus,
  X,
  Sparkles,
  Settings,
  Bot,
  FileCode,
  PanelLeft,
  Grid2X2,
  Columns2,
  Rows2,
  LayoutGrid,
  Square,
  RotateCcw,
} from 'lucide-react';
import { PaneLayout, TerminalTab } from '../types';
import waddleIcon from '../assets/waddle-icon.svg';
import { useI18n } from '../i18n';
import { LayoutSelectorPopover } from './LayoutSelectorPopover';
import { RefreshConfirmModal } from './RefreshConfirmModal';

interface TitleBarProps {
  tabs: TerminalTab[];
  activeTabId: string;
  currentLayout: PaneLayout;
  onSelectTab: (tabId: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onSelectLayout: (layout: PaneLayout) => void;
  onOpenSettings: () => void;
  onOpenAiCommand: () => void;
  isAiSidebarOpen: boolean;
  onToggleAiSidebar: () => void;
  isEditorOpen: boolean;
  onToggleEditor: () => void;
  isFileTreeOpen: boolean;
  onToggleFileTree: () => void;
  onRefreshAll: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tabs,
  activeTabId,
  currentLayout,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onSelectLayout,
  onOpenSettings,
  onOpenAiCommand,
  isAiSidebarOpen,
  onToggleAiSidebar,
  isEditorOpen,
  onToggleEditor,
  isFileTreeOpen,
  onToggleFileTree,
  onRefreshAll,
}) => {
  const { t } = useI18n();
  const [isLayoutPopoverOpen, setIsLayoutPopoverOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const getLayoutIcon = (layout: PaneLayout) => {
    switch (layout) {
      case 'grid-4':
        return <Grid2X2 size={14} color="var(--accent)" />;
      case 'split-2-h':
      case 'split-3-h':
      case 'split-4-h':
        return <Columns2 size={14} color="var(--accent)" />;
      case 'split-2-v':
      case 'split-3-v':
        return <Rows2 size={14} color="var(--accent)" />;
      case 'split-3-left-main':
      case 'split-3-top-main':
      case 'split-4-left-main':
        return <LayoutGrid size={14} color="var(--accent)" />;
      default:
        return <Square size={14} />;
    }
  };

  return (
    <header className="titlebar-container" data-tauri-drag-region>
      <div className="titlebar-left">
        <div className="app-brand">
          <img
            src={waddleIcon}
            alt="Waddle"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 6px var(--accent-glow))',
            }}
          />
          <span>Waddle</span>
        </div>

        <button
          id="btn-filetree-toggle"
          className={`action-btn ${isFileTreeOpen ? 'active' : ''}`}
          onClick={onToggleFileTree}
          title={t.titleBar.filesTooltip}
          style={{ height: '28px', padding: '0 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <PanelLeft size={14} />
          <span>{t.titleBar.files}</span>
        </button>

        <nav className="tabs-list" aria-label="Terminal Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                className={`tab-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(tab.id)}
                title={tab.cwd || tab.title}
              >
                <span className="tab-title">{tab.title}</span>
                {tabs.length > 1 && (
                  <span
                    className="tab-close"
                    onClick={(e) => onCloseTab(tab.id, e)}
                    title={t.titleBar.closeTabTooltip}
                  >
                    <X size={12} />
                  </span>
                )}
              </button>
            );
          })}

          <button
            id="btn-new-tab"
            className="new-tab-btn"
            onClick={onNewTab}
            title={t.titleBar.newTabTooltip}
          >
            <Plus size={16} />
          </button>
        </nav>
      </div>

      <div className="titlebar-right">
        <button
          id="btn-ai-command"
          className="action-btn"
          onClick={onOpenAiCommand}
          title={t.titleBar.aiPromptTooltip}
        >
          <Sparkles size={14} color="#38bdf8" />
          <span>{t.titleBar.aiPrompt}</span>
          <span className="kbd-badge">Ctrl+K</span>
        </button>

        <button
          id="btn-editor-toggle"
          className={`action-btn ${isEditorOpen ? 'active' : ''}`}
          onClick={onToggleEditor}
          title={t.titleBar.editorTooltip}
        >
          <FileCode size={14} />
          <span>{t.titleBar.editor}</span>
        </button>

        <button
          id="btn-ai-sidebar"
          className={`action-btn ${isAiSidebarOpen ? 'active' : ''}`}
          onClick={onToggleAiSidebar}
          title={t.titleBar.copilotTooltip}
        >
          <Bot size={14} />
          <span>{t.titleBar.copilot}</span>
        </button>

        <button
          id="btn-layout-toggle"
          className={`action-btn ${currentLayout !== 'single' ? 'active' : ''}`}
          onClick={() => setIsLayoutPopoverOpen((prev) => !prev)}
          title={t.titleBar.layoutTooltip}
        >
          {getLayoutIcon(currentLayout)}
          <span>{t.titleBar.layout}</span>
        </button>

        <button
          id="btn-refresh-all"
          className="action-btn"
          onClick={() => setIsConfirmModalOpen(true)}
          title={t.titleBar.refreshAllTooltip}
        >
          <RotateCcw size={14} />
          <span>{t.titleBar.refreshAll}</span>
        </button>

        <button
          id="btn-settings"
          className="action-btn"
          onClick={onOpenSettings}
          title={t.titleBar.settingsTooltip}
        >
          <Settings size={14} />
        </button>

        {isLayoutPopoverOpen && (
          <LayoutSelectorPopover
            isOpen={isLayoutPopoverOpen}
            onClose={() => setIsLayoutPopoverOpen(false)}
            currentLayout={currentLayout}
            onSelectLayout={(layout) => {
              onSelectLayout(layout);
              setIsLayoutPopoverOpen(false);
            }}
          />
        )}

        <RefreshConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={() => {
            setIsConfirmModalOpen(false);
            onRefreshAll();
          }}
        />
      </div>
    </header>
  );
};
