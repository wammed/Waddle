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
  onUpdateSplitRatios?: (tabId: string, ratios: Record<string, number>) => void;
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
  onUpdateSplitRatios,
}) => {
  const { t } = useI18n();
  const activePaneId = tab.activePaneId || tab.panes[0]?.id;
  const activePane = tab.panes.find((p) => p.id === activePaneId) || tab.panes[0];

  // Ratios for 2-way splits & main-splits
  const [ratioX, setRatioX] = useState(tab.splitRatios?.ratioX ?? 0.5);
  const [ratioY, setRatioY] = useState(tab.splitRatios?.ratioY ?? 0.5);

  // Multi-column / multi-row ratios for 3-pane & 4-pane layouts
  const [ratioX1, setRatioX1] = useState(tab.splitRatios?.ratioX1 ?? 0.333);
  const [ratioX2, setRatioX2] = useState(tab.splitRatios?.ratioX2 ?? 0.667);
  const [ratioX3, setRatioX3] = useState(tab.splitRatios?.ratioX3 ?? 0.75);

  const [ratioY1, setRatioY1] = useState(tab.splitRatios?.ratioY1 ?? 0.333);
  const [ratioY2, setRatioY2] = useState(tab.splitRatios?.ratioY2 ?? 0.667);

  const [activeDrag, setActiveDrag] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<string | null>(null);

  // Reset default ratios whenever tab layout changes unless customized
  useEffect(() => {
    if (tab.splitRatios) {
      if (tab.splitRatios.ratioX !== undefined) setRatioX(tab.splitRatios.ratioX);
      if (tab.splitRatios.ratioY !== undefined) setRatioY(tab.splitRatios.ratioY);
      if (tab.splitRatios.ratioX1 !== undefined) setRatioX1(tab.splitRatios.ratioX1);
      if (tab.splitRatios.ratioX2 !== undefined) setRatioX2(tab.splitRatios.ratioX2);
      if (tab.splitRatios.ratioX3 !== undefined) setRatioX3(tab.splitRatios.ratioX3);
      if (tab.splitRatios.ratioY1 !== undefined) setRatioY1(tab.splitRatios.ratioY1);
      if (tab.splitRatios.ratioY2 !== undefined) setRatioY2(tab.splitRatios.ratioY2);
      return;
    }
    switch (tab.layout) {
      case 'split-2-h':
        setRatioX(0.5);
        break;
      case 'split-2-v':
        setRatioY(0.5);
        break;
      case 'split-3-left-main':
        setRatioX(0.55);
        setRatioY(0.5);
        break;
      case 'split-3-top-main':
        setRatioX(0.5);
        setRatioY(0.55);
        break;
      case 'split-3-h':
        setRatioX1(0.333);
        setRatioX2(0.667);
        break;
      case 'split-3-v':
        setRatioY1(0.333);
        setRatioY2(0.667);
        break;
      case 'grid-4':
        setRatioX(0.5);
        setRatioY(0.5);
        break;
      case 'split-4-left-main':
        setRatioX(0.55);
        setRatioY1(0.333);
        setRatioY2(0.667);
        break;
      case 'split-4-h':
        setRatioX1(0.25);
        setRatioX2(0.5);
        setRatioX3(0.75);
        break;
      default:
        setRatioX(0.5);
        setRatioY(0.5);
        break;
    }
  }, [tab.layout]);

  const handleStartDrag = (dragType: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = dragType;
    setActiveDrag(dragType);

    let animationFrameId: number | null = null;
    let pendingUpdates: { [key: string]: number } = {};

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawRatioX = (moveEvent.clientX - rect.left) / rect.width;
      const rawRatioY = (moveEvent.clientY - rect.top) / rect.height;

      const type = isDraggingRef.current;
      if (type === 'x' || type === 'xy') {
        pendingUpdates['x'] = Math.max(0.12, Math.min(0.88, rawRatioX));
      }
      if (type === 'y' || type === 'xy') {
        pendingUpdates['y'] = Math.max(0.12, Math.min(0.88, rawRatioY));
      }
      if (type === 'x1') {
        setRatioX2((curX2) => {
          const maxVal = Math.max(0.16, curX2 - 0.08);
          pendingUpdates['x1'] = Math.max(0.08, Math.min(maxVal, rawRatioX));
          return curX2;
        });
      }
      if (type === 'x2') {
        if (tab.layout === 'split-4-h') {
          setRatioX1((curX1) => {
            setRatioX3((curX3) => {
              const minVal = curX1 + 0.08;
              const maxVal = curX3 - 0.08;
              pendingUpdates['x2'] = Math.max(minVal, Math.min(maxVal, rawRatioX));
              return curX3;
            });
            return curX1;
          });
        } else {
          setRatioX1((curX1) => {
            const minVal = curX1 + 0.08;
            pendingUpdates['x2'] = Math.max(minVal, Math.min(0.92, rawRatioX));
            return curX1;
          });
        }
      }
      if (type === 'x3') {
        setRatioX2((curX2) => {
          const minVal = curX2 + 0.08;
          pendingUpdates['x3'] = Math.max(minVal, Math.min(0.92, rawRatioX));
          return curX2;
        });
      }
      if (type === 'y1') {
        setRatioY2((curY2) => {
          const maxVal = Math.max(0.16, curY2 - 0.08);
          pendingUpdates['y1'] = Math.max(0.08, Math.min(maxVal, rawRatioY));
          return curY2;
        });
      }
      if (type === 'y2') {
        setRatioY1((curY1) => {
          const minVal = curY1 + 0.08;
          pendingUpdates['y2'] = Math.max(minVal, Math.min(0.92, rawRatioY));
          return curY1;
        });
      }

      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          animationFrameId = null;
          if (pendingUpdates['x'] !== undefined) setRatioX(pendingUpdates['x']);
          if (pendingUpdates['y'] !== undefined) setRatioY(pendingUpdates['y']);
          if (pendingUpdates['x1'] !== undefined) setRatioX1(pendingUpdates['x1']);
          if (pendingUpdates['x2'] !== undefined) setRatioX2(pendingUpdates['x2']);
          if (pendingUpdates['x3'] !== undefined) setRatioX3(pendingUpdates['x3']);
          if (pendingUpdates['y1'] !== undefined) setRatioY1(pendingUpdates['y1']);
          if (pendingUpdates['y2'] !== undefined) setRatioY2(pendingUpdates['y2']);
        });
      }
    };

    const handleMouseUp = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (pendingUpdates['x'] !== undefined) setRatioX(pendingUpdates['x']);
      if (pendingUpdates['y'] !== undefined) setRatioY(pendingUpdates['y']);
      if (pendingUpdates['x1'] !== undefined) setRatioX1(pendingUpdates['x1']);
      if (pendingUpdates['x2'] !== undefined) setRatioX2(pendingUpdates['x2']);
      if (pendingUpdates['x3'] !== undefined) setRatioX3(pendingUpdates['x3']);
      if (pendingUpdates['y1'] !== undefined) setRatioY1(pendingUpdates['y1']);
      if (pendingUpdates['y2'] !== undefined) setRatioY2(pendingUpdates['y2']);

      isDraggingRef.current = null;
      setActiveDrag(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.dispatchEvent(new Event('resize'));

      onUpdateSplitRatios?.(tab.id, {
        ratioX: pendingUpdates['x'] ?? ratioX,
        ratioY: pendingUpdates['y'] ?? ratioY,
        ratioX1: pendingUpdates['x1'] ?? ratioX1,
        ratioX2: pendingUpdates['x2'] ?? ratioX2,
        ratioX3: pendingUpdates['x3'] ?? ratioX3,
        ratioY1: pendingUpdates['y1'] ?? ratioY1,
        ratioY2: pendingUpdates['y2'] ?? ratioY2,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Keyboard resize: Ctrl+Alt+Arrow keys adjust active split ratio
  useEffect(() => {
    if (!isActive || tab.layout === 'single') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setRatioX((rx) => {
            const next = Math.max(0.15, Math.min(0.85, rx - 0.05));
            onUpdateSplitRatios?.(tab.id, { ratioX: next, ratioY, ratioX1, ratioX2, ratioX3, ratioY1, ratioY2 });
            return next;
          });
          window.dispatchEvent(new Event('resize'));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setRatioX((rx) => {
            const next = Math.max(0.15, Math.min(0.85, rx + 0.05));
            onUpdateSplitRatios?.(tab.id, { ratioX: next, ratioY, ratioX1, ratioX2, ratioX3, ratioY1, ratioY2 });
            return next;
          });
          window.dispatchEvent(new Event('resize'));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setRatioY((ry) => {
            const next = Math.max(0.15, Math.min(0.85, ry - 0.05));
            onUpdateSplitRatios?.(tab.id, { ratioX, ratioY: next, ratioX1, ratioX2, ratioX3, ratioY1, ratioY2 });
            return next;
          });
          window.dispatchEvent(new Event('resize'));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setRatioY((ry) => {
            const next = Math.max(0.15, Math.min(0.85, ry + 0.05));
            onUpdateSplitRatios?.(tab.id, { ratioX, ratioY: next, ratioX1, ratioX2, ratioX3, ratioY1, ratioY2 });
            return next;
          });
          window.dispatchEvent(new Event('resize'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, tab.id, tab.layout, ratioX, ratioY, ratioX1, ratioX2, ratioX3, ratioY1, ratioY2, onUpdateSplitRatios]);

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

  // Dynamic grid styles when resized across all 9 multi-pane layouts
  const getDynamicGridStyle = (): React.CSSProperties => {
    if (tab.isZoomed || tab.panes.length === 1 || tab.layout === 'single') {
      return {};
    }
    switch (tab.layout) {
      case 'split-2-h':
        return {
          gridTemplateColumns: `${(ratioX * 100).toFixed(2)}% calc(${(100 - ratioX * 100).toFixed(2)}% - 4px)`,
          gridTemplateRows: '1fr',
        };
      case 'split-2-v':
        return {
          gridTemplateColumns: '1fr',
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
      case 'split-3-h':
        return {
          gridTemplateColumns: `${(ratioX1 * 100).toFixed(2)}% ${((ratioX2 - ratioX1) * 100).toFixed(2)}% calc(${(100 - ratioX2 * 100).toFixed(2)}% - 8px)`,
          gridTemplateRows: '1fr',
        };
      case 'split-3-v':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: `${(ratioY1 * 100).toFixed(2)}% ${((ratioY2 - ratioY1) * 100).toFixed(2)}% calc(${(100 - ratioY2 * 100).toFixed(2)}% - 8px)`,
        };
      case 'grid-4':
        return {
          gridTemplateColumns: `${(ratioX * 100).toFixed(2)}% calc(${(100 - ratioX * 100).toFixed(2)}% - 4px)`,
          gridTemplateRows: `${(ratioY * 100).toFixed(2)}% calc(${(100 - ratioY * 100).toFixed(2)}% - 4px)`,
        };
      case 'split-4-left-main':
        return {
          gridTemplateColumns: `${(ratioX * 100).toFixed(2)}% calc(${(100 - ratioX * 100).toFixed(2)}% - 4px)`,
          gridTemplateRows: `${(ratioY1 * 100).toFixed(2)}% ${((ratioY2 - ratioY1) * 100).toFixed(2)}% calc(${(100 - ratioY2 * 100).toFixed(2)}% - 8px)`,
        };
      case 'split-4-h':
        return {
          gridTemplateColumns: `${(ratioX1 * 100).toFixed(2)}% ${((ratioX2 - ratioX1) * 100).toFixed(2)}% ${((ratioX3 - ratioX2) * 100).toFixed(2)}% calc(${(100 - ratioX3 * 100).toFixed(2)}% - 12px)`,
          gridTemplateRows: '1fr',
        };
      default:
        return {};
    }
  };

  const displayedPanes = tab.isZoomed && activePane ? [activePane] : tab.panes;

  const getOverlayCursor = () => {
    if (!activeDrag) return 'default';
    if (activeDrag === 'xy') return 'move';
    if (activeDrag.startsWith('x')) return 'col-resize';
    return 'row-resize';
  };

  return (
    <div
      ref={containerRef}
      className={`terminal-wrapper ${isMultiPane ? 'multi-pane' : ''} ${activeDrag ? 'is-dragging-divider' : ''}`}
      style={{ display: isActive ? 'block' : 'none', position: 'relative' }}
    >
      {activeDrag && (
        <div
          className="pane-drag-overlay"
          style={{ cursor: getOverlayCursor() }}
        />
      )}
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
              isResizing={Boolean(activeDrag !== null)}
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

      {/* Interactive Drag Dividers for All 9 Multi-Pane Layouts */}

      {/* 2 Panes */}
      {isMultiPane && tab.layout === 'split-2-h' && (
        <div
          className={`pane-divider-x ${activeDrag === 'x' ? 'active-drag' : ''}`}
          style={{ left: `${(ratioX * 100).toFixed(2)}%` }}
          onMouseDown={handleStartDrag('x')}
        />
      )}

      {isMultiPane && tab.layout === 'split-2-v' && (
        <div
          className={`pane-divider-y ${activeDrag === 'y' ? 'active-drag' : ''}`}
          style={{ top: `${(ratioY * 100).toFixed(2)}%` }}
          onMouseDown={handleStartDrag('y')}
        />
      )}

      {/* 3 Panes */}
      {isMultiPane && tab.layout === 'split-3-left-main' && (
        <>
          <div
            className={`pane-divider-x ${activeDrag === 'x' ? 'active-drag' : ''}`}
            style={{ left: `${(ratioX * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('x')}
          />
          <div
            className={`pane-divider-y ${activeDrag === 'y' ? 'active-drag' : ''}`}
            style={{
              left: `${(ratioX * 100).toFixed(2)}%`,
              right: 0,
              top: `${(ratioY * 100).toFixed(2)}%`,
            }}
            onMouseDown={handleStartDrag('y')}
          />
        </>
      )}

      {isMultiPane && tab.layout === 'split-3-top-main' && (
        <>
          <div
            className={`pane-divider-y ${activeDrag === 'y' ? 'active-drag' : ''}`}
            style={{ top: `${(ratioY * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('y')}
          />
          <div
            className={`pane-divider-x ${activeDrag === 'x' ? 'active-drag' : ''}`}
            style={{
              top: `${(ratioY * 100).toFixed(2)}%`,
              bottom: 0,
              left: `${(ratioX * 100).toFixed(2)}%`,
            }}
            onMouseDown={handleStartDrag('x')}
          />
        </>
      )}

      {isMultiPane && tab.layout === 'split-3-h' && (
        <>
          <div
            className={`pane-divider-x ${activeDrag === 'x1' ? 'active-drag' : ''}`}
            style={{ left: `${(ratioX1 * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('x1')}
          />
          <div
            className={`pane-divider-x ${activeDrag === 'x2' ? 'active-drag' : ''}`}
            style={{ left: `${(ratioX2 * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('x2')}
          />
        </>
      )}

      {isMultiPane && tab.layout === 'split-3-v' && (
        <>
          <div
            className={`pane-divider-y ${activeDrag === 'y1' ? 'active-drag' : ''}`}
            style={{ top: `${(ratioY1 * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('y1')}
          />
          <div
            className={`pane-divider-y ${activeDrag === 'y2' ? 'active-drag' : ''}`}
            style={{ top: `${(ratioY2 * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('y2')}
          />
        </>
      )}

      {/* 4 Panes */}
      {isMultiPane && tab.layout === 'grid-4' && (
        <>
          <div
            className={`pane-divider-x ${activeDrag === 'x' ? 'active-drag' : ''}`}
            style={{ left: `${(ratioX * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('x')}
          />
          <div
            className={`pane-divider-y ${activeDrag === 'y' ? 'active-drag' : ''}`}
            style={{
              left: 0,
              width: `${(ratioX * 100).toFixed(2)}%`,
              top: `${(ratioY * 100).toFixed(2)}%`,
            }}
            onMouseDown={handleStartDrag('y')}
          />
          <div
            className={`pane-divider-y ${activeDrag === 'y' ? 'active-drag' : ''}`}
            style={{
              left: `${(ratioX * 100).toFixed(2)}%`,
              right: 0,
              top: `${(ratioY * 100).toFixed(2)}%`,
            }}
            onMouseDown={handleStartDrag('y')}
          />
          <div
            className={`pane-divider-corner ${activeDrag === 'xy' ? 'active-drag' : ''}`}
            style={{
              left: `${(ratioX * 100).toFixed(2)}%`,
              top: `${(ratioY * 100).toFixed(2)}%`,
            }}
            onMouseDown={handleStartDrag('xy')}
          />
        </>
      )}

      {isMultiPane && tab.layout === 'split-4-left-main' && (
        <>
          <div
            className={`pane-divider-x ${activeDrag === 'x' ? 'active-drag' : ''}`}
            style={{ left: `${(ratioX * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('x')}
          />
          <div
            className={`pane-divider-y ${activeDrag === 'y1' ? 'active-drag' : ''}`}
            style={{
              left: `${(ratioX * 100).toFixed(2)}%`,
              right: 0,
              top: `${(ratioY1 * 100).toFixed(2)}%`,
            }}
            onMouseDown={handleStartDrag('y1')}
          />
          <div
            className={`pane-divider-y ${activeDrag === 'y2' ? 'active-drag' : ''}`}
            style={{
              left: `${(ratioX * 100).toFixed(2)}%`,
              right: 0,
              top: `${(ratioY2 * 100).toFixed(2)}%`,
            }}
            onMouseDown={handleStartDrag('y2')}
          />
        </>
      )}

      {isMultiPane && tab.layout === 'split-4-h' && (
        <>
          <div
            className={`pane-divider-x ${activeDrag === 'x1' ? 'active-drag' : ''}`}
            style={{ left: `${(ratioX1 * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('x1')}
          />
          <div
            className={`pane-divider-x ${activeDrag === 'x2' ? 'active-drag' : ''}`}
            style={{ left: `${(ratioX2 * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('x2')}
          />
          <div
            className={`pane-divider-x ${activeDrag === 'x3' ? 'active-drag' : ''}`}
            style={{ left: `${(ratioX3 * 100).toFixed(2)}%` }}
            onMouseDown={handleStartDrag('x3')}
          />
        </>
      )}
    </div>
  );
};
