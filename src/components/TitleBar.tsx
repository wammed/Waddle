import React from 'react';
import {
  Plus,
  X,
  Sparkles,
  Settings,
  Bot,
  FileCode,
  PanelLeft,
} from 'lucide-react';
import { TerminalTab } from '../types';
import waddleIcon from '../assets/waddle-icon.svg';
import { useI18n } from '../i18n';

interface TitleBarProps {
  tabs: TerminalTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  onOpenAiCommand: () => void;
  isAiSidebarOpen: boolean;
  onToggleAiSidebar: () => void;
  isEditorOpen: boolean;
  onToggleEditor: () => void;
  isFileTreeOpen: boolean;
  onToggleFileTree: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onOpenSettings,
  onOpenAiCommand,
  isAiSidebarOpen,
  onToggleAiSidebar,
  isEditorOpen,
  onToggleEditor,
  isFileTreeOpen,
  onToggleFileTree,
}) => {
  const { t } = useI18n();

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
          id="btn-settings"
          className="action-btn"
          onClick={onOpenSettings}
          title={t.titleBar.settingsTooltip}
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};
