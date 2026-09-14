import { Terminal } from '@xterm/xterm';
import { KittyPlacement, KittyVirtualPlacement } from './types';
import { KittyLruCache } from './lruCache';
import {
  isPlaceholderCell,
  decodePlaceholderCell,
  computePlaceholderUV,
  DecodedPlaceholder,
  resolveImageFromCache,
} from './unicodePlaceholder';

export class KittyCanvasRenderer {
  private term: Terminal;
  private cache: KittyLruCache;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private screenElement: HTMLElement | null = null;
  private isCanvasClear: boolean = true;
  private isDisposed: boolean = false;

  constructor(term: Terminal, cache: KittyLruCache) {
    this.term = term;
    this.cache = cache;
  }

  public mountCanvas(container: HTMLElement): void {
    const screen = container.querySelector('.xterm-screen') as HTMLElement | null;
    this.screenElement = screen || container;

    // Clean up any stale kitty graphics canvases to prevent duplicate ghost layers
    const existing = typeof container.querySelectorAll === 'function'
      ? container.querySelectorAll('.xterm-kitty-graphics-layer')
      : [];
    existing.forEach((el: Element) => el.remove());

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'xterm-kitty-graphics-layer';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';

    // Mount Kitty canvas at layer 0 (behind text glyphs) so regular terminal text renders on top
    this.canvas.style.zIndex = '0';

    if (this.screenElement.firstChild) {
      this.screenElement.insertBefore(this.canvas, this.screenElement.firstChild);
    } else {
      this.screenElement.appendChild(this.canvas);
    }

    this.ctx = this.canvas.getContext('2d');
    this.syncCanvasSize();
  }

  public syncCanvasSize(): void {
    if (!this.canvas || !this.screenElement) return;
    const dpr = window.devicePixelRatio || 1;
    const width = this.screenElement.clientWidth;
    const height = this.screenElement.clientHeight;

    const targetWidth = Math.max(1, Math.round(width * dpr));
    const targetHeight = Math.max(1, Math.round(height * dpr));

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
  }

  public getScreenElement(): HTMLElement | null {
    return this.screenElement;
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  public getContext(): CanvasRenderingContext2D | null {
    return this.ctx;
  }

  public getIsCanvasClear(): boolean {
    return this.isCanvasClear;
  }

  public setIsCanvasClear(clear: boolean): void {
    this.isCanvasClear = clear;
  }

  public clearCanvas(): void {
    if (!this.ctx || !this.screenElement) return;
    const width = this.screenElement.clientWidth;
    const height = this.screenElement.clientHeight;
    this.ctx.clearRect(0, 0, width, height);
    this.isCanvasClear = true;
  }

  public getTerminalPadding(): { left: number; top: number } {
    if (!this.screenElement) return { left: 0, top: 0 };

    const termEl = (this.screenElement.closest?.('.xterm') ||
      this.screenElement.querySelector?.('.xterm')) as HTMLElement | null;
    if (termEl && this.canvas && this.canvas.parentElement !== this.screenElement) {
      const style = window.getComputedStyle(termEl);
      return {
        left: parseFloat(style.paddingLeft) || 0,
        top: parseFloat(style.paddingTop) || 0,
      };
    }

    const style = window.getComputedStyle(this.screenElement);
    return {
      left: parseFloat(style.paddingLeft) || 0,
      top: parseFloat(style.paddingTop) || 0,
    };
  }

  public getCellWidth(): number {
    if (this.term.cols > 0 && this.screenElement) {
      return this.screenElement.clientWidth / this.term.cols;
    }
    return 9; // default fallback cell width
  }

  public getCellHeight(): number {
    if (this.term.rows > 0 && this.screenElement) {
      return this.screenElement.clientHeight / this.term.rows;
    }
    return 18; // default fallback cell height
  }

  public scanPlaceholderGridDimensions(
    virtualPlacements: Map<number, KittyVirtualPlacement>,
    lastTransmittedImageId: number
  ): void {
    if (!this.term?.buffer?.active) return;
    const buffer = this.term.buffer.active;
    const viewportY = buffer.viewportY;
    const termRows = this.term.rows || 24;
    const termCols = this.term.cols || 80;

    let prevDecoded: DecodedPlaceholder | null = null;

    for (let row = 0; row < termRows; row++) {
      const line = buffer.getLine(viewportY + row);
      if (!line) continue;
      prevDecoded = null;

      for (let col = 0; col < termCols; col++) {
        const cell = line.getCell(col);
        if (!cell || !isPlaceholderCell(cell)) {
          if (col === 0) prevDecoded = null;
          continue;
        }

        const decoded = decodePlaceholderCell(cell, prevDecoded, lastTransmittedImageId);
        if (!decoded) {
          prevDecoded = null;
          continue;
        }
        prevDecoded = decoded;

        const img = resolveImageFromCache(
          this.cache,
          decoded.imageId,
          cell,
          lastTransmittedImageId
        );
        const vpKey = img ? img.id : decoded.imageId;
        const vp = virtualPlacements.get(vpKey) || virtualPlacements.get(decoded.imageId);
        if (vp) {
          if (!vp.explicitCols) {
            vp.detectedCols = Math.max(vp.detectedCols || 0, decoded.col + 1);
            vp.cols = vp.detectedCols;
          }
          if (!vp.explicitRows) {
            vp.detectedRows = Math.max(vp.detectedRows || 0, decoded.row + 1);
            vp.rows = vp.detectedRows;
          }
        }
      }
    }
  }

  public renderVisiblePlaceholders(
    virtualPlacements: Map<number, KittyVirtualPlacement>,
    lastTransmittedImageId: number
  ): void {
    if (!this.ctx || !this.screenElement || this.cache.size === 0) return;

    this.scanPlaceholderGridDimensions(virtualPlacements, lastTransmittedImageId);

    const cellWidth = this.getCellWidth();
    const cellHeight = this.getCellHeight();
    const padding = this.getTerminalPadding();
    const viewportY = this.term.buffer.active.viewportY;
    const termRows = this.term.rows || 24;
    const termCols = this.term.cols || 80;

    let prevDecoded: DecodedPlaceholder | null = null;

    for (let row = 0; row < termRows; row++) {
      const line = this.term.buffer.active.getLine(viewportY + row);
      if (!line) continue;
      prevDecoded = null;

      for (let col = 0; col < termCols; col++) {
        const cell = line.getCell(col);
        if (!cell || !isPlaceholderCell(cell)) {
          if (col === 0) prevDecoded = null;
          continue;
        }

        const decoded = decodePlaceholderCell(cell, prevDecoded, lastTransmittedImageId);
        if (!decoded) {
          prevDecoded = null;
          continue;
        }
        prevDecoded = decoded;

        const img = resolveImageFromCache(
          this.cache,
          decoded.imageId,
          cell,
          lastTransmittedImageId
        );
        if (!img || !img.bitmap) continue;

        const vp = virtualPlacements.get(img.id) || virtualPlacements.get(decoded.imageId);
        const isSingleCell = !decoded.hasDiacritics && (!vp || (vp.cols <= 1 && vp.rows <= 1));

        const totalCols = vp?.cols ?? Math.max(decoded.col + 1, 1);
        const totalRows = vp?.rows ?? Math.max(decoded.row + 1, 1);

        const srcX = vp?.srcX ?? 0;
        const srcY = vp?.srcY ?? 0;
        const srcWidth = vp?.srcWidth;
        const srcHeight = vp?.srcHeight;

        const uv = computePlaceholderUV(
          decoded.row,
          decoded.col,
          totalRows,
          totalCols,
          img.bitmap.width,
          img.bitmap.height,
          srcX,
          srcY,
          srcWidth,
          srcHeight,
          isSingleCell
        );

        if (uv.sw <= 0 || uv.sh <= 0) continue;

        const startX = Math.round(padding.left + col * cellWidth);
        const endX = Math.round(padding.left + (col + 1) * cellWidth);
        const dw = Math.max(1, endX - startX);

        const startY = Math.round(padding.top + row * cellHeight);
        const endY = Math.round(padding.top + (row + 1) * cellHeight);
        const dh = Math.max(1, endY - startY);

        try {
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'source-over';
          this.ctx.globalAlpha = 1.0;
          this.ctx.imageSmoothingEnabled = true;
          this.ctx.imageSmoothingQuality = 'high';

          this.ctx.drawImage(
            img.bitmap,
            uv.sx,
            uv.sy,
            uv.sw,
            uv.sh,
            startX,
            startY,
            dw,
            dh
          );
          this.ctx.restore();
        } catch {
          // ignore closed bitmap
        }
      }
    }
  }

  public render(
    placements: Map<string, KittyPlacement>,
    virtualPlacements: Map<number, KittyVirtualPlacement>,
    lastTransmittedImageId: number
  ): void {
    if (this.isDisposed || !this.canvas || !this.ctx || !this.screenElement) return;

    // Fast-path: if no images or placements are active, skip canvas redraw if already clear
    if (placements.size === 0 && this.cache.size === 0) {
      if (this.isCanvasClear) return;
      this.clearCanvas();
      return;
    }

    this.isCanvasClear = false;
    this.syncCanvasSize();

    const dpr = window.devicePixelRatio || 1;
    const width = this.screenElement.clientWidth;
    const height = this.screenElement.clientHeight;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, width, height);

    this.renderVisiblePlaceholders(virtualPlacements, lastTransmittedImageId);

    if (placements.size === 0) return;

    const cellWidth = this.getCellWidth();
    const cellHeight = this.getCellHeight();
    const viewportY = this.term.buffer.active.viewportY;
    const maxScrollback = this.term.options.scrollback || 10000;
    const oldestAllowedLine = Math.max(0, this.term.buffer.active.baseY - maxScrollback);
    const termCols = this.term.cols || 80;
    const termRows = this.term.rows || 24;

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, width, height);
    this.ctx.clip();

    for (const [key, p] of placements.entries()) {
      const line = p.marker && !p.marker.isDisposed && p.marker.line !== -1
        ? p.marker.line
        : p.bufferLine;

      if (line + p.rows <= oldestAllowedLine || (p.marker && p.marker.isDisposed)) {
        try {
          p.marker?.dispose();
        } catch {}
        placements.delete(key);
        continue;
      }

      const screenRow = line - viewportY;

      let effectiveCol = p.col;
      if (p.isCentered && p.originalTermCols && termCols !== p.originalTermCols) {
        effectiveCol = Math.max(0, Math.round((termCols - p.cols) / 2));
      } else if (effectiveCol + p.cols > termCols) {
        effectiveCol = Math.max(0, termCols - p.cols);
      }

      const imgColStart = effectiveCol;
      const imgColEnd = effectiveCol + p.cols;
      const imgRowStart = screenRow;
      const imgRowEnd = screenRow + p.rows;

      if (
        imgRowEnd <= 0 ||
        imgRowStart >= termRows ||
        imgColEnd <= 0 ||
        imgColStart >= termCols
      ) {
        continue;
      }

      const img = this.cache.get(p.imageId);
      if (!img) {
        try {
          p.marker?.dispose();
        } catch {}
        placements.delete(key);
        continue;
      }

      const padding = this.getTerminalPadding();

      const rawX = padding.left + effectiveCol * cellWidth + p.xOffset;
      const rawY = padding.top + screenRow * cellHeight + p.yOffset;
      const rawW = p.cols * cellWidth;
      const rawH = p.rows * cellHeight;

      if (rawW <= 0 || rawH <= 0) continue;

      const destX = Math.max(0, Math.min(width, rawX));
      const destY = Math.max(0, Math.min(height, rawY));
      const destRight = Math.max(0, Math.min(width, rawX + rawW));
      const destBottom = Math.max(0, Math.min(height, rawY + rawH));

      const destW = destRight - destX;
      const destH = destBottom - destY;

      if (destW <= 0 || destH <= 0) continue;

      const relU1 = (destX - rawX) / rawW;
      const relU2 = (destRight - rawX) / rawW;
      const relV1 = (destY - rawY) / rawH;
      const relV2 = (destBottom - rawY) / rawH;

      const bmpW = img.bitmap.width;
      const bmpH = img.bitmap.height;

      const subX = Math.max(0, Math.min(bmpW, p.srcX ?? 0));
      const subY = Math.max(0, Math.min(bmpH, p.srcY ?? 0));
      const subW = p.srcWidth !== undefined ? Math.max(0, Math.min(bmpW - subX, p.srcWidth)) : (bmpW - subX);
      const subH = p.srcHeight !== undefined ? Math.max(0, Math.min(bmpH - subY, p.srcHeight)) : (bmpH - subY);

      const u_min = subX / bmpW;
      const v_min = subY / bmpH;
      const u_max = (subX + subW) / bmpW;
      const v_max = (subY + subH) / bmpH;

      const finalU1 = u_min + relU1 * (u_max - u_min);
      const finalU2 = u_min + relU2 * (u_max - u_min);
      const finalV1 = v_min + relV1 * (v_max - v_min);
      const finalV2 = v_min + relV2 * (v_max - v_min);

      const srcX = Math.max(0, Math.min(bmpW, finalU1 * bmpW));
      const srcY = Math.max(0, Math.min(bmpH, finalV1 * bmpH));
      const srcRight = Math.max(0, Math.min(bmpW, finalU2 * bmpW));
      const srcBottom = Math.max(0, Math.min(bmpH, finalV2 * bmpH));

      const srcW = srcRight - srcX;
      const srcH = srcBottom - srcY;

      if (srcW <= 0 || srcH <= 0) continue;

      try {
        this.ctx.drawImage(
          img.bitmap,
          srcX,
          srcY,
          srcW,
          srcH,
          destX,
          destY,
          destW,
          destH
        );
      } catch (err: any) {
        console.warn('Failed to draw partially clipped image placement:', err);
      }
    }

    this.ctx.restore();
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }
  }
}
