import React from 'react';
import { AlertTriangle, Play, CornerDownLeft, X } from 'lucide-react';
import { useI18n } from '../i18n';

export function isDangerousCommand(cmd: string): boolean {
  const lower = cmd.toLowerCase().trim();

  // Dangerous standalone commands or utilities checked at word boundaries
  const standaloneDangerous = [
    'reboot',
    'shutdown',
    'poweroff',
    'init 0',
    'init 6',
    'wipefs',
    'fdisk',
    'parted',
    'gdisk',
    'rmdir',
    'mkfs',
    'mkswap',
    'cryptsetup',
    'shred',
    'truncate',
  ];

  for (const word of standaloneDangerous) {
    const regex = new RegExp(`(^|[^a-zA-Z0-9_-])${word}([^a-zA-Z0-9_-]|$)`);
    if (regex.test(lower)) {
      return true;
    }
  }

  const substringPatterns = [
    'rm -',
    'rm ',
    'rm\t',
    'dd if=',
    'dd of=',
    '> /dev/',
    '> /etc/',
    '> /boot/',
    '> /sys/',
    'chmod -r',
    'chmod 777',
    'chown -r',
    ':(){ :|:& };:',
    'curl ',
    'wget ',
    '| sh',
    '| bash',
    '| zsh',
    '| python',
    '| python3',
    '| perl',
    '| ruby',
    'bash <(',
    'sh <(',
    'zsh <(',
    'python <(',
    'python3 <(',
    'eval "$(',
    'sudo ',
    'su -',
    'sh -c',
    'bash -c',
    'zsh -c',
    'git clean',
    'git reset --hard',
    'git push --force',
    'git push -f',
    'iptables -f',
    'ufw disable',
    'shutil.rmtree',
  ];

  if (substringPatterns.some((p) => lower.includes(p))) {
    return true;
  }

  if (lower.includes('git push') && (lower.includes('--delete') || lower.includes(' :'))) {
    return true;
  }

  if (lower.includes('git branch') && (lower.includes('-d') || lower.includes('--delete'))) {
    return true;
  }

  if (lower.includes('find ') && (lower.includes('-delete') || lower.includes('-exec rm'))) {
    return true;
  }

  return false;
}

interface DangerousCommandModalProps {
  isOpen: boolean;
  command: string;
  onConfirmExecute: () => void;
  onSafeInsert: () => void;
  onClose: () => void;
}

export const DangerousCommandModal: React.FC<DangerousCommandModalProps> = ({
  isOpen,
  command,
  onConfirmExecute,
  onSafeInsert,
  onClose,
}) => {
  const { t } = useI18n();

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 100 }} onClick={onClose}>
      <div
        className="ai-modal"
        style={{
          width: '540px',
          backgroundColor: '#131722',
          border: '1px solid rgba(244, 63, 94, 0.5)',
          boxShadow: '0 16px 36px rgba(244, 63, 94, 0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="ai-modal-header"
          style={{
            borderBottom: '1px solid rgba(244, 63, 94, 0.2)',
            padding: '12px 16px',
          }}
        >
          <div
            className="ai-modal-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#fda4af',
              fontWeight: 700,
            }}
          >
            <AlertTriangle size={18} color="#f43f5e" />
            <span>{t.security.dangerousWarningTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="action-btn"
            style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
            {t.security.dangerousWarningDesc}
          </div>

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '6px',
              padding: '10px 14px',
              overflowX: 'auto',
            }}
          >
            <code
              style={{
                color: '#fda4af',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                wordBreak: 'break-all',
              }}
            >
              {command}
            </code>
          </div>
        </div>

        <div
          className="modal-footer"
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={onClose}
          >
            {t.common.cancel}
          </button>
          <button
            className="btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: '#10b981',
              color: '#000',
              fontWeight: 600,
            }}
            onClick={() => {
              onSafeInsert();
              onClose();
            }}
            title={t.security.dangerousSafeInsert}
          >
            <CornerDownLeft size={13} />
            <span>{t.security.dangerousSafeInsert}</span>
          </button>
          <button
            className="btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: '#e11d48',
              color: '#fff',
              fontWeight: 600,
            }}
            onClick={() => {
              onConfirmExecute();
              onClose();
            }}
            title={t.security.dangerousConfirmRun}
          >
            <Play size={13} />
            <span>{t.security.dangerousConfirmRun}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
