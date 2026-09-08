import { Terminal } from '@xterm/xterm';
import { KittyCommand, KittyControlKeys, KittyPlacement } from './types';
import { KittyApcParser } from './parser';
import { KittyDecoder } from './decoder';
import { KittyLruCache } from './lruCache';
import { TauriApi } from '../tauriApi';
import { KittyGraphicsConfig } from '../../types';

export class KittyGraphicsManager {
  private term: Terminal;
  private sessionId: string;
  private parser: KittyApcParser;
  private decoder: KittyDecoder;
  private cache: KittyLruCache;
  private placements: Map<string, KittyPlacement> = new Map();
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private nextImageId: number = 1;
  private disposables: (() => void)[] = [];
  private isDisposed: boolean = false;
  private screenElement: HTMLElement | null = null;

  constructor(
    term: Terminal,
    container: HTMLElement,
    sessionId: string,
    config?: KittyGraphicsConfig
  ) {
    this.term = term;
    this.sessionId = sessionId;

    const maxDim = config?.max_dimension ?? 4096;
    const maxPayload = config?.max_payload_mb ?? 16;
    const cacheLimit = config?.cache_limit_mb ?? 256;
    const allowedDir = config?.allowed_dir ?? '$HOME/Pictures';

    this.parser = new KittyApcParser(maxPayload);
    this.decoder = new KittyDecoder(maxDim, maxPayload, allowedDir);
    this.cache = new KittyLruCache(cacheLimit);

    this.mountCanvas(container);
    this.attachTerminalEvents();
  }

  public updateConfig(config?: KittyGraphicsConfig) {
    if (!config) return;
    this.parser.setMaxPayloadMb(config.max_payload_mb ?? 16);
    this.decoder.updateConfig(
      config.max_dimension ?? 4096,
      config.max_payload_mb ?? 16,
      config.allowed_dir ?? '$HOME/Pictures'
    );
    this.cache.setLimitMb(config.cache_limit_mb ?? 256);
    this.render();
  }

  /**
   * Mounts the graphics overlay canvas inside .xterm-screen beneath the TextRenderLayer.
   * Render order: Terminal Wallpaper/BG -> Kitty Graphics Canvas -> TextRenderLayer -> Selection -> Cursor.
   */
  private mountCanvas(container: HTMLElement) {
    const screen = container.querySelector('.xterm-screen') as HTMLElement | null;
    this.screenElement = screen || container;

    const canvas = document.createElement('canvas');
    canvas.className = 'xterm-kitty-graphics-layer';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';

    // Insert before TextRenderLayer in .xterm-screen so cell background -> image -> text glyphs
    if (screen && screen.firstChild) {
      screen.insertBefore(canvas, screen.firstChild);
    } else {
      (screen || container).appendChild(canvas);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.syncCanvasSize();
  }

  public syncCanvasSize() {
    if (!this.canvas || !this.screenElement) return;

    const dpr = window.devicePixelRatio || 1;
    const width = this.screenElement.clientWidth;
    const height = this.screenElement.clientHeight;

    if (width > 0 && height > 0) {
      if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
        this.canvas.width = Math.round(width * dpr);
        this.canvas.height = Math.round(height * dpr);
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
      }
    }
  }

  private attachTerminalEvents() {
    const scrollDisp = this.term.onScroll(() => {
      this.render();
    });
    this.disposables.push(() => scrollDisp.dispose());

    const renderDisp = this.term.onRender(() => {
      this.render();
    });
    this.disposables.push(() => renderDisp.dispose());

    const resizeDisp = this.term.onResize(() => {
      this.syncCanvasSize();
      this.render();
    });
    this.disposables.push(() => resizeDisp.dispose());
  }

  /**
   * Filters incoming PTY stream text through the streaming APC parser.
   * Returns clean text suitable for term.write().
   */
  public filterPtyOutput(chunk: string): string {
    if (this.isDisposed) return chunk;

    const { cleanText, commands } = this.parser.parse(chunk);

    if (commands.length > 0) {
      // Process extracted Kitty commands asynchronously
      for (const cmd of commands) {
        this.handleCommand(cmd).catch((err) => {
          console.warn('Error handling Kitty command:', err);
        });
      }
    }

    return cleanText;
  }

  private async handleCommand(cmd: KittyCommand): Promise<void> {
    const action = cmd.keys.a || 't';

    switch (action) {
      case 'q': {
        // Handshake query probe (e.g. from fastfetch)
        const id = cmd.keys.i !== undefined ? cmd.keys.i : 0;
        this.sendPtyResponse(id, 'OK', cmd.keys.q);
        break;
      }

      case 't': {
        // Transmit and store in cache
        try {
          const decoded = await this.decoder.decode(cmd.keys, cmd.payload);
          const id = cmd.keys.i !== undefined ? cmd.keys.i : this.nextImageId++;
          this.cache.set(id, {
            id,
            bitmap: decoded.bitmap,
            width: decoded.width,
            height: decoded.height,
            byteSize: decoded.byteSize,
            lastUsed: Date.now(),
          });
          this.sendPtyResponse(id, 'OK', cmd.keys.q);
        } catch (err: any) {
          const id = cmd.keys.i !== undefined ? cmd.keys.i : 0;
          this.sendPtyResponse(id, err.message || 'EBADMSG', cmd.keys.q);
        }
        break;
      }

      case 'T': {
        // Transmit and display immediately
        try {
          const decoded = await this.decoder.decode(cmd.keys, cmd.payload);
          const id = cmd.keys.i !== undefined ? cmd.keys.i : this.nextImageId++;
          this.cache.set(id, {
            id,
            bitmap: decoded.bitmap,
            width: decoded.width,
            height: decoded.height,
            byteSize: decoded.byteSize,
            lastUsed: Date.now(),
          });

          this.placeImage(id, cmd.keys, decoded.width, decoded.height);
          this.sendPtyResponse(id, 'OK', cmd.keys.q);
        } catch (err: any) {
          const id = cmd.keys.i !== undefined ? cmd.keys.i : 0;
          this.sendPtyResponse(id, err.message || 'EBADMSG', cmd.keys.q);
        }
        break;
      }

      case 'p': {
        // Place previously transmitted image by ID
        const id = cmd.keys.i;
        if (id === undefined) {
          this.sendPtyResponse(0, 'ENOENT: Missing image ID', cmd.keys.q);
          return;
        }

        const cached = this.cache.get(id);
        if (!cached) {
          this.sendPtyResponse(id, 'ENOENT: Image ID not found in cache', cmd.keys.q);
          return;
        }

        this.placeImage(id, cmd.keys, cached.width, cached.height);
        this.sendPtyResponse(id, 'OK', cmd.keys.q);
        break;
      }

      case 'd': {
        // Delete images / placements
        const target = cmd.keys.d || 'a';
        if (target === 'a') {
          this.placements.clear();
          this.cache.clear();
        } else if (cmd.keys.i !== undefined) {
          const id = cmd.keys.i;
          this.cache.delete(id);
          for (const [key, p] of this.placements.entries()) {
            if (p.imageId === id) {
              this.placements.delete(key);
            }
          }
        } else if (cmd.keys.p !== undefined) {
          const pId = String(cmd.keys.p);
          this.placements.delete(pId);
        }
        this.render();
        break;
      }
    }
  }

  private placeImage(
    imageId: number,
    keys: KittyControlKeys,
    pixelWidth: number,
    pixelHeight: number
  ) {
    const { cols: termCols, rows: termRows } = this.term;
    const { baseY, cursorY, cursorX } = this.term.buffer.active;

    const cellWidth = this.getCellWidth();
    const cellHeight = this.getCellHeight();

    // Compute column and row spans with safety clamping
    let cols = keys.c;
    let rows = keys.r;

    if (cols && rows) {
      cols = Math.max(1, Math.min(termCols * 2, cols));
      rows = Math.max(1, Math.min(termRows * 2, rows));
    } else if (cols) {
      cols = Math.max(1, Math.min(termCols * 2, cols));
      const pixelSpanX = cols * cellWidth;
      const pixelSpanY = (pixelSpanX / pixelWidth) * pixelHeight;
      rows = Math.max(1, Math.min(termRows * 2, Math.round(pixelSpanY / cellHeight)));
    } else if (rows) {
      rows = Math.max(1, Math.min(termRows * 2, rows));
      const pixelSpanY = rows * cellHeight;
      const pixelSpanX = (pixelSpanY / pixelHeight) * pixelWidth;
      cols = Math.max(1, Math.min(termCols * 2, Math.round(pixelSpanX / cellWidth)));
    } else {
      cols = Math.max(1, Math.min(termCols * 2, Math.ceil(pixelWidth / cellWidth)));
      rows = Math.max(1, Math.min(termRows * 2, Math.ceil(pixelHeight / cellHeight)));
    }

    const placementId = keys.p ? String(keys.p) : `img-${imageId}-${Date.now()}`;
    const bufferLine = baseY + cursorY;
    const col = cursorX;

    const placement: KittyPlacement = {
      id: placementId,
      imageId,
      bufferLine,
      col,
      cols,
      rows,
      xOffset: keys.X || 0,
      yOffset: keys.Y || 0,
      z: keys.z || 0,
    };

    this.placements.set(placementId, placement);
    this.render();
  }

  public render() {
    if (this.isDisposed || !this.canvas || !this.ctx || !this.screenElement) return;

    this.syncCanvasSize();

    const dpr = window.devicePixelRatio || 1;
    const width = this.screenElement.clientWidth;
    const height = this.screenElement.clientHeight;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, width, height);

    if (this.placements.size === 0) return;

    const cellWidth = this.getCellWidth();
    const cellHeight = this.getCellHeight();
    const viewportY = this.term.buffer.active.viewportY;
    const maxScrollback = this.term.options.scrollback || 10000;
    const oldestAllowedLine = Math.max(0, this.term.buffer.active.baseY - maxScrollback);

    for (const [key, p] of this.placements.entries()) {
      // Memory pruning: if the image line is scrolled beyond the maximum scrollback buffer, discard placement
      if (p.bufferLine < oldestAllowedLine) {
        this.placements.delete(key);
        continue;
      }

      // Calculate screen row relative to current viewport
      const screenRow = p.bufferLine - viewportY;

      // Offscreen clipping check: if completely outside visible terminal rows, skip drawing
      if (screenRow + p.rows < 0 || screenRow > this.term.rows) {
        continue;
      }

      const img = this.cache.get(p.imageId);
      if (!img) {
        this.placements.delete(key);
        continue;
      }

      const drawX = p.col * cellWidth + p.xOffset;
      const drawY = screenRow * cellHeight + p.yOffset;
      const drawW = p.cols * cellWidth;
      const drawH = p.rows * cellHeight;

      try {
        this.ctx.drawImage(img.bitmap, drawX, drawY, drawW, drawH);
      } catch (err) {
        console.warn('Failed to draw image placement:', err);
      }
    }
  }

  private getCellWidth(): number {
    if (this.term.cols > 0 && this.screenElement) {
      return this.screenElement.clientWidth / this.term.cols;
    }
    return 9; // default fallback cell width
  }

  private getCellHeight(): number {
    if (this.term.rows > 0 && this.screenElement) {
      return this.screenElement.clientHeight / this.term.rows;
    }
    return 18; // default fallback cell height
  }

  private sendPtyResponse(id: number, message: string, quiet?: number) {
    if (message === 'OK' && quiet === 1) return;
    if (message !== 'OK' && quiet === 2) return;

    const resp = id > 0 ? `\x1b_Gi=${id};${message}\x1b\\` : `\x1b_G;${message}\x1b\\`;
    TauriApi.writePty(this.sessionId, resp).catch(() => {
      // ignore write error if session closed
    });
  }

  public dispose() {
    this.isDisposed = true;
    for (const d of this.disposables) {
      try {
        d();
      } catch {
        // ignore
      }
    }
    this.disposables = [];
    this.cache.clear();
    this.placements.clear();

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
      this.canvas = null;
      this.ctx = null;
    }
  }
}
