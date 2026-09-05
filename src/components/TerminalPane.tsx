import React from 'react';
import { AppConfig, TerminalPaneInfo, TerminalTab } from '../types';
import { SingleTerminalView } from './SingleTerminalView';
import { Minimize2 } from 'lucide-react';
import { useI18n } from '../i18n';

interface TerminalPaneProps {
  tab: TerminalTab;
  config: AppConfig;
  isActive: boolean;
  onSelectPane: (tabId: string, paneId: string) => void;
  onClosePane: (tabId: string, paneId: string) => void;
  onToggleZoomPane: (tabId: string) => void;
  onUpdatePane: (tabId: string, paneId: string, updates: Partial<TerminalPaneInfo>) => void;
  onErrorDetected: (command: string, output: string, exitCode: number) => void;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  tab,
  config,
  isActive,
  onSelectPane,
  onClosePane,
  onToggleZoomPane,
  onUpdatePane,
  onErrorDetected,
}) => {
  const { t } = useI18n();
  const activePaneId = tab.activePaneId || tab.panes[0]?.id;
  const activePane = tab.panes.find((p) => p.id === activePaneId) || tab.panes[0];

  if (!tab.panes || tab.panes.length === 0) {
    return null;
  }

  const isMultiPane = tab.panes.length > 1 && !tab.isZoomed;

  const getLayoutGridClass = () => {
    if (tab.isZoomed || tab.panes.length === 1 || tab.layout === 'single') {
      return 'panes-grid-single';
    }
    switch (tab.layout) {
      case 'split-2-h':
        return 'panes-grid-split-2-h';
      case 'split-2-v':
        return 'panes-grid-split-2-v';
      case 'split-3-h':
        return 'panes-grid-split-3-h';
      case 'split-3-v':
        return 'panes-grid-split-3-v';
      case 'split-3-left-main':
        return 'panes-grid-split-3-left-main';
      case 'split-3-top-main':
        return 'panes-grid-split-3-top-main';
      case 'grid-4':
        return 'panes-grid-grid-4';
      case 'split-4-h':
        return 'panes-grid-split-4-h';
      case 'split-4-left-main':
        return 'panes-grid-split-4-left-main';
      default:
        return 'panes-grid-split-2-h';
    }
  };

  const displayedPanes = tab.isZoomed && activePane ? [activePane] : tab.panes;

  return (
    <div
      className={`terminal-wrapper ${isMultiPane ? 'multi-pane' : ''}`}
      style={{ display: isActive ? 'block' : 'none', position: 'relative' }}
    >
      {tab.isZoomed && (
        <div className="pane-zoom-banner">
          <span>{t.panes.zoomPane}</span>
          <button
            className="pane-zoom-restore-btn"
            onClick={() => onToggleZoomPane(tab.id)}
            title={t.panes.restorePane}
          >
            <Minimize2 size={11} />
            <span>{t.panes.restorePane}</span>
          </button>
        </div>
      )}

      <div className={`panes-grid ${getLayoutGridClass()}`}>
        {displayedPanes.map((pane, index) => {
          const isThisActive = pane.id === activePaneId;
          return (
            <SingleTerminalView
              key={pane.id}
              pane={pane}
              paneIndex={index}
              totalPanes={tab.isZoomed ? 1 : tab.panes.length}
              isActivePane={isThisActive}
              isTabActive={isActive}
              isZoomed={Boolean(tab.isZoomed)}
              config={config}
              slotClassName={`pane-slot-${index}`}
              onFocus={() => onSelectPane(tab.id, pane.id)}
              onClose={() => onClosePane(tab.id, pane.id)}
              onToggleZoom={() => onToggleZoomPane(tab.id)}
              onUpdatePane={(updates) => onUpdatePane(tab.id, pane.id, updates)}
              onErrorDetected={onErrorDetected}
            />
          );
        })}
      </div>
    </div>
  );
};
