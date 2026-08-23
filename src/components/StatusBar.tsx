import React, { useState } from 'react';
import {
  Folder,
  GitBranch,
  Check,
  Copy,
  Sparkles,
  Layers,
} from 'lucide-react';
import { AppConfig, GitStatus, SystemInfo } from '../types';

interface StatusBarProps {
  cwd: string;
  gitStatus: GitStatus;
  config: AppConfig;
  systemInfo: SystemInfo | null;
  onOpenAiCommand: () => void;
  onOpenSettings: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cwd,
  gitStatus,
  config,
  systemInfo,
  onOpenAiCommand,
  onOpenSettings,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCwd = () => {
    if (cwd) {
      navigator.clipboard.writeText(cwd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getProviderName = () => {
    return `Ollama (${config.ai.ollama_model || 'llama3.2'})`;
  };

  return (
    <footer className="statusbar-container">
      <div className="statusbar-left">
        <div
          className="status-item"
          onClick={handleCopyCwd}
          title="Click to copy path"
        >
          <Folder size={13} />
          <span>{cwd || '~'}</span>
          {copied ? (
            <Check size={11} color="#10b981" />
          ) : (
            <Copy size={11} style={{ opacity: 0.5 }} />
          )}
        </div>

        {gitStatus.is_repo && (
          <div className="status-item git-badge" title="Git repository">
            <GitBranch size={13} />
            <span>{gitStatus.branch || 'HEAD'}</span>
            {gitStatus.modified_count > 0 && (
              <span
                className="git-modified"
                title={`${gitStatus.modified_count} modified files`}
              >
                *{gitStatus.modified_count}
              </span>
            )}
            {gitStatus.untracked_count > 0 && (
              <span
                className="git-untracked"
                title={`${gitStatus.untracked_count} untracked files`}
              >
                ?{gitStatus.untracked_count}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="statusbar-right">
        <div
          className="status-item"
          onClick={onOpenAiCommand}
          title="Open AI Command Generator (Ctrl+K)"
          style={{ gap: '4px' }}
        >
          <Sparkles size={12} color="#38bdf8" />
          <span className="kbd-badge" style={{ fontSize: '9px', padding: '0 4px' }}>
            Ctrl+K
          </span>
        </div>

        {systemInfo && (
          <div className="status-item" title={`${systemInfo.os} - ${systemInfo.kernel}`}>
            <Layers size={13} />
            <span>{systemInfo.default_shell}</span>
          </div>
        )}

        <div
          className="status-item ai-status-indicator"
          onClick={onOpenSettings}
          title="Click to change AI settings"
        >
          <span className="pulse-dot" />
          <span>{getProviderName()}</span>
        </div>
      </div>
    </footer>
  );
};
