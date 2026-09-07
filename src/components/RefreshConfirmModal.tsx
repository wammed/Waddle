import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCcw,
  AlertTriangle,
  X,
  Layers,
  Terminal,
  Database,
  Home,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface RefreshConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RefreshConfirmModal: React.FC<RefreshConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();

  // Handle keyboard shortcuts (Escape to cancel, Enter to confirm)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        // Prevent accidental triggers when typing in other inputs
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-tauri-drag-region="false"
      style={{ zIndex: 1000 }}
    >
      <div
        className="refresh-confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="refresh-modal-title"
      >
        {/* Header */}
        <div className="refresh-modal-header">
          <div className="refresh-modal-title-wrap">
            <div className="refresh-modal-icon-badge">
              <RotateCcw size={16} color="var(--accent)" />
            </div>
            <h2 id="refresh-modal-title" className="refresh-modal-title">
              {t.titleBar.refreshModalTitle}
            </h2>
          </div>
          <button
            className="icon-btn-close"
            onClick={onClose}
            title={t.titleBar.refreshModalCancel}
            aria-label={t.titleBar.refreshModalCancel}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="refresh-modal-body">
          <p className="refresh-modal-desc">
            {t.titleBar.refreshModalDesc}
          </p>

          <div className="refresh-modal-bullets">
            <div className="refresh-bullet-item">
              <div className="bullet-icon-box bullet-cyan">
                <Layers size={14} />
              </div>
              <span>{t.titleBar.refreshModalBulletTabs}</span>
            </div>
            <div className="refresh-bullet-item">
              <div className="bullet-icon-box bullet-purple">
                <Terminal size={14} />
              </div>
              <span>{t.titleBar.refreshModalBulletProcess}</span>
            </div>
            <div className="refresh-bullet-item">
              <div className="bullet-icon-box bullet-amber">
                <Database size={14} />
              </div>
              <span>{t.titleBar.refreshModalBulletStorage}</span>
            </div>
            <div className="refresh-bullet-item">
              <div className="bullet-icon-box bullet-emerald">
                <Home size={14} />
              </div>
              <span>{t.titleBar.refreshModalBulletCwd}</span>
            </div>
          </div>

          <div className="refresh-modal-warning-box">
            <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
            <span>{t.titleBar.refreshModalWarning}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="refresh-modal-footer">
          <button
            id="btn-cancel-refresh"
            className="btn-secondary"
            onClick={onClose}
          >
            {t.titleBar.refreshModalCancel}
          </button>
          <button
            id="btn-confirm-refresh"
            className="btn-primary btn-refresh-confirm"
            onClick={onConfirm}
            autoFocus
          >
            <RotateCcw size={14} />
            <span>{t.titleBar.refreshModalConfirm}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};
