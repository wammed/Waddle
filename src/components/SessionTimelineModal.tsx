import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Play,
  Copy,
  Trash2,
  Check,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  Zap,
} from 'lucide-react';
import { SessionCommandRecord } from '../types';
import { sessionHistory } from '../services/sessionHistory';

interface SessionTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCommand: (command: string) => void;
  theme?: string;
}

export const SessionTimelineModal: React.FC<SessionTimelineModalProps> = ({
  isOpen,
  onClose,
  onRunCommand,
}) => {
  const [records, setRecords] = useState<SessionCommandRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'error'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const updateRecords = () => {
      setRecords(sessionHistory.getRecords());
    };
    updateRecords();

    const handler = () => updateRecords();
    window.addEventListener('waddle-session-history-updated', handler);
    return () => window.removeEventListener('waddle-session-history-updated', handler);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (filterStatus === 'success' && rec.exitCode !== 0) return false;
      if (filterStatus === 'error' && (rec.exitCode === undefined || rec.exitCode === 0)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        rec.command.toLowerCase().includes(q) ||
        rec.cwd.toLowerCase().includes(q) ||
        (rec.outputSnippet && rec.outputSnippet.toLowerCase().includes(q))
      );
    });
  }, [records, searchQuery, filterStatus]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClear = () => {
    if (confirm('実行履歴タイムラインをすべて消去しますか？')) {
      sessionHistory.clearRecords();
      setRecords([]);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 5) return '今';
    if (diffSec < 60) return `${diffSec}秒前`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}分前`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}時間前`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '840px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          backgroundColor: '#181825',
          border: '1px solid #313244',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#cdd6f4',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #313244',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, #1e1e2e, #181825)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={20} color="#89b4fa" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#cdd6f4' }}>
                セッション タイムトラベル (Session Timeline)
              </div>
              <div style={{ fontSize: '11px', color: '#a6adc8' }}>
                過去に実行したコマンドの履歴・実行結果・ワンクリック再実行
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {records.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  background: 'transparent',
                  border: '1px solid #45475a',
                  color: '#f38ba8',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2 size={12} />
                全履歴クリア
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6c7086',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                borderRadius: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #313244',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#1e1e2e',
          }}
        >
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              color="#6c7086"
              style={{ position: 'absolute', left: '10px' }}
            />
            <input
              type="text"
              placeholder="コマンド名・ディレクトリ・出力から検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                backgroundColor: '#11111b',
                border: '1px solid #313244',
                borderRadius: '6px',
                color: '#cdd6f4',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {(['all', 'success', 'error'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  border:
                    filterStatus === st ? '1px solid #89b4fa' : '1px solid #313244',
                  backgroundColor:
                    filterStatus === st ? 'rgba(137, 180, 250, 0.15)' : '#11111b',
                  color: filterStatus === st ? '#89b4fa' : '#a6adc8',
                }}
              >
                {st === 'all'
                  ? 'すべて'
                  : st === 'success'
                  ? '✓ 成功 (0)'
                  : '✗ エラー (≠0)'}
              </button>
            ))}
          </div>
        </div>

        {/* Command List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {filteredRecords.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#6c7086',
                fontSize: '13px',
              }}
            >
              {searchQuery ? '一致するコマンドが見つかりませんでした' : '実行履歴がまだありません'}
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const isExpanded = expandedIds.has(rec.id);
              const isSuccess = rec.exitCode === 0;
              const hasExitCode = rec.exitCode !== undefined;

              return (
                <div
                  key={rec.id}
                  style={{
                    backgroundColor: '#11111b',
                    border: '1px solid #313244',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {/* Status indicator */}
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: !hasExitCode
                            ? 'rgba(108, 112, 134, 0.2)'
                            : isSuccess
                            ? 'rgba(166, 227, 161, 0.15)'
                            : 'rgba(243, 139, 168, 0.15)',
                          color: !hasExitCode
                            ? '#a6adc8'
                            : isSuccess
                            ? '#a6e3a1'
                            : '#f38ba8',
                          border: `1px solid ${
                            !hasExitCode
                              ? '#45475a'
                              : isSuccess
                              ? 'rgba(166, 227, 161, 0.3)'
                              : 'rgba(243, 139, 168, 0.3)'
                          }`,
                        }}
                      >
                        {!hasExitCode ? 'RUN' : isSuccess ? '✓ 0' : `✗ ${rec.exitCode}`}
                      </span>

                      {/* Command text */}
                      <code
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          color: '#89b4fa',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: 600,
                        }}
                        title={rec.command}
                      >
                        {rec.command}
                      </code>
                    </div>

                    {/* Metadata & Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: 0,
                      }}
                    >
                      {rec.durationMs !== undefined && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#fab387',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Zap size={11} />
                          {rec.durationMs}ms
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: '11px',
                          color: '#6c7086',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Clock size={11} />
                        {formatRelativeTime(rec.timestamp)}
                      </span>

                      <button
                        onClick={() => handleCopy(rec.id, rec.command)}
                        title="コマンドをコピー"
                        style={{
                          background: 'transparent',
                          border: '1px solid #313244',
                          color: copiedId === rec.id ? '#a6e3a1' : '#a6adc8',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '11px',
                        }}
                      >
                        {copiedId === rec.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>

                      <button
                        onClick={() => {
                          onRunCommand(rec.command);
                          onClose();
                        }}
                        title="ターミナルで再実行"
                        style={{
                          background: 'rgba(137, 180, 250, 0.15)',
                          border: '1px solid rgba(137, 180, 250, 0.3)',
                          color: '#89b4fa',
                          borderRadius: '4px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        <Play size={10} />
                        再実行
                      </button>
                    </div>
                  </div>

                  {/* Subline: CWD & Output preview toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: '#a6adc8',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '75%',
                      }}
                      title={rec.cwd}
                    >
                      <Folder size={11} color="#6c7086" />
                      <span style={{ color: '#6c7086' }}>{rec.cwd}</span>
                    </div>

                    {rec.outputSnippet && (
                      <button
                        onClick={() => toggleExpand(rec.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#89b4fa',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: 0,
                        }}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {isExpanded ? '出力を閉じる' : '出力プレビュー'}
                      </button>
                    )}
                  </div>

                  {/* Expanded Output Snippet */}
                  {isExpanded && rec.outputSnippet && (
                    <div
                      style={{
                        marginTop: '4px',
                        padding: '8px 10px',
                        backgroundColor: '#181825',
                        border: '1px solid #313244',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        color: '#cdd6f4',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      {rec.outputSnippet}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
