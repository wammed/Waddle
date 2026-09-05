import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  FileCode,
  Check,
  Undo2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';

interface GitDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoPath: string;
  filePath: string;
  isStaged: boolean;
  onFileChanged?: () => void;
}

interface DiffLine {
  type: 'add' | 'delete' | 'hunk' | 'header' | 'context';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export const GitDiffModal: React.FC<GitDiffModalProps> = ({
  isOpen,
  onClose,
  repoPath,
  filePath,
  isStaged,
  onFileChanged,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [diffText, setDiffText] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiff = useCallback(async () => {
    if (!repoPath || !filePath) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await TauriApi.gitGetDiff(repoPath, filePath, isStaged);
      setDiffText(raw);
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath, filePath, isStaged]);

  useEffect(() => {
    if (isOpen) {
      fetchDiff();
    }
  }, [isOpen, fetchDiff]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleStage = async () => {
    setActionLoading(true);
    try {
      await TauriApi.gitStageFile(repoPath, filePath);
      onFileChanged?.();
      onClose();
    } catch (err: any) {
      setError(String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnstage = async () => {
    setActionLoading(true);
    try {
      await TauriApi.gitUnstageFile(repoPath, filePath);
      onFileChanged?.();
      onClose();
    } catch (err: any) {
      setError(String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!window.confirm(t.gitPopover.discardConfirm(filePath))) {
      return;
    }
    setActionLoading(true);
    try {
      await TauriApi.gitDiscardFile(repoPath, filePath);
      onFileChanged?.();
      onClose();
    } catch (err: any) {
      setError(String(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Parse diff into structured lines with line numbering
  const parsedLines: DiffLine[] = React.useMemo(() => {
    if (!diffText) return [];
    const lines = diffText.split('\n');
    const result: DiffLine[] = [];
    let oldNum = 0;
    let newNum = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Hunk header e.g. @@ -1,5 +1,6 @@
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldNum = parseInt(match[1], 10);
          newNum = parseInt(match[2], 10);
        }
        result.push({ type: 'hunk', text: line });
      } else if (
        line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('--- ') ||
        line.startsWith('+++ ')
      ) {
        result.push({ type: 'header', text: line });
      } else if (line.startsWith('+')) {
        result.push({
          type: 'add',
          text: line.substring(1),
          newLineNumber: newNum++,
        });
      } else if (line.startsWith('-')) {
        result.push({
          type: 'delete',
          text: line.substring(1),
          oldLineNumber: oldNum++,
        });
      } else {
        result.push({
          type: 'context',
          text: line.startsWith(' ') ? line.substring(1) : line,
          oldLineNumber: oldNum++,
          newLineNumber: newNum++,
        });
      }
    }
    return result;
  }, [diffText]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="git-diff-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="git-diff-header">
          <div className="git-diff-title-area">
            <FileCode size={16} color="var(--accent)" />
            <span className="git-diff-filename">{filePath}</span>
            <span
              className={`git-diff-badge ${
                isStaged ? 'badge-staged' : 'badge-unstaged'
              }`}
            >
              {isStaged ? t.diffViewer.stagedBadge : t.diffViewer.unstagedBadge}
            </span>
          </div>

          <div className="git-diff-actions">
            {isStaged ? (
              <button
                className="btn-sm btn-outline"
                onClick={handleUnstage}
                disabled={actionLoading}
                title={t.diffViewer.unstageFile}
              >
                <Undo2 size={13} />
                <span>{t.diffViewer.unstageFile}</span>
              </button>
            ) : (
              <>
                <button
                  className="btn-sm btn-outline btn-danger"
                  onClick={handleDiscard}
                  disabled={actionLoading}
                  title={t.diffViewer.discardFile}
                >
                  <Trash2 size={13} />
                  <span>{t.diffViewer.discardFile}</span>
                </button>
                <button
                  className="btn-sm btn-primary"
                  onClick={handleStage}
                  disabled={actionLoading}
                  title={t.diffViewer.stageFile}
                >
                  <Plus size={13} />
                  <span>{t.diffViewer.stageFile}</span>
                </button>
              </>
            )}
            <button
              className="icon-btn-close"
              onClick={onClose}
              title={t.common.close}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="git-diff-body">
          {loading ? (
            <div className="git-diff-loading">
              <Loader2 size={24} className="animate-spin" color="var(--accent)" />
              <span>{t.common.loading}</span>
            </div>
          ) : error ? (
            <div className="git-diff-error">
              <span>{error}</span>
            </div>
          ) : parsedLines.length === 0 ? (
            <div className="git-diff-empty">
              <Check size={28} color="#10b981" />
              <span>{t.diffViewer.noDiff}</span>
            </div>
          ) : (
            <div className="git-diff-lines">
              {parsedLines.map((line, idx) => {
                if (line.type === 'header') {
                  return (
                    <div key={idx} className="diff-row diff-header-row">
                      <div className="diff-line-no gutter-header">#</div>
                      <div className="diff-code">{line.text}</div>
                    </div>
                  );
                }
                if (line.type === 'hunk') {
                  return (
                    <div key={idx} className="diff-row diff-hunk-row">
                      <div className="diff-line-no gutter-hunk">...</div>
                      <div className="diff-code">{line.text}</div>
                    </div>
                  );
                }
                return (
                  <div
                    key={idx}
                    className={`diff-row ${
                      line.type === 'add'
                        ? 'diff-add-row'
                        : line.type === 'delete'
                        ? 'diff-del-row'
                        : 'diff-ctx-row'
                    }`}
                  >
                    <div className="diff-gutter">
                      <span className="line-num old-num">
                        {line.oldLineNumber !== undefined ? line.oldLineNumber : ''}
                      </span>
                      <span className="line-num new-num">
                        {line.newLineNumber !== undefined ? line.newLineNumber : ''}
                      </span>
                    </div>
                    <div className="diff-marker">
                      {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                    </div>
                    <div className="diff-code">{line.text}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
