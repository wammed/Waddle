import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  calculateThumbGeometry,
  calculateTargetLineFromThumbTop,
  TerminalOverlayScrollbar,
  MIN_THUMB_HEIGHT,
  ScrollMetrics,
} from '../TerminalOverlayScrollbar';

describe('TerminalOverlayScrollbar - Geometry Calculation (O(1))', () => {
  it('returns canScroll: false when total lines do not exceed viewport rows', () => {
    const metrics: ScrollMetrics = {
      totalLines: 30,
      viewportRows: 30,
      baseY: 0,
      viewportY: 0,
      trackHeight: 600,
    };
    const geom = calculateThumbGeometry(metrics);
    expect(geom.canScroll).toBe(false);
    expect(geom.thumbHeight).toBe(0);
    expect(geom.thumbTop).toBe(0);
  });

  it('guarantees MIN_THUMB_HEIGHT (24px) even with 20,000 lines of scrollback', () => {
    const metrics: ScrollMetrics = {
      totalLines: 20000,
      viewportRows: 40,
      baseY: 19960,
      viewportY: 0,
      trackHeight: 800,
    };
    const geom = calculateThumbGeometry(metrics, MIN_THUMB_HEIGHT);
    expect(geom.canScroll).toBe(true);
    // 800 * (40 / 20000) = 1.6px, so MIN_THUMB_HEIGHT (24px) should be enforced
    expect(geom.thumbHeight).toBe(MIN_THUMB_HEIGHT);
    expect(geom.thumbTop).toBe(0);
  });

  it('correctly calculates bottom position when viewport is at baseY (auto-scroll)', () => {
    const trackHeight = 1000;
    const metrics: ScrollMetrics = {
      totalLines: 10000,
      viewportRows: 50,
      baseY: 9950,
      viewportY: 9950,
      trackHeight,
    };
    const geom = calculateThumbGeometry(metrics);
    expect(geom.canScroll).toBe(true);
    expect(geom.thumbHeight).toBe(MIN_THUMB_HEIGHT);
    expect(geom.thumbTop).toBe(trackHeight - MIN_THUMB_HEIGHT);
  });

  it('correctly calculates halfway scroll position with proportional thumb', () => {
    const trackHeight = 500;
    const metrics: ScrollMetrics = {
      totalLines: 200,
      viewportRows: 50,
      baseY: 150,
      viewportY: 75,
      trackHeight,
    };
    // ratio = 50 / 200 = 0.25 => 500 * 0.25 = 125px
    const geom = calculateThumbGeometry(metrics);
    expect(geom.canScroll).toBe(true);
    expect(geom.thumbHeight).toBe(125);
    // availableTrack = 500 - 125 = 375 => 375 * 0.5 = 188 (Math.round(187.5))
    expect(geom.thumbTop).toBe(188);
  });

  it('handles zero or negative trackHeight without throwing or dividing by zero', () => {
    const metrics: ScrollMetrics = {
      totalLines: 1000,
      viewportRows: 40,
      baseY: 960,
      viewportY: 500,
      trackHeight: 0,
    };
    const geom = calculateThumbGeometry(metrics);
    expect(geom.canScroll).toBe(false);
    expect(geom.thumbHeight).toBe(0);
    expect(geom.thumbTop).toBe(0);
  });
});

describe('TerminalOverlayScrollbar - Inverse Calculation (calculateTargetLineFromThumbTop)', () => {
  it('maps top 0 to line 0 and bottom to baseY', () => {
    const trackHeight = 800;
    const thumbHeight = 50;
    const baseY = 10000;

    expect(calculateTargetLineFromThumbTop(0, thumbHeight, trackHeight, baseY)).toBe(0);
    expect(calculateTargetLineFromThumbTop(750, thumbHeight, trackHeight, baseY)).toBe(10000);
  });

  it('clamps out-of-bounds pixel offsets safely', () => {
    const trackHeight = 800;
    const thumbHeight = 50;
    const baseY = 5000;

    expect(calculateTargetLineFromThumbTop(-100, thumbHeight, trackHeight, baseY)).toBe(0);
    expect(calculateTargetLineFromThumbTop(9999, thumbHeight, trackHeight, baseY)).toBe(5000);
  });

  it('returns 0 if baseY <= 0 or available track <= 0', () => {
    expect(calculateTargetLineFromThumbTop(100, 50, 50, 5000)).toBe(0);
    expect(calculateTargetLineFromThumbTop(100, 50, 800, 0)).toBe(0);
  });

  it('accurately maps 50% drag offset to 50% buffer position', () => {
    const trackHeight = 1000;
    const thumbHeight = 100; // availableTrack = 900
    const baseY = 20000;

    // halfway offset = 450px
    const targetLine = calculateTargetLineFromThumbTop(450, thumbHeight, trackHeight, baseY);
    expect(targetLine).toBe(10000);
  });
});

describe('TerminalOverlayScrollbar - Markup & Accessibility', () => {
  it('renders initial markup with role="scrollbar" and data-state="hidden"', () => {
    const html = renderToStaticMarkup(<TerminalOverlayScrollbar term={null} />);

    expect(html).toContain('role="scrollbar"');
    expect(html).toContain('data-state="hidden"');
    expect(html).toContain('terminal-overlay-scrollbar-track');
    expect(html).toContain('terminal-overlay-scrollbar-thumb');
  });

  it('accepts custom className', () => {
    const html = renderToStaticMarkup(
      <TerminalOverlayScrollbar term={null} className="custom-scrollbar" />
    );

    expect(html).toContain('custom-scrollbar');
  });
});
