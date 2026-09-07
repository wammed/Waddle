import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GitBranch,
  Check,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Loader2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  X,
  ChevronDown,
  ShieldAlert,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { GitStatus } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';

interface GitQuickPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  repoPath: string;
  gitStatus: GitStatus;
  onRefreshGit: () => void;
  onOpenDiff: (filePath: string, isStaged: boolean) => void;
}

export const GitQuickPopover: React.FC<GitQuickPopoverProps> = ({
  isOpen,
  onClose,
  repoPath,
  gitStatus,
  onRefreshGit,
  onOpenDiff,
}) => {
  const { t } = useI18n();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [branches, setBranches] = useState<string[]>([]);
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>(gitStatus.branch || 'main');
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

  const [commitMessage, setCommitMessage] = useState('');
  const [isGeneratingAiCommit, setIsGeneratingAiCommit] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Categorize files
  const files = gitStatus.files || [];
  const stagedFiles = files.filter((f) => f.staged);
  const unstagedFiles = files.filter((f) => f.unstaged && !f.is_untracked);
  const untrackedFiles = files.filter((f) => f.is_untracked);

  // Sync selected branch when gitStatus updates
  useEffect(() => {
    if (gitStatus.branch) {
      setSelectedBranch(gitStatus.branch);
    }
  }, [gitStatus.branch]);

  // Load branches
  const loadBranches = useCallback(async () => {
    if (!repoPath || !isOpen) return;
    try {
      const list = await TauriApi.gitGetBranches(repoPath);
      setBranches(list);
    } catch {
      // ignore
    }
  }, [repoPath, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setActionError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, loadBranches]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.git-badge')
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Switch branch
  const handleSelectBranch = async (branchName: string) => {
    setIsBranchDropdownOpen(false);
    if (branchName === gitStatus.branch) return;
    setIsSwitchingBranch(true);
    setActionError(null);
    try {
      await TauriApi.gitCheckoutBranch(repoPath, branchName);
      setSelectedBranch(branchName);
      onRefreshGit();
    } catch (err: any) {
      setActionError(String(err));
    } finally {
      setIsSwitchingBranch(false);
    }
  };

  // Stage single file
  const handleStageFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await TauriApi.gitStageFile(repoPath, filePath);
      onRefreshGit();
    } catch (err: any) {
      setActionError(String(err));
    }
  };

  // Unstage single file
  const handleUnstageFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await TauriApi.gitUnstageFile(repoPath, filePath);
      onRefreshGit();
    } catch (err: any) {
      setActionError(String(err));
    }
  };

  // Stage All
  const handleStageAll = async () => {
    try {
      await TauriApi.gitStageAll(repoPath);
      onRefreshGit();
    } catch (err: any) {
      setActionError(String(err));
    }
  };

  // Unstage All
  const handleUnstageAll = async () => {
    try {
      await TauriApi.gitUnstageAll(repoPath);
      onRefreshGit();
    } catch (err: any) {
      setActionError(String(err));
    }
  };

  // Discard single file
  const handleDiscardFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(t.gitPopover.discardConfirm(filePath))) {
      return;
    }
    try {
      await TauriApi.gitDiscardFile(repoPath, filePath);
      onRefreshGit();
    } catch (err: any) {
      setActionError(String(err));
    }
  };

  // Generate AI Commit message
  const handleAiGenerateCommit = async () => {
    setIsGeneratingAiCommit(true);
    setActionError(null);
    try {
      const msg = await TauriApi.gitGenerateCommitMessage(repoPath);
      setCommitMessage(msg);
    } catch (err: any) {
      setActionError(String(err));
    } finally {
      setIsGeneratingAiCommit(false);
    }
  };

  // Commit
  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    setIsCommitting(true);
    setActionError(null);
    try {
      const res = await TauriApi.gitCommit(repoPath, commitMessage.trim());
      setSuccessMessage(res.split('\n')[0] || 'Committed successfully');
      setCommitMessage('');
      onRefreshGit();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setActionError(String(err));
    } finally {
      setIsCommitting(false);
    }
  };

  // Push
  const handlePush = async () => {
    if (isPushing || isPulling) return;
    setIsPushing(true);
    setActionError(null);
    try {
      const res = await TauriApi.gitPush(repoPath);
      setSuccessMessage(res || t.gitPopover.pushSuccess);
      onRefreshGit();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionError(String(err));
    } finally {
      setIsPushing(false);
    }
  };

  // Pull
  const handlePull = async () => {
    if (isPushing || isPulling) return;
    setIsPulling(true);
    setActionError(null);
    try {
      const res = await TauriApi.gitPull(repoPath);
      setSuccessMessage(res || t.gitPopover.pullSuccess);
      onRefreshGit();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setActionError(String(err));
    } finally {
      setIsPulling(false);
    }
  };

  if (!isOpen) return null;

  const hasAnyChanges = files.length > 0;

  return (
    <div className="git-quick-popover" ref={popoverRef}>
      {/* Header: Branch & Sync Status */}
      <div className="git-popover-header">
        <div className="git-popover-branch-picker">
          <GitBranch size={14} color="var(--accent)" />
          <div className="git-branch-selector-wrapper">
            <button
              className="git-branch-btn"
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              disabled={isSwitchingBranch}
              title={t.gitPopover.switchBranch}
            >
              <span className="git-current-branch">
                {isSwitchingBranch ? t.common.loading : selectedBranch}
              </span>
              <ChevronDown size={12} />
            </button>

            {isBranchDropdownOpen && (
              <div className="git-branch-dropdown">
                {branches.length === 0 ? (
                  <div className="git-branch-item disabled">
                    {gitStatus.branch || 'main'}
                  </div>
                ) : (
                  branches.map((b) => (
                    <div
                      key={b}
                      className={`git-branch-item ${
                        b === selectedBranch ? 'active' : ''
                      }`}
                      onClick={() => handleSelectBranch(b)}
                    >
                      <span>{b}</span>
                      {b === selectedBranch && <Check size={12} color="var(--accent)" />}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sync & Conflict status */}
        <div className="git-popover-sync">
          <div className="git-sync-actions">
            <button
              className={`git-sync-btn git-pull-btn ${(gitStatus.behind ?? 0) > 0 ? 'has-updates' : ''}`}
              onClick={handlePull}
              disabled={isPulling || isPushing || Boolean(gitStatus.blocked_remote)}
              title={t.gitPopover.pullTooltip}
            >
              {isPulling ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <ArrowDown size={11} />
              )}
              <span>{isPulling ? t.gitPopover.pulling : t.gitPopover.pull}</span>
              {(gitStatus.behind ?? 0) > 0 && (
                <span className="sync-badge sync-badge-behind">{gitStatus.behind}</span>
              )}
            </button>

            <button
              className={`git-sync-btn git-push-btn ${(gitStatus.ahead ?? 0) > 0 ? 'has-updates' : ''}`}
              onClick={handlePush}
              disabled={isPushing || isPulling || Boolean(gitStatus.blocked_remote)}
              title={t.gitPopover.pushTooltip}
            >
              {isPushing ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <ArrowUp size={11} />
              )}
              <span>{isPushing ? t.gitPopover.pushing : t.gitPopover.push}</span>
              {(gitStatus.ahead ?? 0) > 0 && (
                <span className="sync-badge sync-badge-ahead">{gitStatus.ahead}</span>
              )}
            </button>
          </div>

          <span className="git-policy-pill" title={t.settings.githubRestrictionDesc}>
            <ShieldCheck size={11} color="var(--accent)" />
            <span>GitHub</span>
          </span>

          <button
            className="icon-btn-subtle"
            onClick={onRefreshGit}
            title={t.common.retry}
            disabled={isPushing || isPulling}
          >
            <RefreshCw size={12} className={isPushing || isPulling ? 'animate-spin' : ''} />
          </button>
          <button className="icon-btn-subtle" onClick={onClose} title={t.common.close}>
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Non-GitHub Remote Restriction Warning */}
      {gitStatus.blocked_remote && (
        <div className="git-popover-alert-conflict">
          <ShieldAlert size={14} color="#f43f5e" />
          <span>
            {t.settings.nonGithubRemoteWarning(gitStatus.blocked_remote)}
          </span>
        </div>
      )}

      {/* Merge Conflict Banner */}
      {(gitStatus.conflicted_count ?? 0) > 0 && (
        <div className="git-popover-alert-conflict">
          <AlertTriangle size={14} color="#f43f5e" />
          <span>
            {gitStatus.conflicted_count} {t.gitPopover.conflictedFiles}
          </span>
        </div>
      )}

      {/* Action / Error Banner */}
      {actionError && (
        <div className="git-popover-error">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)}>
            <X size={11} />
          </button>
        </div>
      )}
      {actionError && (
        actionError.includes('Permission denied (publickey)') ||
        actionError.includes('could not read Username') ||
        actionError.includes('Authentication failed') ||
        actionError.includes('fatal: Authentication') ||
        actionError.includes('Please make sure you have the correct access rights')
      ) && (
        <div
          style={{
            margin: '4px 12px 8px',
            padding: '8px 10px',
            background: 'rgba(56, 189, 248, 0.12)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#7dd3fc',
            lineHeight: '1.4',
            display: 'flex',
            gap: '6px',
            alignItems: 'flex-start',
          }}
        >
          <Info size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '2px', color: '#38bdf8' }}>
              {t.gitPopover.authTipTitle}
            </strong>
            {t.gitPopover.authTipDesc}
          </div>
        </div>
      )}
      {successMessage && (
        <div className="git-popover-success">
          <Check size={12} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* File Sections List */}
      <div className="git-popover-content">
        {!hasAnyChanges && (
          <div className="git-popover-empty">
            <Check size={20} color="#10b981" />
            <span>{t.gitPopover.noChanges}</span>
          </div>
        )}

        {/* 1. Staged Changes */}
        {stagedFiles.length > 0 && (
          <div className="git-section">
            <div className="git-section-header">
              <span className="git-section-title">
                {t.gitPopover.stagedChanges} ({stagedFiles.length})
              </span>
              <button
                className="git-section-action-btn"
                onClick={handleUnstageAll}
                title={t.gitPopover.unstageAll}
              >
                {t.gitPopover.unstageAll}
              </button>
            </div>
            <div className="git-file-list">
              {stagedFiles.map((file) => (
                <div
                  key={file.path}
                  className="git-file-item"
                  onClick={() => onOpenDiff(file.path, true)}
                  title={`${t.gitPopover.viewDiffTooltip}: ${file.path}`}
                >
                  <span className="git-status-badge badge-staged">
                    {file.status_code.trim() || 'M'}
                  </span>
                  <span className="git-file-path">{file.path}</span>
                  <div className="git-item-actions">
                    <button
                      className="git-item-btn"
                      onClick={(e) => handleUnstageFile(file.path, e)}
                      title={t.gitPopover.unstageTooltip}
                    >
                      <Minus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Unstaged Changes */}
        {unstagedFiles.length > 0 && (
          <div className="git-section">
            <div className="git-section-header">
              <span className="git-section-title">
                {t.gitPopover.unstagedChanges} ({unstagedFiles.length})
              </span>
              <button
                className="git-section-action-btn"
                onClick={handleStageAll}
                title={t.gitPopover.stageAll}
              >
                {t.gitPopover.stageAll}
              </button>
            </div>
            <div className="git-file-list">
              {unstagedFiles.map((file) => (
                <div
                  key={file.path}
                  className="git-file-item"
                  onClick={() => onOpenDiff(file.path, false)}
                  title={`${t.gitPopover.viewDiffTooltip}: ${file.path}`}
                >
                  <span
                    className={`git-status-badge ${
                      file.is_conflicted ? 'badge-conflict' : 'badge-unstaged'
                    }`}
                  >
                    {file.is_conflicted ? 'C' : file.status_code.trim() || 'M'}
                  </span>
                  <span className="git-file-path">{file.path}</span>
                  <div className="git-item-actions">
                    <button
                      className="git-item-btn btn-danger-hover"
                      onClick={(e) => handleDiscardFile(file.path, e)}
                      title={t.gitPopover.discardTooltip}
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      className="git-item-btn"
                      onClick={(e) => handleStageFile(file.path, e)}
                      title={t.gitPopover.stageTooltip}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Untracked Files */}
        {untrackedFiles.length > 0 && (
          <div className="git-section">
            <div className="git-section-header">
              <span className="git-section-title">
                {t.gitPopover.untrackedFiles} ({untrackedFiles.length})
              </span>
            </div>
            <div className="git-file-list">
              {untrackedFiles.map((file) => (
                <div
                  key={file.path}
                  className="git-file-item"
                  onClick={() => onOpenDiff(file.path, false)}
                  title={`${t.gitPopover.viewDiffTooltip}: ${file.path}`}
                >
                  <span className="git-status-badge badge-untracked">?</span>
                  <span className="git-file-path">{file.path}</span>
                  <div className="git-item-actions">
                    <button
                      className="git-item-btn"
                      onClick={(e) => handleStageFile(file.path, e)}
                      title={t.gitPopover.stageTooltip}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Commit Box */}
      <div className="git-popover-commit">
        <div className="git-commit-ai-bar">
          <button
            className="btn-ai-gen"
            onClick={handleAiGenerateCommit}
            disabled={isGeneratingAiCommit || (!stagedFiles.length && !unstagedFiles.length)}
            title={t.gitPopover.generateAiCommit}
          >
            {isGeneratingAiCommit ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} color="#38bdf8" />
            )}
            <span>
              {isGeneratingAiCommit
                ? t.gitPopover.generatingAiCommit
                : t.gitPopover.generateAiCommit}
            </span>
          </button>
        </div>

        <div className="git-commit-input-wrapper">
          <input
            type="text"
            className="git-commit-input"
            placeholder={t.gitPopover.commitMessagePlaceholder}
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleCommit();
              }
            }}
          />
          <button
            className="btn-commit"
            onClick={handleCommit}
            disabled={
              isCommitting ||
              !commitMessage.trim() ||
              (stagedFiles.length === 0 && unstagedFiles.length === 0)
            }
            title={t.gitPopover.commitBtn}
          >
            {isCommitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Check size={12} />
            )}
            <span>{isCommitting ? t.gitPopover.committing : t.gitPopover.commitBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
