import React from 'react';
import {
  Terminal,
  Plus,
  X,
  Sparkles,
  Settings,
  Bot,
  FileCode,
} from 'lucide-react';
import { TerminalTab } from '../types';

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
}) => {
  return (
    <header className="titlebar-container" data-tauri-drag-region>
      <div className="titlebar-left">
        <div className="app-brand">
          <Terminal className="brand-icon" />
          <span>Waddle</span>
        </div>

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
                    title="Close tab"
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
            title="New Tab (Ctrl+T)"
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
          title="AI Command Generator (Ctrl+K)"
        >
          <Sparkles size={14} color="#38bdf8" />
          <span>AI Prompt</span>
          <span className="kbd-badge">Ctrl+K</span>
        </button>

        <button
          id="btn-editor-toggle"
          className={`action-btn ${isEditorOpen ? 'active' : ''}`}
          onClick={onToggleEditor}
          title="Toggle Embedded Editor (Ctrl+E)"
        >
          <FileCode size={14} />
          <span>Editor</span>
        </button>

        <button
          id="btn-ai-sidebar"
          className={`action-btn ${isAiSidebarOpen ? 'active' : ''}`}
          onClick={onToggleAiSidebar}
          title="Toggle AI Copilot Sidebar"
        >
          <Bot size={14} />
          <span>Copilot</span>
        </button>

        <button
          id="btn-settings"
          className="action-btn"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};
