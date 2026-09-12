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
import { useI18n } from '../i18n';
import { DangerousCommandModal, isDangerousCommand } from './DangerousCommandModal';

interface AiErrorBannerProps {
  command: string;
  output: string;
  exitCode: number;
  context: TerminalContext;
  autoAnalyze?: boolean;
  onDismiss: () => void;
  onInsertCommand: (command: string) => void;
  onExecuteCommand: (command: string) => void;
}

export const AiErrorBanner: React.FC<AiErrorBannerProps> = ({
  command,
  output,
  exitCode,
  context,
  autoAnalyze = true,
  onDismiss,
  onInsertCommand,
  onExecuteCommand,
}) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<ErrorExplanation | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmCmd, setConfirmCmd] = useState<string | null>(null);

  const handleExplain = async () => {
    setLoading(true);
    try {
      const res = await TauriApi.explainError(command, output, exitCode, context);
      setExplanation(res);
      // Auto expand if there's a fix command or auto analyzed
      setExpanded(true);
    } catch (err) {
      setExplanation({
        summary: t.errorBanner.analysisFailed,
        cause: String(err),
        explanation: t.errorBanner.checkConnection,
      });
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (autoAnalyze && !explanation && !loading) {
      handleExplain();
    }
  }, [autoAnalyze]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  return (
    <div className="error-banner">
      <div className="error-banner-content">
        <AlertCircle size={16} color="#f43f5e" />
        <span>{t.errorBanner.detected(command)}</span>
        {loading && (
          <span
            style={{
              fontSize: '11px',
              color: '#fda4af',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: '8px',
            }}
          >
            <Loader2 size={12} className="animate-spin" />
            Watchdog 自動分析中...
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {explanation?.fix_command && !expanded && (
          <button
            className="btn-primary"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              borderRadius: '6px',
            }}
            onClick={() => {
              const cmd = explanation.fix_command!;
              if (isDangerousCommand(cmd)) {
                setConfirmCmd(cmd);
              } else {
                onExecuteCommand(cmd);
                onDismiss();
              }
            }}
            title="1-Click Quick Fix: 修正コマンドを即座に実行"
          >
            <Play size={10} fill="#fff" />
            ⚡ 1-Click 修正
          </button>
        )}

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
            <span>{t.errorBanner.investigateBtn}</span>
          </button>
        ) : (
          <button
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{expanded ? t.common.close : t.errorBanner.details}</span>
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
      </div>

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
            <strong>{t.errorBanner.cause}:</strong> {explanation.cause}
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
                  title={t.errorBanner.insertFix}
                >
                  <CornerDownLeft size={12} />
                  <span>{t.errorBanner.insertFix}</span>
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
                    const cmd = explanation.fix_command!;
                    if (isDangerousCommand(cmd)) {
                      setConfirmCmd(cmd);
                    } else {
                      onExecuteCommand(cmd);
                      onDismiss();
                    }
                  }}
                  title={t.errorBanner.runFix}
                >
                  <Play size={12} />
                  <span>{t.errorBanner.runFix}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {confirmCmd && (
        <DangerousCommandModal
          isOpen={true}
          command={confirmCmd}
          onConfirmExecute={() => {
            onExecuteCommand(confirmCmd);
            setConfirmCmd(null);
            onDismiss();
          }}
          onSafeInsert={() => {
            onInsertCommand(confirmCmd);
            setConfirmCmd(null);
            onDismiss();
          }}
          onClose={() => setConfirmCmd(null)}
        />
      )}
    </div>
  );
};
