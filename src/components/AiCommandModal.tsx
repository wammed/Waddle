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
} from 'lucide-react';
import { CommandSuggestion, TerminalContext } from '../types';
import { TauriApi } from '../services/tauriApi';

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
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<CommandSuggestion | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setSuggestion(null);
      setErrorMsg(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await TauriApi.generateCommand(prompt.trim(), context);
      setSuggestion(res);
    } catch (err: any) {
      setErrorMsg(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Enter -> Execute immediately
        if (suggestion) {
          onExecuteCommand(suggestion.command);
          onClose();
        } else {
          handleGenerate();
        }
      } else {
        // Enter -> If suggestion exists, insert. Else generate.
        if (suggestion) {
          onInsertCommand(suggestion.command);
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
          <div className="ai-modal-title">
            <Sparkles size={16} />
            <span>AI Command Assistant</span>
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
            placeholder="やりたいことを自然言語で入力 (例: 直近のコミットを取り消したい, 8080番ポートを使っているプロセスを終了)"
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
            <span>生成</span>
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
                  <span className="danger-tag" title="Caution: Destructive command">
                    <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                    DANGEROUS
                  </span>
                )}
                <button
                  className="action-btn"
                  onClick={handleCopy}
                  title="Copy command"
                >
                  {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            <div className="explanation-text">{suggestion.explanation}</div>

            {suggestion.alternatives && suggestion.alternatives.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--fg-dim)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>代替案:</span>
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
            <span>Press </span>
            <span className="kbd-badge">Enter</span>
            <span> to Insert, </span>
            <span className="kbd-badge">Ctrl+Enter</span>
            <span> to Run immediately, </span>
            <span className="kbd-badge">Esc</span>
            <span> to Cancel</span>
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
                <span>ターミナルに挿入</span>
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  onExecuteCommand(suggestion.command);
                  onClose();
                }}
              >
                <Play size={13} />
                <span>実行</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
