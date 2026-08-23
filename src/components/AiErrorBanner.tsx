import React, { useState } from 'react';
import {
  AlertCircle,
  Sparkles,
  X,
  Play,
  CornerDownLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ErrorExplanation, TerminalContext } from '../types';
import { TauriApi } from '../services/tauriApi';

interface AiErrorBannerProps {
  command: string;
  output: string;
  exitCode: number;
  context: TerminalContext;
  onDismiss: () => void;
  onInsertCommand: (command: string) => void;
  onExecuteCommand: (command: string) => void;
}

export const AiErrorBanner: React.FC<AiErrorBannerProps> = ({
  command,
  output,
  exitCode,
  context,
  onDismiss,
  onInsertCommand,
  onExecuteCommand,
}) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<ErrorExplanation | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleExplain = async () => {
    setLoading(true);
    try {
      const res = await TauriApi.explainError(command, output, exitCode, context);
      setExplanation(res);
      setExpanded(true);
    } catch (err) {
      setExplanation({
        summary: 'エラー解析に失敗しました',
        cause: String(err),
        explanation: 'API設定またはネットワーク接続を確認してください。',
      });
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="error-banner">
      <div className="error-banner-content">
        <AlertCircle size={16} color="#f43f5e" />
        <span>
          コマンド <code style={{ color: '#fff', fontWeight: 600 }}>{command}</code> でエラーが検出されました
        </span>
      </div>

      {!explanation ? (
        <button
          className="btn-primary"
          style={{
            background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
            color: '#fff',
            padding: '4px 10px',
            fontSize: '12px',
          }}
          onClick={handleExplain}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          <span>AIで原因を調査 & 修正</span>
        </button>
      ) : (
        <button
          className="btn-secondary"
          style={{ padding: '4px 8px', fontSize: '11px' }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{expanded ? '閉じる' : '詳細'}</span>
        </button>
      )}

      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={15} />
      </button>

      {/* Expanded Diagnosis Box */}
      {explanation && expanded && (
        <div
          style={{
            position: 'absolute',
            top: '115%',
            left: 0,
            right: 0,
            background: 'rgba(19, 23, 34, 0.98)',
            border: '1px solid rgba(244, 63, 94, 0.4)',
            borderRadius: '10px',
            padding: '14px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '13px',
            zIndex: 50,
          }}
        >
          <div style={{ fontWeight: 700, color: '#fda4af' }}>
            {explanation.summary}
          </div>

          <div style={{ color: '#cbd5e1' }}>
            <strong>原因:</strong> {explanation.cause}
          </div>

          <div style={{ color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>
            {explanation.explanation}
          </div>

          {explanation.fix_command && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '6px',
                padding: '8px 12px',
                marginTop: '4px',
              }}
            >
              <code style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {explanation.fix_command}
              </code>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                  onClick={() => {
                    onInsertCommand(explanation.fix_command!);
                    onDismiss();
                  }}
                  title="Insert to terminal"
                >
                  <CornerDownLeft size={12} />
                  <span>挿入</span>
                </button>
                <button
                  className="btn-primary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    background: '#10b981',
                    color: '#000',
                  }}
                  onClick={() => {
                    onExecuteCommand(explanation.fix_command!);
                    onDismiss();
                  }}
                  title="Run fix command now"
                >
                  <Play size={12} />
                  <span>修正を実行</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
