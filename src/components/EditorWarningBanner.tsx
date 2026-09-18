import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface EditorWarningBannerProps {
  message: string;
}

/**
 * EditorWarningBanner
 * A persistent, slim inline banner displayed at the top of the editor
 * to caution users when editing sensitive shell configuration files
 * without blocking their workflow or saving capability.
 */
export const EditorWarningBanner: React.FC<EditorWarningBannerProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      data-testid="editor-warning-banner"
      role="alert"
      style={{
        padding: '6px 12px',
        borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
        background: 'rgba(245, 158, 11, 0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        flexShrink: 0,
        boxSizing: 'border-box',
        color: '#fef3c7',
      }}
    >
      <AlertTriangle
        size={14}
        color="#fbbf24"
        style={{ flexShrink: 0 }}
      />
      <span
        style={{
          fontWeight: 500,
          lineHeight: '1.4',
          letterSpacing: '0.01em',
        }}
      >
        {message}
      </span>
    </div>
  );
};
