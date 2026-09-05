import React, { useState, useRef, useEffect } from 'react';
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

  const [ratioX, setRatioX] = useState(0.5);
  const [ratioY, setRatioY] = useState(0.5);
  const [activeDrag, setActiveDrag] = useState<'x' | 'y' | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<'x' | 'y' | null>(null);

  // Reset default ratios per layout
  useEffect(() => {
    if (tab.layout === 'split-3-left-main') {
      setRatioX(0.55);
      setRatioY(0.5);
    } else if (tab.layout === 'split-3-top-main') {
      setRatioX(0.5);
      setRatioY(0.55);
    } else if (tab.layout === 'split-4-left-main') {
      setRatioX(0.55);
      setRatioY(0.5);
    } else {
      setRatioX(0.5);
      setRatioY(0.5);
    }
  }, [tab.layout]);

  const handleStartDrag = (axis: 'x' | 'y') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = axis;
    setActiveDrag(axis);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (isDraggingRef.current === 'x') {
        const offset = moveEvent.clientX - rect.left;
        const newRatio = Math.max(0.15, Math.min(0.85, offset / rect.width));
        setRatioX(newRatio);
      } else if (isDraggingRef.current === 'y') {
        const offset = moveEvent.clientY - rect.top;
        const newRatio = Math.max(0.15, Math.min(0.85, offset / rect.height));
        setRatioY(newRatio);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = null;
      setActiveDrag(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Trigger resize for fitAddon
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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

  // Dynamic grid styles when resized
  const getDynamicGridStyle = (): React.CSSProperties => {
    if (tab.isZoomed || tab.panes.length === 1 || tab.layout === 'single') {
      return {};
    }
    switch (tab.layout) {
      case 'split-2-h':
        return {
          gridTemplateColumns: `${(ratioX * 100).toFixed(2)}% calc(${(100 - ratioX * 100).toFixed(2)}% - 4px)`,
        };
      case 'split-2-v':
        return {
          gridTemplateRows: `${(ratioY * 100).toFixed(2)}% calc(${(100 - ratioY * 100).toFixed(2)}% - 4px)`,
        };
      case 'split-3-left-main':
        return {
          gridTemplateColumns: `${(ratioX * 100).toFixed(2)}% calc(${(100 - ratioX * 100).toFixed(2)}% - 4px)`,
          gridTemplateRows: `${(ratioY * 100).toFixed(2)}% calc(${(100 - ratioY * 100).toFixed(2)}% - 4px)`,
        };
      case 'split-3-top-main':
        return {
          gridTemplateColumns: `${(ratioX * 100).toFixed(2)}% calc(${(100 - ratioX * 100).toFixed(2)}% - 4px)`,
          gridTemplateRows: `${(ratioY * 100).toFixed(2)}% calc(${(100 - ratioY * 100).toFixed(2)}% - 4px)`,
        };
      case 'grid-4':
        return {
          gridTemplateColumns: `${(ratioX * 100).toFixed(2)}% calc(${(100 - ratioX * 100).toFixed(2)}% - 4px)`,
          gridTemplateRows: `${(ratioY * 100).toFixed(2)}% calc(${(100 - ratioY * 100).toFixed(2)}% - 4px)`,
        };
      default:
        return {};
    }
  };

  const displayedPanes = tab.isZoomed && activePane ? [activePane] : tab.panes;

  return (
    <div
      ref={containerRef}
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

      <div
        className={`panes-grid ${getLayoutGridClass()}`}
        style={getDynamicGridStyle()}
      >
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

      {/* Interactive Drag Dividers for Resizable Panes */}
      {isMultiPane && tab.layout === 'split-2-h' && (
        <div
          className={`pane-divider-x ${activeDrag === 'x' ? 'active-drag' : ''}`}
          style={{ left: `calc(${(ratioX * 100).toFixed(2)}% - 4px)` }}
          onMouseDown={handleStartDrag('x')}
        />
      )}

      {isMultiPane && tab.layout === 'split-2-v' && (
        <div
          className={`pane-divider-y ${activeDrag === 'y' ? 'active-drag' : ''}`}
          style={{ top: `calc(${(ratioY * 100).toFixed(2)}% - 4px)` }}
          onMouseDown={handleStartDrag('y')}
        />
      )}

      {isMultiPane && tab.layout === 'split-3-left-main' && (
        <>
          <div
            className={`pane-divider-x ${activeDrag === 'x' ? 'active-drag' : ''}`}
            style={{ left: `calc(${(ratioX * 100).toFixed(2)}% - 4px)` }}
            onMouseDown={handleStartDrag('x')}
          />
          <div
            className={`pane-divider-y ${activeDrag === 'y' ? 'active-drag' : ''}`}
            style={{
              left: `${(ratioX * 100).toFixed(2)}%`,
              right: 0,
              top: `calc(${(ratioY * 100).toFixed(2)}% - 4px)`,
            }}
            onMouseDown={handleStartDrag('y')}
          />
        </>
      )}

      {isMultiPane && tab.layout === 'grid-4' && (
        <>
          <div
            className={`pane-divider-x ${activeDrag === 'x' ? 'active-drag' : ''}`}
            style={{ left: `calc(${(ratioX * 100).toFixed(2)}% - 4px)` }}
            onMouseDown={handleStartDrag('x')}
          />
          <div
            className={`pane-divider-y ${activeDrag === 'y' ? 'active-drag' : ''}`}
            style={{ top: `calc(${(ratioY * 100).toFixed(2)}% - 4px)` }}
            onMouseDown={handleStartDrag('y')}
          />
        </>
      )}
    </div>
  );
};
