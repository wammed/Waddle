import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CornerDownLeft,
  Play,
  Copy,
  Check,
  AlertTriangle,
  X,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { CommandSuggestion, TerminalContext, ProjectRulesInfo } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';
import { DangerousCommandModal, isDangerousCommand } from './DangerousCommandModal';

interface AiCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: TerminalContext;
  onInsertCommand: (command: string) => void;
  onExecuteCommand: (command: string) => void;
}

export const AiCommandModal: React.FC<AiCommandModalProps> = ({
  isOpen,
  onClose,
  context,
  onInsertCommand,
  onExecuteCommand,
}) => {
  const { t } = useI18n();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<CommandSuggestion | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmCmd, setConfirmCmd] = useState<string | null>(null);
  const [activeRules, setActiveRules] = useState<ProjectRulesInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<CommandSuggestion | null>(null);
  const loadingRef = useRef<boolean>(false);
  const promptRef = useRef<string>('');
  const confirmCmdRef = useRef<string | null>(null);

  suggestionRef.current = suggestion;
  loadingRef.current = loading;
  promptRef.current = prompt;
  confirmCmdRef.current = confirmCmd;

  const handleGenerate = async () => {
    const currentPrompt = promptRef.current.trim();
    if (!currentPrompt || loadingRef.current) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await TauriApi.generateCommand(currentPrompt, context);
      setSuggestion(res);
    } catch (err: any) {
      setErrorMsg(String(err));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleRun = (cmd: string) => {
    if (suggestionRef.current?.is_dangerous || isDangerousCommand(cmd)) {
      setConfirmCmd(cmd);
    } else {
      onExecuteCommand(cmd);
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setSuggestion(null);
      setErrorMsg(null);
      if (context.cwd) {
        TauriApi.getProjectRules(context.cwd, context.language).then(setActiveRules);
      }
      setTimeout(() => inputRef.current?.focus(), 50);

      const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // If dangerous confirmation is open, let it handle keys
        if (confirmCmdRef.current) return;

        const isEnter =
          e.key === 'Enter' ||
          e.key === '\n' ||
          e.code === 'Enter' ||
          e.code === 'NumpadEnter';

        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        } else if (isEnter) {
          e.preventDefault();
          e.stopPropagation();
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+Enter -> Execute immediately
            if (suggestionRef.current) {
              handleRun(suggestionRef.current.command);
            } else {
              handleGenerate();
            }
          } else {
            // Enter -> If suggestion exists, insert. Else generate.
            if (suggestionRef.current) {
              onInsertCommand(suggestionRef.current.command);
              onClose();
            } else {
              handleGenerate();
            }
          }
        }
      };

      window.addEventListener('keydown', handleGlobalKeyDown, true);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }
  }, [isOpen, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isEnter =
      e.key === 'Enter' ||
      e.key === '\n' ||
      e.code === 'Enter' ||
      e.code === 'NumpadEnter';

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (isEnter) {
      e.preventDefault();
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        if (suggestionRef.current) {
          handleRun(suggestionRef.current.command);
        } else {
          handleGenerate();
        }
      } else {
        if (suggestionRef.current) {
          onInsertCommand(suggestionRef.current.command);
          onClose();
        } else {
          handleGenerate();
        }
      }
    }
  };

  const handleCopy = () => {
    if (suggestion) {
      navigator.clipboard.writeText(suggestion.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="ai-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="ai-modal-header">
          <div className="ai-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} />
            <span>{t.aiCommand.title}</span>
            {activeRules && (() => {
              const isGlobal = activeRules.relative_path.startsWith('~');
              const localeTag =
                activeRules.filename?.includes('_ja') || (context.language === 'ja' && activeRules.filename !== 'rules.md')
                  ? 'JA'
                  : context.language === 'en-GB'
                  ? 'UK'
                  : 'US';
              const label = isGlobal ? 'Global Rules' : 'Private Rules';
              const tooltip = `${label} ${localeTag} (${activeRules.relative_path})`;

              return (
                <span
                  style={{
                    fontSize: '11px',
                    background: 'rgba(137, 180, 250, 0.12)',
                    color: '#89b4fa',
                    border: '1px solid rgba(137, 180, 250, 0.3)',
                    borderRadius: '12px',
                    padding: '1px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 500,
                  }}
                  title={tooltip}
                >
                  <BookOpen size={11} />
                  {label} {localeTag}
                </span>
              );
            })()}
          </div>
          <button
            onClick={onClose}
            className="action-btn"
            style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="ai-input-wrapper">
          <Sparkles size={18} color="#38bdf8" />
          <input
            ref={inputRef}
            id="ai-prompt-input"
            type="text"
            className="ai-input-field"
            placeholder={t.aiCommand.promptPlaceholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
          />
          <button
            id="btn-generate-command"
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CornerDownLeft size={14} />
            )}
            <span>{t.aiCommand.generate}</span>
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', color: '#fda4af', fontSize: '13px' }}>
            {errorMsg}
          </div>
        )}

        {suggestion && (
          <div className="ai-suggestion-box">
            <div
              className={`command-preview ${
                suggestion.is_dangerous ? 'dangerous' : ''
              }`}
            >
              <code>{suggestion.command}</code>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {suggestion.is_dangerous && (
                  <span className="danger-tag" title={t.aiCommand.dangerousTooltip}>
                    <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {t.aiCommand.dangerous}
                  </span>
                )}
                <button
                  className="action-btn"
                  onClick={handleCopy}
                  title={t.common.copy}
                >
                  {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="explanation-text">{suggestion.explanation}</div>

            {suggestion.alternatives && suggestion.alternatives.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>{t.aiCommand.alternatives}:</span>
                {suggestion.alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    style={{
                      cursor: 'pointer',
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--fg-muted)',
                    }}
                    onClick={() => {
                      setSuggestion({ ...suggestion, command: alt });
                    }}
                  >
                    $ {alt}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          <div>
            <span>{t.aiCommand.footerTip}</span>
          </div>

          {suggestion && (
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  onInsertCommand(suggestion.command);
                  onClose();
                }}
              >
                <CornerDownLeft size={13} />
                <span>{t.aiCommand.insertBtn}</span>
              </button>
              <button
                className="btn-primary"
                onClick={() => handleRun(suggestion.command)}
              >
                <Play size={13} />
                <span>{t.aiCommand.runBtn}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {confirmCmd && (
        <DangerousCommandModal
          isOpen={true}
          command={confirmCmd}
          onConfirmExecute={() => {
            onExecuteCommand(confirmCmd);
            setConfirmCmd(null);
            onClose();
          }}
          onSafeInsert={() => {
            onInsertCommand(confirmCmd);
            setConfirmCmd(null);
            onClose();
          }}
          onClose={() => setConfirmCmd(null)}
        />
      )}
    </div>
  );
};
