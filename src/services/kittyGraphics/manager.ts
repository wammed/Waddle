import { Terminal } from '@xterm/xterm';
import { KittyCommand, KittyControlKeys, KittyPlacement, KittyVirtualPlacement, KittyAnimationFrame } from './types';
import { KittyApcParser } from './parser';
import { KittyDecoder } from './decoder';
import { KittyLruCache } from './lruCache';
import {
  isPlaceholderCell,
  decodePlaceholderCell,
  computePlaceholderUV,
  DecodedPlaceholder,
  resolveImageFromCache,
  PLACEHOLDER_CODEPOINT,
} from './unicodePlaceholder';
import { TauriApi } from '../tauriApi';
import { KittyGraphicsConfig } from '../../types';

export class KittyGraphicsManager {
  private term: Terminal;
  private sessionId: string;
  private parser: KittyApcParser;
  private decoder: KittyDecoder;
  private cache: KittyLruCache;
  private placements: Map<string, KittyPlacement> = new Map();
  private virtualPlacements: Map<number, KittyVirtualPlacement> = new Map();
  private lastTransmittedImageId: number = 0;
  private lastDecodedPlaceholder: DecodedPlaceholder | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private nextImageId: number = 1;
  private commandQueue: Promise<void> = Promise.resolve();
  private loadingImages: Map<number, Promise<void>> = new Map();
  private disposables: (() => void)[] = [];
  private isDisposed: boolean = false;
  private screenElement: HTMLElement | null = null;
  private canvasAddon?: any;
  private onPtyWrite?: (data: string) => void;
  private isHookInstalled: boolean = false;
  private isCanvasClear: boolean = true;

  constructor(
    term: Terminal,
    container: HTMLElement,
    sessionId: string,
    config?: KittyGraphicsConfig,
    canvasAddon?: any,
    onPtyWrite?: (data: string) => void
  ) {
    this.term = term;
    this.sessionId = sessionId;
    this.canvasAddon = canvasAddon;
    this.onPtyWrite = onPtyWrite;

    const maxDim = config?.max_dimension ?? 4096;
    const maxPayload = config?.max_payload_mb ?? 16;
    const cacheLimit = config?.cache_limit_mb ?? 256;
    const allowedDir = config?.allowed_dir ?? '$HOME/Pictures';

    this.parser = new KittyApcParser(maxPayload);
    this.decoder = new KittyDecoder(maxDim, maxPayload, allowedDir);
    this.cache = new KittyLruCache(cacheLimit);

    this.mountCanvas(container);
    this.attachTerminalEvents();
    this.installCanvasRendererHook();
  }

  public setCanvasAddon(addon: any): void {
    this.canvasAddon = addon;
    this.isHookInstalled = false;
    this.installCanvasRendererHook();
  }

  public setOnPtyWrite(fn: (data: string) => void): void {
    this.onPtyWrite = fn;
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

    // Clean up any stale kitty graphics canvases to prevent duplicate ghost layers
    const existing = (screen || container).querySelectorAll('.xterm-kitty-graphics-layer');
    existing.forEach((el) => el.remove());

    const canvas = document.createElement('canvas');
    canvas.className = 'xterm-kitty-graphics-layer';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';

    // Insert after TextRenderLayer (zIndex 0) and before SelectionRenderLayer (zIndex 1)
    if (screen) {
      const layers = screen.querySelectorAll('canvas');
      if (layers.length >= 2) {
        screen.insertBefore(canvas, layers[1]);
      } else {
        screen.appendChild(canvas);
      }
    } else {
      container.appendChild(canvas);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.syncCanvasSize();
    TauriApi.logKittyDebug(
      `[mountCanvas] Mounted canvas zIndex=${canvas.style.zIndex}, screen=${!!screen}, dims=${this.canvas.width}x${this.canvas.height}`
    );
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

  public installCanvasRendererHook(): void {
    if (this.isHookInstalled) return;
    try {
      const core = (this.term as any)._core;
      const renderService = core?._renderService;

      // Automatically hook setRenderer so whenever a renderer is attached/swapped, hooks are armed
      if (renderService && !renderService.__kittyHooked && typeof renderService.setRenderer === 'function') {
        renderService.__kittyHooked = true;
        const origSetRenderer = renderService.setRenderer.bind(renderService);
        renderService.setRenderer = (r: any) => {
          origSetRenderer(r);
          this.isHookInstalled = false;
          this.installCanvasRendererHook();
        };
      }

      // In xterm v5, renderService._renderer is a MutableDisposable holding the actual renderer in .value
      const renderer =
        renderService?._renderer?.value ||
        renderService?._renderer ||
        this.canvasAddon?._renderer;
      if (!renderer) return;

      // Handle DOM renderer fallback if active
      const rowFactory = (renderer as any)._rowFactory;
      if (rowFactory) {
        const rowFactoryProto = Object.getPrototypeOf(rowFactory);
        if (rowFactoryProto && !rowFactoryProto.__kittyHooked && typeof rowFactoryProto.createRow === 'function') {
          rowFactoryProto.__kittyHooked = true;
          const origCreateRow = rowFactoryProto.createRow;
          rowFactoryProto.createRow = function (line: any, ...args: any[]) {
            const spans = origCreateRow.call(this, line, ...args);
            if (Array.isArray(spans)) {
              for (const span of spans) {
                if (span?.textContent && span.textContent.includes('\u{10EEEE}')) {
                  span.textContent = ' ';
                  span.style.color = 'transparent';
                }
              }
            }
            return spans;
          };
        }
      }

      if (!renderer._renderLayers) return;

      const textLayer = renderer._renderLayers[0];
      const cursorLayer = renderer._renderLayers[3];
      const self = this;

      if (textLayer) {
        const textProto = Object.getPrototypeOf(textLayer);
        const baseProto = (textProto && Object.getPrototypeOf(textProto)) || textProto;

        // 1. Hook _drawForeground: The primary text/glyph rendering loop (Font/Glyph Render Pass).
        // Requirement 1: In this loop, if the cell's codepoint is 0x10EEEE or has the placeholder flag,
        // completely skip (continue) glyph search, rasterization, and font drawing!
        const fontGlyphPass = function (this: any, startRow: number, endRow: number) {
          this._forEachCell(startRow, endRow, (cell: any, x: number, y: number) => {
            // Check if cell is Kitty Unicode placeholder
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              // Requirement 2: Exclusive rendering
              // Render placeholder texture onto canvas, completely bypassing font glyph drawing
              const w = this._deviceCellWidth > 0 ? this._deviceCellWidth : self.getCellWidth() * (window.devicePixelRatio || 1);
              const h = this._deviceCellHeight > 0 ? this._deviceCellHeight : self.getCellHeight() * (window.devicePixelRatio || 1);
              self.drawPlaceholderCell(
                this._ctx,
                cell,
                x,
                y,
                w,
                h
              );
              // continue in loop -> completely bypass glyph lookup, atlas rasterization, and font draw
              return;
            }

            if (x === 0) {
              self.lastDecodedPlaceholder = null;
            }

            this._drawChars(cell, x, y);
          });
        };

        if (textProto && !textProto.__kittyForegroundHooked && typeof textProto._drawForeground === 'function') {
          textProto.__kittyForegroundHooked = true;
          textProto._drawForeground = fontGlyphPass;
        }

        if (!textLayer.__kittyForegroundHooked && typeof textLayer._drawForeground === 'function') {
          textLayer.__kittyForegroundHooked = true;
          textLayer._drawForeground = fontGlyphPass;
        }

        // 2. Prototype-level hook on BaseRenderLayer._drawChars to ensure ANY subclass skips font glyph rendering
        if (baseProto && !baseProto.__kittyBaseHooked && typeof baseProto._drawChars === 'function') {
          baseProto.__kittyBaseHooked = true;
          const origBaseDrawChars = baseProto._drawChars;
          baseProto._drawChars = function (cell: any, x: number, y: number) {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              // Completely bypass glyph lookup, atlas rasterization, and font drawing
              return;
            }
            return origBaseDrawChars.call(this, cell, x, y);
          };
        }

        // 3. Prototype-level hook on BaseRenderLayer._fillCharTrueColor
        if (baseProto && !baseProto.__kittyBaseFillHooked && typeof baseProto._fillCharTrueColor === 'function') {
          baseProto.__kittyBaseFillHooked = true;
          const origBaseFill = baseProto._fillCharTrueColor;
          baseProto._fillCharTrueColor = function (cell: any, x: number, y: number) {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              // Completely bypass font fillText for placeholder cells
              return;
            }
            return origBaseFill.call(this, cell, x, y);
          };
        }

        // 4. Hook _isOverlapping on TextRenderLayer so 0x10EEEE is not treated as a 2-cell overlapping char
        if (textProto && !textProto.__kittyOverlapHooked && typeof textProto._isOverlapping === 'function') {
          textProto.__kittyOverlapHooked = true;
          const origIsOverlapping = textProto._isOverlapping;
          textProto._isOverlapping = function (cell: any) {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              return false;
            }
            return origIsOverlapping.call(this, cell);
          };
        }
        if (!textLayer.__kittyOverlapHooked && typeof textLayer._isOverlapping === 'function') {
          textLayer.__kittyOverlapHooked = true;
          const origIsOverlapping = textLayer._isOverlapping.bind(textLayer);
          textLayer._isOverlapping = function (cell: any) {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              return false;
            }
            return origIsOverlapping(cell);
          };
        }

        // 5. Instance-level hook on TextRenderLayer for exclusive rendering (texture only, never glyph)
        if (!textLayer.__kittyHooked) {
          textLayer.__kittyHooked = true;
          const origDrawChars = textLayer._drawChars.bind(textLayer);
          textLayer._drawChars = (cell: any, x: number, y: number) => {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              // Exclusive rendering: draw placeholder texture and completely skip origDrawChars (tofu glyph)
              const w = textLayer._deviceCellWidth > 0 ? textLayer._deviceCellWidth : self.getCellWidth() * (window.devicePixelRatio || 1);
              const h = textLayer._deviceCellHeight > 0 ? textLayer._deviceCellHeight : self.getCellHeight() * (window.devicePixelRatio || 1);
              this.drawPlaceholderCell(
                textLayer._ctx,
                cell,
                x,
                y,
                w,
                h
              );
              return;
            }
            if (x === 0) {
              this.lastDecodedPlaceholder = null;
            }
            return origDrawChars(cell, x, y);
          };
        }
      }

      // 6. Hook CursorRenderLayer so cursor does not crush placeholder texture or draw tofu glyph
      if (cursorLayer && !cursorLayer.__kittyHooked) {
        cursorLayer.__kittyHooked = true;
        if (cursorLayer._cursorRenderers) {
          const origBlock = cursorLayer._cursorRenderers['block']?.bind(cursorLayer);
          if (origBlock) {
            cursorLayer._cursorRenderers['block'] = (x: number, y: number, cell: any) => {
              if (
                (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
                isPlaceholderCell(cell)
              ) {
                // Stroke outline cursor instead of opaque block over graphic
                cursorLayer._ctx.save();
                cursorLayer._ctx.strokeStyle = cursorLayer._themeService.colors.cursor.css;
                cursorLayer._strokeRectAtCell(x, y, typeof cell?.getWidth === 'function' ? cell.getWidth() : 1, 1);
                cursorLayer._ctx.restore();
                return;
              }
              return origBlock(x, y, cell);
            };
          }
        }
        const origFillCharTrueColor = cursorLayer._fillCharTrueColor?.bind(cursorLayer);
        if (origFillCharTrueColor) {
          cursorLayer._fillCharTrueColor = (cell: any, x: number, y: number) => {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              return; // Suppress tofu glyph under cursor
            }
            return origFillCharTrueColor(cell, x, y);
          };
        }
      }

      // 7. Hook any remaining layers in renderer._renderLayers
      for (const layer of renderer._renderLayers) {
        if (!layer || layer.__kittyLayerHooked) continue;
        layer.__kittyLayerHooked = true;
        if (typeof layer._drawChars === 'function' && layer !== textLayer) {
          const orig = layer._drawChars.bind(layer);
          layer._drawChars = (cell: any, x: number, y: number) => {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              return;
            }
            return orig(cell, x, y);
          };
        }
        if (typeof layer._fillCharTrueColor === 'function' && layer !== cursorLayer) {
          const origFill = layer._fillCharTrueColor.bind(layer);
          layer._fillCharTrueColor = (cell: any, x: number, y: number) => {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              return;
            }
            return origFill(cell, x, y);
          };
        }
      }
      this.isHookInstalled = true;
    } catch (err) {
      console.warn('Failed to install canvas renderer hook for Unicode placeholders:', err);
    }
  }

  public drawPlaceholderCell(
    ctx: CanvasRenderingContext2D,
    cell: any,
    col: number,
    row: number,
    cellWidth: number,
    cellHeight: number
  ): void {
    if (col === 0) {
      this.lastDecodedPlaceholder = null;
    }

    const decoded = decodePlaceholderCell(
      cell,
      this.lastDecodedPlaceholder,
      this.lastTransmittedImageId
    );
    if (!decoded) {
      this.lastDecodedPlaceholder = null;
      return;
    }
    this.lastDecodedPlaceholder = decoded;

    // Requirement 1: Resolve and bind texture from graphics cache
    const img = resolveImageFromCache(
      this.cache,
      decoded.imageId,
      cell,
      this.lastTransmittedImageId
    );
    if (!img || !img.bitmap) return;

    const vp = this.virtualPlacements.get(img.id) || this.virtualPlacements.get(decoded.imageId);
    const isSingleCell = !decoded.hasDiacritics && (!vp || (vp.cols <= 1 && vp.rows <= 1));

    const totalCols = vp?.cols ?? Math.max(decoded.col + 1, 1);
    const totalRows = vp?.rows ?? Math.max(decoded.row + 1, 1);

    const srcX = vp?.srcX ?? 0;
    const srcY = vp?.srcY ?? 0;
    const srcWidth = vp?.srcWidth;
    const srcHeight = vp?.srcHeight;

    // Requirement 2: Submit texture quad to rendering pipeline with proper UV mapping
    // Single cell: (0.0, 0.0) .. (1.0, 1.0); Divided: proportional tile UV
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

    if (uv.sw <= 0 || uv.sh <= 0) return;

    const effectiveCellWidth = cellWidth > 0 ? cellWidth : this.getCellWidth() * (window.devicePixelRatio || 1);
    const effectiveCellHeight = cellHeight > 0 ? cellHeight : this.getCellHeight() * (window.devicePixelRatio || 1);

    // Pixel rectangle [cell_x, cell_y, cell_width, cell_height]
    const dx = col * effectiveCellWidth;
    const dy = row * effectiveCellHeight;

    try {
      ctx.save();
      // Requirement 3: Alpha blending enabled (source-over, full opacity, avoid clearing/black crushing)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Scissor strictly to cell pixel rectangle
      ctx.beginPath();
      ctx.rect(dx, dy, effectiveCellWidth, effectiveCellHeight);
      ctx.clip();

      // Issue draw call
      ctx.drawImage(
        img.bitmap,
        uv.sx,
        uv.sy,
        uv.sw,
        uv.sh,
        dx,
        dy,
        effectiveCellWidth,
        effectiveCellHeight
      );
      ctx.restore();
    } catch {
      // ignore draw error if bitmap closed
    }
  }

  private queueCommand(cmd: KittyCommand): void {
    this.commandQueue = this.commandQueue
      .then(async () => {
        if (this.isDisposed) return;
        await this.handleCommand(cmd);
      })
      .catch((err) => {
        console.warn('Error handling Kitty command:', err);
      });
  }

  /**
   * Filters incoming PTY stream text through the streaming APC parser.
   * Returns clean text suitable for term.write(), with placeholder sequences
   * for inline images to advance the cursor and allocate buffer lines.
   */
  public filterPtyOutput(chunk: string): string {
    if (this.isDisposed) return chunk;

    const { cleanText, commands } = this.parser.parse(chunk, (cmd, textBefore) => {
      return this.generatePlaceholderSequence(cmd, textBefore);
    });

    if (commands.length > 0) {
      // Process extracted Kitty commands strictly in order via FIFO command queue
      for (const cmd of commands) {
        this.queueCommand(cmd);
      }
    }

    return cleanText;
  }

  private calculateCursorOffset(text: string): { deltaCol: number; deltaLine: number } {
    if (!text) return { deltaCol: 0, deltaLine: 0 };
    let deltaLine = 0;
    let lastLineLen = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        deltaLine++;
        lastLineLen = 0;
      } else if (text[i] === '\r') {
        lastLineLen = 0;
      } else if (text[i] === '\x1b' && text[i + 1] === '[') {
        // Parse full CSI sequence: \x1b[ [params] [final_byte 0x40-0x7E]
        let j = i + 2;
        while (j < text.length && text.charCodeAt(j) >= 0x20 && text.charCodeAt(j) <= 0x3f) {
          j++;
        }
        if (j < text.length && text.charCodeAt(j) >= 0x40 && text.charCodeAt(j) <= 0x7e) {
          const finalChar = text[j];
          const paramStr = text.slice(i + 2, j);
          const paramVal = parseInt(paramStr, 10) || 1;
          if (finalChar === 'C') {
            // Cursor Forward (CUF)
            lastLineLen += paramVal;
          } else if (finalChar === 'D') {
            // Cursor Back (CUB)
            lastLineLen = Math.max(0, lastLineLen - paramVal);
          } else if (finalChar === 'G') {
            // Cursor Horizontal Absolute (CHA)
            lastLineLen = Math.max(0, paramVal - 1);
          }
          i = j;
          continue;
        }
        lastLineLen++;
      } else {
        lastLineLen++;
      }
    }
    return { deltaCol: lastLineLen, deltaLine };
  }

  /**
   * Synchronously flushes any pending writes in xterm's internal parser buffer
   * so that buffer.active.cursorX / cursorY and baseY reflect all preceding stream output.
   */
  private flushTerminalBuffer(): void {
    try {
      const core = (this.term as any)._core;
      if (core?._writeBuffer && typeof core._writeBuffer._innerWrite === 'function') {
        core._writeBuffer._innerWrite();
      }
    } catch {
      // ignore
    }
  }

  private computeSpans(
    keys: KittyControlKeys,
    pixelWidth?: number,
    pixelHeight?: number
  ): { cols: number; rows: number } {
    const termCols = this.term.cols || 80;
    const termRows = this.term.rows || 24;

    const cellWidth = this.getCellWidth();
    const cellHeight = this.getCellHeight();

    const effectiveWidth = keys.w || pixelWidth;
    const effectiveHeight = keys.h || pixelHeight;

    let cols = keys.c;
    let rows = keys.r;

    if (cols && rows) {
      cols = Math.max(1, Math.min(termCols, cols));
      rows = Math.max(1, Math.min(termRows, rows));
    } else if (cols) {
      cols = Math.max(1, Math.min(termCols, cols));
      if (effectiveWidth && effectiveHeight && effectiveWidth > 0) {
        const pixelSpanX = cols * cellWidth;
        const pixelSpanY = (pixelSpanX / effectiveWidth) * effectiveHeight;
        rows = Math.max(1, Math.min(termRows, Math.round(pixelSpanY / cellHeight)));
      } else {
        rows = 1;
      }
    } else if (rows) {
      rows = Math.max(1, Math.min(termRows, rows));
      if (effectiveWidth && effectiveHeight && effectiveWidth > 0) {
        const pixelSpanY = rows * cellHeight;
        const pixelSpanX = (pixelSpanY / effectiveHeight) * effectiveWidth;
        cols = Math.max(1, Math.min(termCols, Math.round(pixelSpanX / cellWidth)));
      } else {
        cols = 1;
      }
    } else if (effectiveWidth && effectiveHeight && effectiveWidth > 0 && effectiveHeight > 0) {
      cols = Math.max(1, Math.min(termCols, Math.ceil(effectiveWidth / cellWidth)));
      rows = Math.max(1, Math.min(termRows, Math.ceil(effectiveHeight / cellHeight)));
    } else {
      cols = 1;
      rows = 1;
    }

    return { cols, rows };
  }

  private inspectDimensionsFromPayload(
    keys: KittyControlKeys,
    payload: string
  ): { width: number; height: number } | null {
    if (keys.s && keys.v) {
      return { width: keys.s, height: keys.v };
    }

    // Try fast PNG IHDR inspection from base64 payload
    const format = keys.f ?? 32;
    if ((format === 100 || payload.startsWith('iVBORw0KGgo')) && payload.length >= 32) {
      try {
        const binaryHeader = atob(payload.slice(0, 44));
        if (binaryHeader.length >= 24 && binaryHeader.slice(12, 16) === 'IHDR') {
          const w =
            (binaryHeader.charCodeAt(16) << 24) |
            (binaryHeader.charCodeAt(17) << 16) |
            (binaryHeader.charCodeAt(18) << 8) |
            binaryHeader.charCodeAt(19);
          const h =
            (binaryHeader.charCodeAt(20) << 24) |
            (binaryHeader.charCodeAt(21) << 16) |
            (binaryHeader.charCodeAt(22) << 8) |
            binaryHeader.charCodeAt(23);
          if (w > 0 && h > 0) {
            return { width: w, height: h };
          }
        }
      } catch {
        // ignore
      }
    }

    return null;
  }

  private generatePlaceholderSequence(cmd: KittyCommand, textBefore: string): string {
    const action = cmd.keys.a || 't';
    if (action !== 'T' && action !== 'p') {
      return '';
    }

    // Virtual placements (U=1) are referenced by explicit Unicode placeholders (U+10EEEE).
    // Do not allocate empty space sequences in the text buffer for virtual placements.
    if (cmd.keys.U === 1) {
      return '';
    }

    // Determine dimensions if possible
    let pixelDims: { width: number; height: number } | null = null;
    const checkPlacementId = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
    if (action === 'p' && checkPlacementId !== undefined) {
      const cached = this.cache.get(checkPlacementId);
      if (cached) {
        pixelDims = { width: cached.width, height: cached.height };
      }
    } else if (action === 'T') {
      pixelDims = this.inspectDimensionsFromPayload(cmd.keys, cmd.payload);
    }

    const { cols, rows } = this.computeSpans(cmd.keys, pixelDims?.width, pixelDims?.height);
    const termCols = this.term.cols || 80;

    // Ensure any preceding writes in xterm's buffer are flushed synchronously before reading cursor
    this.flushTerminalBuffer();

    // Calculate anchor position taking into account any text preceding the image in the current chunk
    const { deltaCol, deltaLine } = this.calculateCursorOffset(textBefore);
    let startCol = this.term.buffer.active.cursorX;
    let startBufferLine = this.term.buffer.active.baseY + this.term.buffer.active.cursorY;

    if (deltaLine > 0) {
      startCol = deltaCol % termCols;
      startBufferLine += deltaLine;
    } else if (deltaCol > 0) {
      startCol = (startCol + deltaCol) % termCols;
    }

    // Store anchor and spans on command object for placeImage
    cmd.startCol = startCol;
    cmd.startBufferLine = startBufferLine;
    cmd.cols = cols;
    cmd.rows = rows;

    const C = cmd.keys.C ?? 0; // 0=move, 1=do not move

    let seq = '';

    // If C=1, save cursor position (DECSC / xterm adjusts saved cursor on scroll)
    if (C === 1) {
      seq += '\x1b[s';
    }

    // Allocate placeholder cells and linefeeds across rows
    // Row 0: cols spaces
    // Rows 1 .. rows-1: \r\n + (if startCol > 0, move cursor to startCol) + cols spaces
    const spaces = ' '.repeat(cols);
    for (let r = 0; r < rows; r++) {
      if (r > 0) {
        seq += '\r\n';
        if (startCol > 0) {
          seq += `\x1b[${startCol}C`;
        }
      }
      seq += spaces;
    }

    if (C === 1) {
      // Restore cursor position to start cell (scroll-corrected by xterm)
      seq += '\x1b[u';
    } else {
      // If the final row reaches or exceeds terminal right margin, wrap to next line
      if (startCol + cols >= termCols) {
        seq += '\r\n';
      }
    }

    return seq;
  }

  private async handleCommand(cmd: KittyCommand): Promise<void> {
    const action = cmd.keys.a || 't';

    switch (action) {
      case 'q': {
        // Query action (a=q):
        // Query if an image exists in cache / manager, or probe protocol capability.
        // Protocol specifies that queries MUST receive a response regardless of quiet setting.
        const id = cmd.keys.i !== undefined ? cmd.keys.i : (cmd.keys.I !== undefined ? cmd.keys.I : 0);
        if (cmd.keys.s === 1 && cmd.keys.v === 1) {
          // Protocol capability probe: ESC _ G i=1,s=1,v=1,a=q ; ESC \
          // Handled synchronously in Rust by pty.rs directly on the PTY byte stream.
          // Do NOT send duplicate responses from the frontend to avoid shell prompt pollution!
          return;
        } else if (id > 0) {
          const pendingLoad = this.loadingImages.get(id);
          if (pendingLoad) {
            await pendingLoad;
          }
          const exists = this.cache.has(id) || this.virtualPlacements.has(id);
          this.sendPtyResponse(id, exists ? 'OK' : 'ENOENT', cmd.keys.q, true);
        } else {
          // General protocol capability query probe (handled synchronously in Rust by pty.rs)
          return;
        }
        break;
      }

      case 't': {
        // Transmit and store in cache
        const id = (cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I) ?? this.nextImageId++;
        this.lastTransmittedImageId = id;
        let resolveLoad!: () => void;
        const loadPromise = new Promise<void>((resolve) => {
          resolveLoad = resolve;
        });
        this.loadingImages.set(id, loadPromise);

        try {
          const decoded = await this.decoder.decode(cmd.keys, cmd.payload);
          const isHeight = (cmd.keys.f === 24 || cmd.keys.f === 32) && cmd.keys.s !== undefined;
          const loopCount = (!isHeight && cmd.keys.v !== undefined) ? cmd.keys.v : 0;
          const initialFrame: KittyAnimationFrame = {
            bitmap: decoded.bitmap,
            width: decoded.width,
            height: decoded.height,
            byteSize: decoded.byteSize,
            delayMs: this.getFrameDelayMs(cmd.keys),
          };

          const detectedFormat = cmd.keys.f ?? (decoded.byteSize === decoded.width * decoded.height * 3 ? 24 : 32);
          this.cache.set(id, {
            id,
            format: detectedFormat,
            bitmap: decoded.bitmap,
            width: decoded.width,
            height: decoded.height,
            byteSize: decoded.byteSize,
            lastUsed: Date.now(),
            frames: [initialFrame],
            animation: {
              loopCount,
              loopsCompleted: 0,
              currentFrameIndex: 0,
              isPlaying: false,
            },
          });
          this.term.refresh(0, this.term.rows - 1);
          this.sendPtyResponse(id, 'OK', cmd.keys.q);
        } catch (err: any) {
          console.error('[KittyGraphics] Failed to decode image (t):', err);
          this.sendPtyResponse(id, err.message || 'EBADMSG', cmd.keys.q);
        } finally {
          resolveLoad();
          this.loadingImages.delete(id);
        }
        break;
      }

      case 'T': {
        // Transmit and display immediately
        const id = (cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I) ?? this.nextImageId++;
        this.lastTransmittedImageId = id;
        let resolveLoad!: () => void;
        const loadPromise = new Promise<void>((resolve) => {
          resolveLoad = resolve;
        });
        this.loadingImages.set(id, loadPromise);

        try {
          const decoded = await this.decoder.decode(cmd.keys, cmd.payload);
          const isHeight = (cmd.keys.f === 24 || cmd.keys.f === 32) && cmd.keys.s !== undefined;
          const loopCount = (!isHeight && cmd.keys.v !== undefined) ? cmd.keys.v : 0;
          const initialFrame: KittyAnimationFrame = {
            bitmap: decoded.bitmap,
            width: decoded.width,
            height: decoded.height,
            byteSize: decoded.byteSize,
            delayMs: this.getFrameDelayMs(cmd.keys),
          };

          const detectedFormat = cmd.keys.f ?? (decoded.byteSize === decoded.width * decoded.height * 3 ? 24 : 32);
          this.cache.set(id, {
            id,
            format: detectedFormat,
            bitmap: decoded.bitmap,
            width: decoded.width,
            height: decoded.height,
            byteSize: decoded.byteSize,
            lastUsed: Date.now(),
            frames: [initialFrame],
            animation: {
              loopCount,
              loopsCompleted: 0,
              currentFrameIndex: 0,
              isPlaying: false,
            },
          });

          if (cmd.keys.U === 1) {
            // Virtual placement for Unicode placeholders (U+10EEEE)
            const { cols, rows } = this.computeSpans(cmd.keys, decoded.width, decoded.height);
            this.virtualPlacements.set(id, {
              imageId: id,
              cols: cmd.keys.c || cols,
              rows: cmd.keys.r || rows,
              srcX: cmd.keys.x,
              srcY: cmd.keys.y,
              srcWidth: cmd.keys.w,
              srcHeight: cmd.keys.h,
            });
            const cachedRec = this.cache.get(id);
            if (cachedRec?.frames && cachedRec.frames.length >= 2 && !cachedRec.animation?.isPlaying) {
              this.startAnimation(id);
            }
          } else {
            this.placeImage(
              id,
              cmd.keys,
              decoded.width,
              decoded.height,
              cmd.startCol,
              cmd.startBufferLine,
              cmd.cols,
              cmd.rows
            );
          }
          this.term.refresh(0, this.term.rows - 1);
          this.sendPtyResponse(id, 'OK', cmd.keys.q);
        } catch (err: any) {
          console.error('[KittyGraphics] Failed to decode image (T):', err);
          this.sendPtyResponse(id, err.message || 'EBADMSG', cmd.keys.q);
        } finally {
          resolveLoad();
          this.loadingImages.delete(id);
        }
        break;
      }

      case 'p': {
        // Place previously transmitted image by ID
        const id = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        if (id === undefined) {
          this.sendPtyResponse(0, 'ENOENT: Missing image ID', cmd.keys.q);
          return;
        }

        // If the image is currently being decoded asynchronously, await completion
        const pendingLoad = this.loadingImages.get(id);
        if (pendingLoad) {
          await pendingLoad;
        }

        const cached = this.cache.get(id);
        if (!cached) {
          this.sendPtyResponse(id, 'ENOENT: Image ID not found in cache', cmd.keys.q);
          return;
        }

        if (cmd.keys.U === 1) {
          // Virtual placement for Unicode placeholders (U+10EEEE)
          const { cols, rows } = this.computeSpans(cmd.keys, cached.width, cached.height);
          this.virtualPlacements.set(id, {
            imageId: id,
            cols: cmd.keys.c || cols,
            rows: cmd.keys.r || rows,
            srcX: cmd.keys.x,
            srcY: cmd.keys.y,
            srcWidth: cmd.keys.w,
            srcHeight: cmd.keys.h,
          });
          if (cached?.frames && cached.frames.length >= 2 && !cached.animation?.isPlaying) {
            this.startAnimation(id);
          }
        } else {
          this.placeImage(
            id,
            cmd.keys,
            cached.width,
            cached.height,
            cmd.startCol,
            cmd.startBufferLine,
            cmd.cols,
            cmd.rows
          );
        }
        this.term.refresh(0, this.term.rows - 1);
        this.sendPtyResponse(id, 'OK', cmd.keys.q);
        break;
      }

      case 'f': {
        // Animation frame transmission
        const id = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        if (id === undefined) {
          this.sendPtyResponse(0, 'ENOENT: Missing image ID for frame', cmd.keys.q);
          return;
        }

        // Await any pending load for this image ID (e.g. root frame still decoding)
        const pendingLoad = this.loadingImages.get(id);
        if (pendingLoad) {
          await pendingLoad;
        }

        const cached = this.cache.get(id);
        if (!cached) {
          this.sendPtyResponse(id, 'ENOENT: Image not found in cache for animation frame', cmd.keys.q);
          return;
        }

        let resolveLoad!: () => void;
        const loadPromise = new Promise<void>((resolve) => {
          resolveLoad = resolve;
        });
        this.loadingImages.set(id, loadPromise);

        try {
          // In Kitty animation protocol, f defaults to 32 (RGBA).
          // If keys.S matches pixelCount * 4, it is 32-bit RGBA.
          const keysWithFormat = { ...cmd.keys };
          if (keysWithFormat.f === undefined) {
            if (cmd.keys.s && cmd.keys.v) {
              const pixelCount = cmd.keys.s * cmd.keys.v;
              if (cmd.keys.S === pixelCount * 4) {
                keysWithFormat.f = 32;
              } else if (cmd.keys.S === pixelCount * 3) {
                keysWithFormat.f = 24;
              } else if (cached.format) {
                keysWithFormat.f = cached.format as 24 | 32 | 100;
              } else {
                keysWithFormat.f = 32;
              }
            } else if (cached.format) {
              keysWithFormat.f = cached.format as 24 | 32 | 100;
            } else {
              keysWithFormat.f = 32;
            }
          }

          const decoded = await this.decoder.decode(keysWithFormat, cmd.payload);
          const delayMs = this.getFrameDelayMs(cmd.keys);
          const isHeight = (cmd.keys.f === 24 || cmd.keys.f === 32) && cmd.keys.s !== undefined;
          const loopCount = (!isHeight && cmd.keys.v !== undefined) ? cmd.keys.v : 0;

          // Handle sub-rectangle and canvas frame composition
          let frameBitmap = decoded.bitmap;
          let frameWidth = decoded.width;
          let frameHeight = decoded.height;

          const isSubRect = cmd.keys.x !== undefined || cmd.keys.y !== undefined || cmd.keys.c !== undefined || cmd.keys.X !== undefined || (cached && (decoded.width !== cached.width || decoded.height !== cached.height));
          if (cached && isSubRect) {
            const fullWidth = cached.width;
            const fullHeight = cached.height;
            const canvas = new OffscreenCanvas(fullWidth, fullHeight);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const baseFrameNum = cmd.keys.c !== undefined ? cmd.keys.c : (cmd.keys.r !== undefined && cmd.keys.r > 0 ? cmd.keys.r : 0);
              if (baseFrameNum >= 1 && cached.frames && cached.frames[baseFrameNum - 1]) {
                ctx.drawImage(cached.frames[baseFrameNum - 1].bitmap, 0, 0, fullWidth, fullHeight);
              } else if (cached.bitmap) {
                ctx.drawImage(cached.bitmap, 0, 0, fullWidth, fullHeight);
              }

              const patchX = cmd.keys.x || 0;
              const patchY = cmd.keys.y || 0;
              if (cmd.keys.X === 1) {
                ctx.clearRect(patchX, patchY, decoded.width, decoded.height);
              }
              ctx.drawImage(decoded.bitmap, patchX, patchY);
              frameBitmap = canvas.transferToImageBitmap();
              frameWidth = fullWidth;
              frameHeight = fullHeight;
              if (decoded.bitmap !== frameBitmap) {
                decoded.bitmap.close?.();
              }
            }
          }

          const newFrame: KittyAnimationFrame = {
            bitmap: frameBitmap,
            width: frameWidth,
            height: frameHeight,
            byteSize: frameWidth * frameHeight * 4,
            delayMs,
          };

          if (cached) {
            if (!cached.frames) {
              cached.frames = [{
                bitmap: cached.bitmap,
                width: cached.width,
                height: cached.height,
                byteSize: cached.byteSize,
                delayMs: 40,
              }];
            }
            if (!cached.animation) {
              cached.animation = {
                loopCount,
                loopsCompleted: 0,
                currentFrameIndex: 0,
                isPlaying: false,
              };
            } else if (!isHeight && cmd.keys.v !== undefined) {
              cached.animation.loopCount = cmd.keys.v;
            }

            const targetFrameIndex = (cmd.keys.r !== undefined && cmd.keys.r > 0)
              ? (cmd.keys.r - 1)
              : cached.frames.length;

            if (targetFrameIndex < cached.frames.length) {
              const old = cached.frames[targetFrameIndex];
              if (old.bitmap !== frameBitmap) {
                old.bitmap.close?.();
              }
              cached.frames[targetFrameIndex] = newFrame;
            } else {
              cached.frames.push(newFrame);
            }

            cached.lastUsed = Date.now();

            // Auto-start animation if multiple frames exist and not already playing
            if (cached.frames.length >= 2 && !cached.animation.isPlaying) {
              this.startAnimation(id);
            } else {
              this.render();
            }
          } else {
            this.cache.set(id, {
              id,
              bitmap: frameBitmap,
              width: frameWidth,
              height: frameHeight,
              byteSize: frameWidth * frameHeight * 4,
              lastUsed: Date.now(),
              frames: [newFrame],
              animation: {
                loopCount,
                loopsCompleted: 0,
                currentFrameIndex: 0,
                isPlaying: false,
              },
            });
            this.render();
          }

          this.sendPtyResponse(id, 'OK', cmd.keys.q);
        } catch (err: any) {
          console.error('[KittyGraphics] Failed to decode frame (f):', err);
          this.sendPtyResponse(id, err.message || 'EBADMSG', cmd.keys.q);
        } finally {
          resolveLoad();
          this.loadingImages.delete(id);
        }
        break;
      }

      case 'a': {
        // Animation control
        const id = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        if (id === undefined) {
          this.sendPtyResponse(0, 'ENOENT: Missing image ID for animation control', cmd.keys.q);
          return;
        }

        // Await any pending load for this image ID
        const pendingLoad = this.loadingImages.get(id);
        if (pendingLoad) {
          await pendingLoad;
        }

        const cached = this.cache.get(id);
        if (!cached) {
          this.sendPtyResponse(id, 'ENOENT: Image not found in cache', cmd.keys.q);
          return;
        }

        if (!cached.animation) {
          cached.animation = {
            loopCount: 0,
            loopsCompleted: 0,
            currentFrameIndex: 0,
            isPlaying: false,
          };
        }

        // Loop count v:
        // Protocol: v=0 is ignored (default infinite), v=1 is infinite loop, v > 1 is loop (v - 1) times.
        if (cmd.keys.v !== undefined && cmd.keys.v > 0) {
          cached.animation.loopCount = cmd.keys.v;
          cached.animation.loopsCompleted = 0;
        }

        // Frame jump: r or c (1-based frame number)
        const jumpFrame = cmd.keys.r ?? cmd.keys.c;
        if (jumpFrame !== undefined && cached.frames && cached.frames.length > 0) {
          const idx = Math.max(0, Math.min(cached.frames.length - 1, jumpFrame - 1));
          cached.animation.currentFrameIndex = idx;
          const target = cached.frames[idx];
          cached.bitmap = target.bitmap;
          cached.width = target.width;
          cached.height = target.height;
          this.render();
        }

        // Gap/delay update: z
        if (cmd.keys.z !== undefined && cached.frames) {
          const delay = Math.max(10, cmd.keys.z);
          const targetIdx = (jumpFrame !== undefined && jumpFrame >= 1 && jumpFrame <= cached.frames.length)
            ? jumpFrame - 1
            : (cmd.keys.r !== undefined && cmd.keys.r >= 1 && cmd.keys.r <= cached.frames.length)
              ? cmd.keys.r - 1
              : cached.animation.currentFrameIndex;
          if (cached.frames[targetIdx]) {
            cached.frames[targetIdx].delayMs = delay;
          }
        }

        // State control: s (1=stop, 2=loading, 3=run)
        const s = cmd.keys.s;
        if (s === 1) {
          this.stopAnimation(id);
        } else if (s === 2) {
          // Loading mode: play animation while frames are loading
          if (!cached.animation.isPlaying && cached.frames && cached.frames.length >= 2) {
            this.startAnimation(id);
          }
        } else if (s === 3 || s === undefined) {
          if (cached.frames && cached.frames.length >= 2) {
            this.startAnimation(id);
          }
        }

        this.sendPtyResponse(id, 'OK', cmd.keys.q);
        break;
      }

      case 'd': {
        // Delete images / placements
        const target = cmd.keys.d || 'a';
        const id = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        if (target === 'a') {
          for (const k of this.cache.keys()) {
            this.stopAnimation(k);
          }
          this.placements.clear();
          this.virtualPlacements.clear();
          this.cache.clear();
        } else if (id !== undefined) {
          this.stopAnimation(id);
          this.cache.delete(id);
          this.virtualPlacements.delete(id);
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
        this.term.refresh(0, this.term.rows - 1);
        this.sendPtyResponse(id ?? 0, 'OK', cmd.keys.q);
        break;
      }
    }
  }

  private getFrameDelayMs(keys: KittyControlKeys): number {
    return (keys.z !== undefined && keys.z > 0) ? keys.z : 40;
  }

  private startAnimation(imageId: number): void {
    if (this.isDisposed) return;
    const cached = this.cache.get(imageId);
    if (!cached || !cached.frames || cached.frames.length < 2) return;

    if (!cached.animation) {
      cached.animation = {
        loopCount: 0,
        loopsCompleted: 0,
        currentFrameIndex: 0,
        isPlaying: false,
      };
    }

    cached.animation.isPlaying = true;
    this.scheduleNextFrame(imageId);
  }

  private stopAnimation(imageId: number): void {
    const cached = this.cache.get(imageId);
    if (cached?.animation) {
      if (cached.animation.timer) {
        clearTimeout(cached.animation.timer);
        cached.animation.timer = undefined;
      }
      cached.animation.isPlaying = false;
    }
  }

  private scheduleNextFrame(imageId: number): void {
    if (this.isDisposed) return;
    const cached = this.cache.get(imageId);
    if (!cached || !cached.frames || cached.frames.length < 2 || !cached.animation || !cached.animation.isPlaying) {
      return;
    }

    if (cached.animation.timer) {
      clearTimeout(cached.animation.timer);
      cached.animation.timer = undefined;
    }

    const currentFrame = cached.frames[cached.animation.currentFrameIndex];
    const delay = Math.max(10, currentFrame?.delayMs || 40);

    cached.animation.timer = setTimeout(() => {
      this.advanceFrame(imageId);
    }, delay);
  }

  private advanceFrame(imageId: number): void {
    if (this.isDisposed) return;
    const cached = this.cache.get(imageId);
    if (!cached || !cached.frames || cached.frames.length < 2 || !cached.animation || !cached.animation.isPlaying) {
      return;
    }

    const anim = cached.animation;
    const totalFrames = cached.frames.length;
    const nextIndex = anim.currentFrameIndex + 1;

    if (nextIndex >= totalFrames) {
      // Completed one full loop
      anim.loopsCompleted++;

      // Protocol: v=0 (default) and v=1 mean play infinite loops.
      // v > 1 means play (v - 1) loops.
      if (anim.loopCount > 1 && anim.loopsCompleted >= (anim.loopCount - 1)) {
        // Finished designated loop count: stop and freeze on final frame
        this.stopAnimation(imageId);
        return;
      }

      // v == 0 (Infinite loop) or loopsCompleted < loopCount:
      // Loop back to first frame (frame 1, index 0)
      anim.currentFrameIndex = 0;
    } else {
      anim.currentFrameIndex = nextIndex;
    }

    // Switch active texture to current frame
    const activeFrame = cached.frames[anim.currentFrameIndex];
    cached.bitmap = activeFrame.bitmap;
    cached.width = activeFrame.width;
    cached.height = activeFrame.height;

    // Render updated frame on graphics canvas
    this.render();

    // Reschedule timer for subsequent frame (guaranteed to continue loop)
    this.scheduleNextFrame(imageId);
  }

  private placeImage(
    imageId: number,
    keys: KittyControlKeys,
    pixelWidth: number,
    pixelHeight: number,
    anchorCol?: number,
    anchorBufferLine?: number,
    spanCols?: number,
    spanRows?: number
  ) {
    const { baseY, cursorY, cursorX } = this.term.buffer.active;

    // Use pre-computed spans or compute them
    const { cols, rows } = (spanCols && spanRows)
      ? { cols: spanCols, rows: spanRows }
      : this.computeSpans(keys, pixelWidth, pixelHeight);

    const placementId = keys.p ? String(keys.p) : `img-${imageId}-${Date.now()}`;
    const existingPlacement = this.placements.get(placementId);

    // Anchor coordinates: strictly prioritize captured anchor -> existing placement anchor -> current cursor
    const bufferLine = anchorBufferLine !== undefined
      ? anchorBufferLine
      : (existingPlacement ? existingPlacement.bufferLine : (baseY + cursorY));
    const col = anchorCol !== undefined
      ? anchorCol
      : (existingPlacement ? existingPlacement.col : cursorX);

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
      srcX: keys.x,
      srcY: keys.y,
      srcWidth: keys.w,
      srcHeight: keys.h,
    };

    this.placements.set(placementId, placement);
    this.isCanvasClear = false;

    const cachedRec = this.cache.get(imageId);
    TauriApi.logKittyDebug(
      `[placeImage] img=${imageId} placement=${placementId} bufferLine=${bufferLine} col=${col} spans=${cols}x${rows} animFrames=${cachedRec?.frames?.length}`
    );

    if (cachedRec?.frames && cachedRec.frames.length >= 2 && !cachedRec.animation?.isPlaying) {
      this.startAnimation(imageId);
    } else {
      this.render();
    }
  }

  public render() {
    if (this.isDisposed || !this.canvas || !this.ctx || !this.screenElement) return;

    // Fast-path: if no images or placements are active, skip canvas redraw if already clear
    if (this.placements.size === 0 && this.cache.size === 0) {
      if (this.isCanvasClear) return;
      const width = this.screenElement.clientWidth;
      const height = this.screenElement.clientHeight;
      this.ctx.clearRect(0, 0, width, height);
      this.isCanvasClear = true;
      return;
    }

    this.isCanvasClear = false;
    this.installCanvasRendererHook();
    this.syncCanvasSize();

    const dpr = window.devicePixelRatio || 1;
    const width = this.screenElement.clientWidth;
    const height = this.screenElement.clientHeight;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, width, height);

    this.renderVisiblePlaceholders();

    if (this.placements.size === 0) return;

    const cellWidth = this.getCellWidth();
    const cellHeight = this.getCellHeight();
    const viewportY = this.term.buffer.active.viewportY;
    TauriApi.logKittyDebug(
      `[render] placements=${this.placements.size}, viewportY=${viewportY}, screenDims=${width}x${height}, cellDims=${cellWidth}x${cellHeight}`
    );
    const maxScrollback = this.term.options.scrollback || 10000;
    const oldestAllowedLine = Math.max(0, this.term.buffer.active.baseY - maxScrollback);
    const termCols = this.term.cols || 80;
    const termRows = this.term.rows || 24;

    // Approach A: Scissoring / Viewport Clipping Region
    // Constrains rasterization strictly within terminal viewport dimensions [0..width, 0..height]
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, width, height);
    this.ctx.clip();

    for (const [key, p] of this.placements.entries()) {
      // Memory pruning: discard placement only when the entire image span has scrolled past max scrollback
      if (p.bufferLine + p.rows <= oldestAllowedLine) {
        this.placements.delete(key);
        continue;
      }

      // Calculate screen row relative to current viewport
      const screenRow = p.bufferLine - viewportY;

      const imgColStart = p.col;
      const imgColEnd = p.col + p.cols;
      const imgRowStart = screenRow;
      const imgRowEnd = screenRow + p.rows;

      // 1. AABB Intersection Check:
      // Verify overlap between image rectangle [imgColStart..imgColEnd, imgRowStart..imgRowEnd]
      // and viewport visible grid [0..termCols, 0..termRows].
      // If completely outside (no overlap), cull immediately.
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
        this.placements.delete(key);
        continue;
      }

      const padding = this.getTerminalPadding();

      // 2. Continuous Target Geometry in Screen Pixel Space
      // render_x = padding_left + col * cell_width (+ xOffset)
      // render_y = padding_top + (row - scroll_offset) * cell_height (+ yOffset)
      const rawX = padding.left + p.col * cellWidth + p.xOffset;
      const rawY = padding.top + screenRow * cellHeight + p.yOffset;
      const rawW = p.cols * cellWidth;
      const rawH = p.rows * cellHeight;

      if (rawW <= 0 || rawH <= 0) continue;

      // 3. Clamped Destination Rectangle within Viewport [0..width, 0..height]
      const destX = Math.max(0, Math.min(width, rawX));
      const destY = Math.max(0, Math.min(height, rawY));
      const destRight = Math.max(0, Math.min(width, rawX + rawW));
      const destBottom = Math.max(0, Math.min(height, rawY + rawH));

      const destW = destRight - destX;
      const destH = destBottom - destY;

      if (destW <= 0 || destH <= 0) continue;

      // 4. Approach B: Texture UV and Vertex Coordinate Offset Calculation
      // If k rows extend above the viewport (rawY < 0), destY clamps to 0,
      // producing vertical UV offset relV1 = -rawY / rawH = (k * cellHeight) / (rows * cellHeight) = k / rows.
      const relU1 = (destX - rawX) / rawW;
      const relU2 = (destRight - rawX) / rawW;
      const relV1 = (destY - rawY) / rawH;
      const relV2 = (destBottom - rawY) / rawH;

      // Map UV fractions to source sub-rectangle coordinates within the bitmap
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
        TauriApi.logKittyDebug(
          `[drawImage] img=${p.imageId} frame=${img.animation?.currentFrameIndex ?? 0}/${img.frames?.length ?? 1} dest=(${destX},${destY},${destW}x${destH})`
        );
      } catch (err: any) {
        TauriApi.logKittyDebug(`[drawImage ERROR] img=${p.imageId}: ${err?.message || err}`);
        console.warn('Failed to draw partially clipped image placement:', err);
      }
    }

    this.ctx.restore();
  }

  private renderVisiblePlaceholders(): void {
    if (!this.ctx || !this.screenElement || this.cache.size === 0) return;

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

        const decoded = decodePlaceholderCell(cell, prevDecoded, this.lastTransmittedImageId);
        if (!decoded) {
          prevDecoded = null;
          continue;
        }
        prevDecoded = decoded;

        const img = resolveImageFromCache(
          this.cache,
          decoded.imageId,
          cell,
          this.lastTransmittedImageId
        );
        if (!img || !img.bitmap) continue;

        const vp = this.virtualPlacements.get(img.id) || this.virtualPlacements.get(decoded.imageId);
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

        const destX = padding.left + col * cellWidth;
        const destY = padding.top + row * cellHeight;

        try {
          this.ctx.save();
          this.ctx.globalCompositeOperation = 'source-over';
          this.ctx.globalAlpha = 1.0;
          this.ctx.imageSmoothingEnabled = true;
          this.ctx.imageSmoothingQuality = 'high';

          this.ctx.beginPath();
          this.ctx.rect(destX, destY, cellWidth, cellHeight);
          this.ctx.clip();

          this.ctx.drawImage(
            img.bitmap,
            uv.sx,
            uv.sy,
            uv.sw,
            uv.sh,
            destX,
            destY,
            cellWidth,
            cellHeight
          );
          this.ctx.restore();
        } catch {
          // ignore closed bitmap
        }
      }
    }
  }

  private getTerminalPadding(): { left: number; top: number } {
    if (!this.screenElement) return { left: 0, top: 0 };

    const termEl = (this.screenElement.closest?.('.xterm') || this.screenElement.querySelector?.('.xterm')) as HTMLElement | null;
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

  private sendPtyResponse(id: number, message: string, quiet?: number, force: boolean = false) {
    if (!force) {
      if (quiet === 2) return; // q=2: suppress all responses (silent)
      if (quiet === 1 && message === 'OK') return; // q=1: errors only, suppress OK
      if (quiet === undefined && message === 'OK') return; // quiet unspecified: suppress OK to prevent prompt pollution
      // q=0: send both OK and errors
    }

    const resp = id > 0 ? `\x1b_Gi=${id};${message}\x1b\\` : `\x1b_G;${message}\x1b\\`;
    if (this.onPtyWrite) {
      try {
        this.onPtyWrite(resp);
      } catch (err) {
        console.warn('Failed to write Kitty response via onPtyWrite:', err);
      }
    } else {
      TauriApi.writePty(this.sessionId, resp).catch(() => {
        // ignore write error if session closed
      });
    }
  }

  public dispose() {
    this.isDisposed = true;
    for (const id of this.cache.keys()) {
      this.stopAnimation(id);
    }
    this.loadingImages.clear();
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
    this.virtualPlacements.clear();
    this.lastDecodedPlaceholder = null;

    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
      this.canvas = null;
      this.ctx = null;
    }
  }
}
