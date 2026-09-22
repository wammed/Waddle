import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';

export interface ScrollMetrics {
  totalLines: number;
  viewportRows: number;
  baseY: number;
  viewportY: number;
  trackHeight: number;
}

export interface ThumbGeometry {
  thumbHeight: number;
  thumbTop: number;
  canScroll: boolean;
}

export const MIN_THUMB_HEIGHT = 24;
export const FADE_DELAY_MS = 700;
export const FADE_DURATION_MS = 250;

/**
 * O(1) calculation for scrollbar thumb height and position.
 * Does NOT iterate through the terminal buffer.
 */
export function calculateThumbGeometry(
  metrics: ScrollMetrics,
  minThumbHeight: number = MIN_THUMB_HEIGHT
): ThumbGeometry {
  const { totalLines, viewportRows, baseY, viewportY, trackHeight } = metrics;

  const scrollableLines = Math.max(0, baseY);
  if (scrollableLines <= 0 || trackHeight <= 0 || totalLines <= viewportRows) {
    return {
      thumbHeight: 0,
      thumbTop: 0,
      canScroll: false,
    };
  }

  // Ratio of viewport to total buffer lines
  const ratio = Math.min(1, Math.max(0, viewportRows / Math.max(1, totalLines)));
  const computedHeight = Math.round(trackHeight * ratio);
  const thumbHeight = Math.min(trackHeight, Math.max(minThumbHeight, computedHeight));

  const availableTrack = Math.max(0, trackHeight - thumbHeight);
  if (availableTrack === 0) {
    return {
      thumbHeight,
      thumbTop: 0,
      canScroll: false,
    };
  }

  const progress = Math.min(1, Math.max(0, viewportY / scrollableLines));
  const thumbTop = Math.round(progress * availableTrack);

  return {
    thumbHeight,
    thumbTop,
    canScroll: true,
  };
}

/**
 * Inverse O(1) calculation: maps thumb top pixel offset to terminal buffer line index.
 */
export function calculateTargetLineFromThumbTop(
  thumbTop: number,
  thumbHeight: number,
  trackHeight: number,
  baseY: number
): number {
  const availableTrack = trackHeight - thumbHeight;
  if (availableTrack <= 0 || baseY <= 0) {
    return 0;
  }
  const clampedTop = Math.min(availableTrack, Math.max(0, thumbTop));
  const progress = clampedTop / availableTrack;
  return Math.min(baseY, Math.max(0, Math.round(progress * baseY)));
}

export type ScrollbarState = 'hidden' | 'visible' | 'fading_out';

interface TerminalOverlayScrollbarProps {
  term: Terminal | null;
  className?: string;
}

export const TerminalOverlayScrollbar: React.FC<TerminalOverlayScrollbarProps> = ({
  term,
  className = '',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  // Direct DOM state references to avoid any React re-render during streaming or dragging
  const currentStateRef = useRef<ScrollbarState>('hidden');
  const fadeTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const isHoveredRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const lastTopRef = useRef<number>(-1);
  const lastHeightRef = useRef<number>(-1);
  const lastCanScrollRef = useRef<boolean>(false);

  const updateRafIdRef = useRef<number | null>(null);
  const dragRafIdRef = useRef<number | null>(null);

  const dragStartYRef = useRef<number>(0);
  const dragStartTopRef = useRef<number>(0);
  const latestDragClientYRef = useRef<number>(0);

  // Helper to clear pending animation/fade timers
  const clearTimers = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  // Set visual state with zero React re-renders (direct CSS class and property update)
  const setVisualState = useCallback((state: ScrollbarState) => {
    currentStateRef.current = state;
    const track = trackRef.current;
    if (!track) return;

    if (state === 'hidden') {
      track.style.opacity = '0';
      // If scrollable, maintain pointer-events auto so hover can wake up the scrollbar
      track.style.pointerEvents = lastCanScrollRef.current ? 'auto' : 'none';
      track.setAttribute('data-state', 'hidden');
    } else if (state === 'visible') {
      track.style.opacity = '1';
      track.style.pointerEvents = 'auto';
      track.setAttribute('data-state', 'visible');
    } else if (state === 'fading_out') {
      track.style.opacity = '0';
      track.style.pointerEvents = lastCanScrollRef.current ? 'auto' : 'none';
      track.setAttribute('data-state', 'fading_out');
    }
  }, []);

  // Schedule fadeout if not hovered or dragging
  const scheduleFadeOut = useCallback(() => {
    clearTimers();
    if (isHoveredRef.current || isDraggingRef.current) {
      return;
    }

    fadeTimerRef.current = window.setTimeout(() => {
      setVisualState('fading_out');
      hideTimerRef.current = window.setTimeout(() => {
        setVisualState('hidden');
      }, FADE_DURATION_MS);
    }, FADE_DELAY_MS);
  }, [clearTimers, setVisualState]);

  // Request visibility (e.g. on scroll, hover, or drag)
  const requestVisible = useCallback(() => {
    clearTimers();
    setVisualState('visible');
    if (!isHoveredRef.current && !isDraggingRef.current) {
      scheduleFadeOut();
    }
  }, [clearTimers, setVisualState, scheduleFadeOut]);

  // Read current metrics and update thumb geometry in DOM
  const updateGeometry = useCallback(() => {
    updateRafIdRef.current = null;
    if (!term || !trackRef.current || !thumbRef.current) return;

    const trackHeight = trackRef.current.clientHeight;
    const active = term.buffer.active;
    const metrics: ScrollMetrics = {
      totalLines: active.length,
      viewportRows: term.rows,
      baseY: active.baseY,
      viewportY: active.viewportY,
      trackHeight,
    };

    const geom = calculateThumbGeometry(metrics, MIN_THUMB_HEIGHT);

    // Early exit if geometry has not changed (e.g. while auto-scrolling at bottom during streaming)
    if (
      geom.thumbTop === lastTopRef.current &&
      geom.thumbHeight === lastHeightRef.current &&
      geom.canScroll === lastCanScrollRef.current
    ) {
      return;
    }

    lastTopRef.current = geom.thumbTop;
    lastHeightRef.current = geom.thumbHeight;
    lastCanScrollRef.current = geom.canScroll;

    if (!geom.canScroll) {
      thumbRef.current.style.display = 'none';
      trackRef.current.style.pointerEvents = 'none';
      if (currentStateRef.current !== 'hidden') {
        setVisualState('hidden');
      }
      return;
    }

    thumbRef.current.style.display = 'block';
    trackRef.current.style.pointerEvents = 'auto';
    thumbRef.current.style.height = `${geom.thumbHeight}px`;
    thumbRef.current.style.transform = `translate3d(0, ${geom.thumbTop}px, 0)`;
  }, [term, setVisualState]);

  // Vsync-throttled geometry update
  const scheduleUpdate = useCallback(() => {
    if (updateRafIdRef.current !== null) return;
    updateRafIdRef.current = window.requestAnimationFrame(updateGeometry);
  }, [updateGeometry]);

  // Drag handler execution in rAF loop (Coalesced Mouse/Pointer Events)
  const processDragStep = useCallback(() => {
    dragRafIdRef.current = null;
    if (!isDraggingRef.current || !term || !trackRef.current) return;

    const deltaY = latestDragClientYRef.current - dragStartYRef.current;
    const targetTop = dragStartTopRef.current + deltaY;
    const trackHeight = trackRef.current.clientHeight;
    const thumbHeight = lastHeightRef.current > 0 ? lastHeightRef.current : MIN_THUMB_HEIGHT;
    const baseY = term.buffer.active.baseY;

    const targetLine = calculateTargetLineFromThumbTop(targetTop, thumbHeight, trackHeight, baseY);
    term.scrollToLine(targetLine);
    scheduleUpdate();
  }, [term, scheduleUpdate]);

  // Window-level move and up handlers for smooth, unbreakable dragging
  const handleWindowPointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current) return;
    latestDragClientYRef.current = e.clientY;
    if (dragRafIdRef.current === null) {
      dragRafIdRef.current = window.requestAnimationFrame(processDragStep);
    }
  }, [processDragStep]);

  const handleWindowPointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerUp);

    if (dragRafIdRef.current !== null) {
      window.cancelAnimationFrame(dragRafIdRef.current);
      dragRafIdRef.current = null;
    }

    if (!isHoveredRef.current) {
      scheduleFadeOut();
    }
  }, [handleWindowPointerMove, scheduleFadeOut]);

  const startDrag = useCallback((clientY: number, initialTop: number, pointerId?: number) => {
    isDraggingRef.current = true;
    dragStartYRef.current = clientY;
    dragStartTopRef.current = initialTop;
    latestDragClientYRef.current = clientY;

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    if (thumbRef.current && pointerId !== undefined) {
      try {
        thumbRef.current.setPointerCapture(pointerId);
      } catch {
        // ignore
      }
    }

    requestVisible();
  }, [handleWindowPointerMove, handleWindowPointerUp, requestVisible]);

  // Attach terminal listeners
  useEffect(() => {
    if (!term) return;

    // Trigger update on terminal scroll
    const scrollDisp = term.onScroll(() => {
      scheduleUpdate();
      requestVisible();
    });

    // Trigger update when lines are fed (PTY streaming output)
    const lineFeedDisp = term.onLineFeed(() => {
      scheduleUpdate();
      // If user is scrolled up viewing history, also trigger visible state
      if (term.buffer.active.viewportY < term.buffer.active.baseY) {
        requestVisible();
      }
    });

    // Trigger update when write is parsed (streaming batch completed)
    const writeParsedDisp = term.onWriteParsed ? term.onWriteParsed(() => {
      scheduleUpdate();
    }) : null;

    // ResizeObserver on track element to handle container resizes
    let resizeObserver: ResizeObserver | null = null;
    if (trackRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        scheduleUpdate();
      });
      resizeObserver.observe(trackRef.current);
    }

    // Initial calculation
    scheduleUpdate();

    return () => {
      scrollDisp.dispose();
      lineFeedDisp.dispose();
      if (writeParsedDisp) writeParsedDisp.dispose();
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      if (updateRafIdRef.current !== null) {
        window.cancelAnimationFrame(updateRafIdRef.current);
      }
      if (dragRafIdRef.current !== null) {
        window.cancelAnimationFrame(dragRafIdRef.current);
      }
      clearTimers();
    };
  }, [term, scheduleUpdate, requestVisible, clearTimers, handleWindowPointerMove, handleWindowPointerUp]);

  // Pointer event handlers for Thumb
  const handleThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTop = lastTopRef.current >= 0 ? lastTopRef.current : 0;
    startDrag(e.clientY, currentTop, e.pointerId);
  };

  // Track click handler (jump or center thumb at clicked position)
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target === thumbRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    if (!term || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = rect.height;
    const thumbHeight = lastHeightRef.current > 0 ? lastHeightRef.current : MIN_THUMB_HEIGHT;

    // Center thumb on click point
    const targetTop = clickY - thumbHeight / 2;
    const baseY = term.buffer.active.baseY;
    const targetLine = calculateTargetLineFromThumbTop(targetTop, thumbHeight, trackHeight, baseY);

    term.scrollToLine(targetLine);
    scheduleUpdate();

    const clampedTop = Math.min(trackHeight - thumbHeight, Math.max(0, targetTop));
    startDrag(e.clientY, clampedTop, e.pointerId);
  };

  // Track hover listeners
  const handlePointerEnter = () => {
    if (!lastCanScrollRef.current) return;
    isHoveredRef.current = true;
    requestVisible();
  };

  const handlePointerMove = () => {
    if (!lastCanScrollRef.current) return;
    isHoveredRef.current = true;
    if (currentStateRef.current !== 'visible') {
      requestVisible();
    }
  };

  const handlePointerLeave = () => {
    isHoveredRef.current = false;
    if (!isDraggingRef.current) {
      scheduleFadeOut();
    }
  };

  return (
    <div
      ref={trackRef}
      className={`terminal-overlay-scrollbar-track ${className}`}
      onPointerDown={handleTrackPointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      // Block text selection and mousedown propagation
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      data-state="hidden"
      style={{
        opacity: 0,
        pointerEvents: 'none',
      }}
      aria-label="Terminal scrollbar"
      role="scrollbar"
    >
      <div
        ref={thumbRef}
        className="terminal-overlay-scrollbar-thumb"
        onPointerDown={handleThumbPointerDown}
      />
    </div>
  );
};
