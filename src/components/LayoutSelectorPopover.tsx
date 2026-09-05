import React, { useEffect, useRef } from 'react';
import { PaneLayout } from '../types';
import { useI18n } from '../i18n';
import { X, Check } from 'lucide-react';

interface LayoutSelectorPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: PaneLayout;
  onSelectLayout: (layout: PaneLayout) => void;
}

export const LayoutSelectorPopover: React.FC<LayoutSelectorPopoverProps> = ({
  isOpen,
  onClose,
  currentLayout,
  onSelectLayout,
}) => {
  const { t } = useI18n();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Visual layout miniature icons
  const renderPreview = (layout: PaneLayout) => {
    const blockStyle = (bg = 'rgba(255, 255, 255, 0.4)') => ({
      background: bg,
      borderRadius: '1.5px',
    });

    switch (layout) {
      case 'single':
        return (
          <div className="layout-preview-icon" style={{ padding: '2px' }}>
            <div style={{ ...blockStyle('var(--accent)'), flex: 1, width: '100%', height: '100%' }} />
          </div>
        );
      case 'split-2-h':
        return (
          <div className="layout-preview-icon" style={{ flexDirection: 'row' }}>
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
          </div>
        );
      case 'split-2-v':
        return (
          <div className="layout-preview-icon" style={{ flexDirection: 'column' }}>
            <div style={{ ...blockStyle(), width: '100%', flex: 1 }} />
            <div style={{ ...blockStyle(), width: '100%', flex: 1 }} />
          </div>
        );
      case 'split-3-left-main':
        return (
          <div className="layout-preview-icon" style={{ flexDirection: 'row' }}>
            <div style={{ ...blockStyle(), flex: 1.2, height: '100%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.5px', height: '100%' }}>
              <div style={{ ...blockStyle(), flex: 1, width: '100%' }} />
              <div style={{ ...blockStyle(), flex: 1, width: '100%' }} />
            </div>
          </div>
        );
      case 'split-3-top-main':
        return (
          <div className="layout-preview-icon" style={{ flexDirection: 'column' }}>
            <div style={{ ...blockStyle(), width: '100%', flex: 1.2 }} />
            <div style={{ display: 'flex', flexDirection: 'row', flex: 1, gap: '1.5px', width: '100%' }}>
              <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
              <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
            </div>
          </div>
        );
      case 'split-3-h':
        return (
          <div className="layout-preview-icon" style={{ flexDirection: 'row' }}>
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
          </div>
        );
      case 'split-3-v':
        return (
          <div className="layout-preview-icon" style={{ flexDirection: 'column' }}>
            <div style={{ ...blockStyle(), width: '100%', flex: 1 }} />
            <div style={{ ...blockStyle(), width: '100%', flex: 1 }} />
            <div style={{ ...blockStyle(), width: '100%', flex: 1 }} />
          </div>
        );
      case 'grid-4':
        return (
          <div className="layout-preview-icon" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '1.5px' }}>
            <div style={blockStyle()} />
            <div style={blockStyle()} />
            <div style={blockStyle()} />
            <div style={blockStyle()} />
          </div>
        );
      case 'split-4-left-main':
        return (
          <div className="layout-preview-icon" style={{ flexDirection: 'row' }}>
            <div style={{ ...blockStyle(), flex: 1.3, height: '100%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1.5px', height: '100%' }}>
              <div style={{ ...blockStyle(), flex: 1, width: '100%' }} />
              <div style={{ ...blockStyle(), flex: 1, width: '100%' }} />
              <div style={{ ...blockStyle(), flex: 1, width: '100%' }} />
            </div>
          </div>
        );
      case 'split-4-h':
        return (
          <div className="layout-preview-icon" style={{ flexDirection: 'row' }}>
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
            <div style={{ ...blockStyle(), flex: 1, height: '100%' }} />
          </div>
        );
    }
  };

  const sections: {
    category: string;
    options: { layout: PaneLayout; name: string; keyTag?: string }[];
  }[] = [
    {
      category: t.panes.paneCount1,
      options: [
        { layout: 'single', name: t.panes.single, keyTag: 'Alt+1' },
      ],
    },
    {
      category: t.panes.paneCount2,
      options: [
        { layout: 'split-2-h', name: t.panes.split2H, keyTag: 'Alt+2' },
        { layout: 'split-2-v', name: t.panes.split2V },
      ],
    },
    {
      category: t.panes.paneCount3,
      options: [
        { layout: 'split-3-left-main', name: t.panes.split3LeftMain, keyTag: 'Alt+3' },
        { layout: 'split-3-top-main', name: t.panes.split3TopMain },
        { layout: 'split-3-h', name: t.panes.split3H },
        { layout: 'split-3-v', name: t.panes.split3V },
      ],
    },
    {
      category: t.panes.paneCount4,
      options: [
        { layout: 'grid-4', name: t.panes.grid4, keyTag: 'Alt+4' },
        { layout: 'split-4-left-main', name: t.panes.split4LeftMain },
        { layout: 'split-4-h', name: t.panes.split4H },
      ],
    },
  ];

  return (
    <>
      <div className="layout-popover-backdrop" onClick={onClose} />
      <div className="layout-popover" ref={popoverRef} onClick={(e) => e.stopPropagation()}>
        <div className="layout-popover-header">
          <span>{t.panes.layoutSelectorTitle}</span>
          <button
            className="action-btn"
            style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}
            onClick={onClose}
          >
            <X size={14} />
          </button>
        </div>

        {sections.map((section) => (
          <div key={section.category}>
            <div className="layout-section-title">{section.category}</div>
            <div className="layout-grid-options">
              {section.options.map((opt) => {
                const isActive = currentLayout === opt.layout;
                return (
                  <div
                    key={opt.layout}
                    className={`layout-option-card ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectLayout(opt.layout);
                      onClose();
                    }}
                  >
                    {renderPreview(opt.layout)}
                    <div className="layout-option-details">
                      <span className="layout-option-name">{opt.name}</span>
                      {opt.keyTag && <span className="layout-option-key">{opt.keyTag}</span>}
                    </div>
                    {isActive && <Check size={12} color="var(--accent)" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
