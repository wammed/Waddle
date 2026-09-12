import React, { useState, useEffect } from 'react';
import {
  Folder,
  GitBranch,
  Check,
  Copy,
  Sparkles,
  Layers,
  ShieldAlert,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { AppConfig, GitStatus, SystemInfo } from '../types';
import { useI18n } from '../i18n';
import { TauriApi } from '../services/tauriApi';

interface StatusBarProps {
  cwd: string;
  gitStatus: GitStatus;
  config: AppConfig;
  systemInfo: SystemInfo | null;
  onOpenAiCommand: () => void;
  onOpenSettings: () => void;
  onToggleGitPopover?: () => void;
  isGitPopoverOpen?: boolean;
  isAiActive?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cwd,
  gitStatus,
  config,
  systemInfo,
  onOpenAiCommand,
  onOpenSettings,
  onToggleGitPopover,
  isGitPopoverOpen,
  isAiActive = false,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [hasProjectRules, setHasProjectRules] = useState(false);

  useEffect(() => {
    if (!cwd) return;
    let isCancelled = false;
    TauriApi.getProjectRules(cwd).then((rules) => {
      if (!isCancelled) {
        setHasProjectRules(!!rules);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [cwd]);

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

  const isGitEnabled = config.git?.enabled !== false;

  return (
    <footer className="statusbar-container">
      <div className="statusbar-left">
        <div
          className="status-item"
          onClick={handleCopyCwd}
          title={t.statusBar.copyPathTooltip}
        >
          <Folder size={13} />
          <span>{cwd || '~'}</span>
          {copied ? (
            <Check size={11} color="#10b981" />
          ) : (
            <Copy size={11} style={{ opacity: 0.5 }} />
          )}
        </div>

        {isGitEnabled && gitStatus.is_repo && (
          <div
            className={`status-item git-badge ${isGitPopoverOpen ? 'active' : ''}`}
            onClick={onToggleGitPopover}
            title={t.statusBar.gitRepoTooltip}
            style={{ cursor: 'pointer' }}
          >
            <GitBranch size={13} />
            <span>{gitStatus.branch || 'HEAD'}</span>

            {/* Non-GitHub Remote Restriction Badge */}
            {config.git?.restrict_to_github !== false && gitStatus.blocked_remote && (
              <span
                className="git-blocked-badge"
                title={`${t.settings.githubRestrictionDesc} (${gitStatus.blocked_remote})`}
              >
                <ShieldAlert size={11} />
                <span>Blocked</span>
              </span>
            )}

            {/* Ahead / Behind Remote */}
            {((gitStatus.ahead ?? 0) > 0 || (gitStatus.behind ?? 0) > 0) && (
              <span
                className="git-sync-badge"
                title={t.gitPopover.aheadBehind(
                  gitStatus.ahead ?? 0,
                  gitStatus.behind ?? 0
                )}
              >
                {(gitStatus.ahead ?? 0) > 0 && `↑${gitStatus.ahead}`}
                {(gitStatus.behind ?? 0) > 0 && `↓${gitStatus.behind}`}
              </span>
            )}

            {/* Merge Conflicts */}
            {(gitStatus.conflicted_count ?? 0) > 0 && (
              <span
                className="git-conflicted-badge"
                title={t.statusBar.gitConflicted(gitStatus.conflicted_count ?? 0)}
              >
                !{gitStatus.conflicted_count}
              </span>
            )}

            {/* Staged files */}
            {(gitStatus.staged_count ?? 0) > 0 && (
              <span
                className="git-staged-badge"
                title={`${gitStatus.staged_count} staged`}
              >
                +{gitStatus.staged_count}
              </span>
            )}

            {/* Modified files */}
            {gitStatus.modified_count > 0 && (
              <span
                className="git-modified"
                title={`${gitStatus.modified_count} ${t.statusBar.gitModified}`}
              >
                *{gitStatus.modified_count}
              </span>
            )}

            {/* Untracked files */}
            {gitStatus.untracked_count > 0 && (
              <span
                className="git-untracked"
                title={`${gitStatus.untracked_count} ${t.statusBar.gitUntracked}`}
              >
                ?{gitStatus.untracked_count}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="statusbar-right">
        {/* Secret Masking Indicator */}
        {config.terminal?.mask_secrets !== false && (
          <div
            className="status-item"
            title="リアルタイム機密情報マスク有効 (Secret Masking Active)"
            style={{ color: '#a6e3a1', gap: '4px' }}
          >
            <ShieldCheck size={12} />
            <span style={{ fontSize: '11px' }}>Masking</span>
          </div>
        )}

        {/* Project AI Rules Active Indicator */}
        {hasProjectRules && config.ai?.enable_project_rules !== false && (
          <div
            className="status-item"
            title="プロジェクト固有 AI ルール適用中 (.waddle/rules.md)"
            style={{ color: '#89b4fa', gap: '4px' }}
          >
            <BookOpen size={12} />
            <span style={{ fontSize: '11px' }}>Project Rules</span>
          </div>
        )}

        <div
          className="status-item"
          onClick={onOpenAiCommand}
          title={t.statusBar.aiPromptTooltip}
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
          className={`status-item ai-status-indicator ${isAiActive ? 'active' : ''}`}
          onClick={onOpenSettings}
          title={t.statusBar.aiSettingsTooltip}
        >
          <span className={`pulse-dot ${isAiActive ? 'active' : ''}`} />
          <span>{getProviderName()}</span>
        </div>
      </div>
    </footer>
  );
};
