import { Terminal } from '@xterm/xterm';
import {
  KittyCommand,
  KittyControlKeys,
  KittyPlacement,
  KittyVirtualPlacement,
} from './types';
import { KittyApcParser } from './parser';
import { KittyDecoder } from './decoder';
import { KittyLruCache } from './lruCache';
import { isPlaceholderCell, PLACEHOLDER_CODEPOINT } from './unicodePlaceholder';
import { TauriApi } from '../tauriApi';
import { KittyGraphicsConfig } from '../../types';
import { KittyAnimationController } from './animationController';
import { KittyCanvasRenderer } from './renderer';
import { KittyCommandHandler } from './commandHandler';

export class KittyGraphicsManager {
  private term: Terminal;
  private sessionId: string;
  private parser: KittyApcParser;
  private decoder: KittyDecoder;
  private cache: KittyLruCache;
  private placements: Map<string, KittyPlacement> = new Map();
  private virtualPlacements: Map<number, KittyVirtualPlacement> = new Map();
  private commandQueue: Promise<void> = Promise.resolve();
  private loadingImages: Map<number, Promise<void>> = new Map();
  private disposables: (() => void)[] = [];
  private isDisposed: boolean = false;
  private canvasAddon?: any;
  private onPtyWrite?: (data: string) => void;
  private isHookInstalled: boolean = false;
  private renderScheduled: boolean = false;

  private renderer: KittyCanvasRenderer;
  private animationController: KittyAnimationController;
  private commandHandler: KittyCommandHandler;

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

    this.renderer = new KittyCanvasRenderer(this.term, this.cache);
    this.renderer.mountCanvas(container);

    this.animationController = new KittyAnimationController(this.cache, () => {
      this.render();
    });

    this.commandHandler = new KittyCommandHandler({
      term: this.term,
      decoder: this.decoder,
      cache: this.cache,
      placements: this.placements,
      virtualPlacements: this.virtualPlacements,
      animationController: this.animationController,
      loadingImages: this.loadingImages,
      sendPtyResponse: (id, msg, quiet, force, defaultSilentOnSuccess) =>
        this.sendPtyResponse(id, msg, quiet, force, defaultSilentOnSuccess),
      computeSpans: (keys, w, h) => this.computeSpans(keys, w, h),
      flushTerminalBuffer: () => this.flushTerminalBuffer(),
      render: () => this.render(),
      scheduleRender: () => this.scheduleRender(),
      markCanvasDirty: () => this.renderer.setIsCanvasClear(false),
    });

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

  public updateConfig(config?: KittyGraphicsConfig): void {
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

  public syncCanvasSize(): void {
    this.renderer.syncCanvasSize();
  }

  private attachTerminalEvents(): void {
    const scrollDisp = this.term.onScroll(() => {
      this.scheduleRender();
    });
    this.disposables.push(() => scrollDisp.dispose());

    const renderDisp = this.term.onRender(() => {
      this.scheduleRender();
    });
    this.disposables.push(() => renderDisp.dispose());

    const resizeDisp = this.term.onResize(() => {
      this.syncCanvasSize();
      this.scheduleRender();
    });
    this.disposables.push(() => resizeDisp.dispose());
  }

  public installCanvasRendererHook(): void {
    if (this.isHookInstalled) return;
    try {
      const core = (this.term as any)._core;
      const renderService = core?._renderService;

      if (
        renderService &&
        !renderService.__kittyHooked &&
        typeof renderService.setRenderer === 'function'
      ) {
        renderService.__kittyHooked = true;
        const origSetRenderer = renderService.setRenderer.bind(renderService);
        renderService.setRenderer = (r: any) => {
          origSetRenderer(r);
          this.isHookInstalled = false;
          this.installCanvasRendererHook();
        };
      }

      const renderer =
        renderService?._renderer?.value ||
        renderService?._renderer ||
        this.canvasAddon?._renderer;
      if (!renderer) return;

      const rowFactory = (renderer as any)._rowFactory;
      if (rowFactory) {
        const rowFactoryProto = Object.getPrototypeOf(rowFactory);
        if (
          rowFactoryProto &&
          !rowFactoryProto.__kittyHooked &&
          typeof rowFactoryProto.createRow === 'function'
        ) {
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

        const fontGlyphPass = function (this: any, startRow: number, endRow: number) {
          let hasPlaceholders = false;
          this._forEachCell(startRow, endRow, (cell: any, x: number, y: number) => {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              hasPlaceholders = true;
              return;
            }
            this._drawChars(cell, x, y);
          });

          if (hasPlaceholders) {
            self.scheduleRender();
          }
        };

        if (
          textProto &&
          !textProto.__kittyForegroundHooked &&
          typeof textProto._drawForeground === 'function'
        ) {
          textProto.__kittyForegroundHooked = true;
          textProto._drawForeground = fontGlyphPass;
        }

        if (
          !textLayer.__kittyForegroundHooked &&
          typeof textLayer._drawForeground === 'function'
        ) {
          textLayer.__kittyForegroundHooked = true;
          textLayer._drawForeground = fontGlyphPass;
        }

        if (
          baseProto &&
          !baseProto.__kittyBaseHooked &&
          typeof baseProto._drawChars === 'function'
        ) {
          baseProto.__kittyBaseHooked = true;
          const origBaseDrawChars = baseProto._drawChars;
          baseProto._drawChars = function (cell: any, x: number, y: number) {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              return;
            }
            return origBaseDrawChars.call(this, cell, x, y);
          };
        }

        if (
          baseProto &&
          !baseProto.__kittyBaseFillHooked &&
          typeof baseProto._fillCharTrueColor === 'function'
        ) {
          baseProto.__kittyBaseFillHooked = true;
          const origBaseFill = baseProto._fillCharTrueColor;
          baseProto._fillCharTrueColor = function (cell: any, x: number, y: number) {
            if (
              (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
              isPlaceholderCell(cell)
            ) {
              return;
            }
            return origBaseFill.call(this, cell, x, y);
          };
        }

        if (
          textProto &&
          !textProto.__kittyOverlapHooked &&
          typeof textProto._isOverlapping === 'function'
        ) {
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

        if (
          !textLayer.__kittyOverlapHooked &&
          typeof textLayer._isOverlapping === 'function'
        ) {
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

        if (!textLayer.__kittyHooked) {
          textLayer.__kittyHooked = true;
          const origDrawChars = textLayer._drawChars.bind(textLayer);
          textLayer._drawChars = (cell: any, x: number, y: number) => {
            try {
              if (
                (typeof cell?.getCode === 'function' && cell.getCode() === PLACEHOLDER_CODEPOINT) ||
                isPlaceholderCell(cell)
              ) {
                return;
              }
              return origDrawChars(cell, x, y);
            } catch {
              return origDrawChars(cell, x, y);
            }
          };
        }
      }

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
                cursorLayer._ctx.save();
                cursorLayer._ctx.strokeStyle = cursorLayer._themeService.colors.cursor.css;
                cursorLayer._strokeRectAtCell(
                  x,
                  y,
                  typeof cell?.getWidth === 'function' ? cell.getWidth() : 1,
                  1
                );
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
              return;
            }
            return origFillCharTrueColor(cell, x, y);
          };
        }
      }

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
    _ctx: CanvasRenderingContext2D,
    _cell: any,
    _col: number,
    _row: number,
    _cellWidth: number,
    _cellHeight: number
  ): void {
    // Deprecated: Rendered on dedicated Kitty graphics layer
  }

  private queueCommand(cmd: KittyCommand): void {
    this.commandQueue = this.commandQueue
      .then(async () => {
        if (this.isDisposed) return;
        await this.commandHandler.handleCommand(cmd);
      })
      .catch((err) => {
        console.warn('Error handling Kitty command:', err);
      });
  }

  public filterPtyOutput(chunk: string): string {
    if (this.isDisposed) return chunk;

    const { cleanText, commands } = this.parser.parse(chunk, (cmd, textBefore) => {
      return this.generatePlaceholderSequence(cmd, textBefore);
    });

    if (commands.length > 0) {
      for (const cmd of commands) {
        this.queueCommand(cmd);
      }
    }

    return cleanText;
  }

  public async flush(): Promise<void> {
    await this.commandQueue;
  }

  private calculateCursorOffset(text: string): {
    deltaCol: number;
    deltaLine: number;
    hasCr: boolean;
    absoluteCol?: number;
    absoluteRow?: number;
  } {
    if (!text) return { deltaCol: 0, deltaLine: 0, hasCr: false };
    let deltaLine = 0;
    let lastLineLen = 0;
    let hasCr = false;
    let absoluteCol: number | undefined;
    let absoluteRow: number | undefined;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        deltaLine++;
        lastLineLen = 0;
        hasCr = false;
        if (absoluteRow !== undefined) absoluteRow++;
        absoluteCol = 0;
      } else if (text[i] === '\r') {
        lastLineLen = 0;
        hasCr = true;
        absoluteCol = 0;
      } else if (text[i] === '\x1b' && text[i + 1] === '[') {
        let j = i + 2;
        while (j < text.length && text.charCodeAt(j) >= 0x20 && text.charCodeAt(j) <= 0x3f) {
          j++;
        }
        if (j < text.length && text.charCodeAt(j) >= 0x40 && text.charCodeAt(j) <= 0x7e) {
          const finalChar = text[j];
          const paramStr = text.slice(i + 2, j);
          const paramVal = parseInt(paramStr, 10) || 1;
          if (finalChar === 'C') {
            lastLineLen += paramVal;
            if (absoluteCol !== undefined) absoluteCol += paramVal;
          } else if (finalChar === 'D') {
            lastLineLen = Math.max(0, lastLineLen - paramVal);
            if (absoluteCol !== undefined) absoluteCol = Math.max(0, absoluteCol - paramVal);
          } else if (finalChar === 'G') {
            lastLineLen = Math.max(0, paramVal - 1);
            absoluteCol = Math.max(0, paramVal - 1);
            hasCr = true;
          } else if (finalChar === 'H' || finalChar === 'f') {
            const parts = paramStr.split(';');
            const r = (parseInt(parts[0], 10) || 1) - 1;
            const c = (parseInt(parts[1], 10) || 1) - 1;
            absoluteRow = Math.max(0, r);
            absoluteCol = Math.max(0, c);
            lastLineLen = absoluteCol;
            hasCr = true;
          } else if (finalChar === 'A') {
            deltaLine = Math.max(0, deltaLine - paramVal);
            if (absoluteRow !== undefined) absoluteRow = Math.max(0, absoluteRow - paramVal);
          } else if (finalChar === 'B') {
            deltaLine += paramVal;
            if (absoluteRow !== undefined) absoluteRow += paramVal;
          }
          i = j;
          continue;
        }
        lastLineLen++;
      } else {
        lastLineLen++;
        if (absoluteCol !== undefined) absoluteCol++;
      }
    }
    return { deltaCol: lastLineLen, deltaLine, hasCr, absoluteCol, absoluteRow };
  }

  private flushTerminalBuffer(): void {
    try {
      const core = (this.term as any)._core;
      if (core?._writeBuffer && typeof core._writeBuffer._innerWrite === 'function') {
        core._writeBuffer._innerWrite();
      }
    } catch {}
  }

  private computeSpans(
    keys: KittyControlKeys,
    pixelWidth?: number,
    pixelHeight?: number
  ): { cols: number; rows: number } {
    const termCols = this.term.cols || 80;
    const termRows = this.term.rows || 24;

    const cellWidth = this.renderer.getCellWidth();
    const cellHeight = this.renderer.getCellHeight();

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
      } catch {}
    }

    return null;
  }

  private generatePlaceholderSequence(cmd: KittyCommand, textBefore: string): string {
    const action = cmd.keys.a || 't';
    if (action !== 'T' && action !== 'p') {
      return '';
    }

    if (cmd.keys.U === 1) {
      return '';
    }

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

    this.flushTerminalBuffer();

    const { deltaCol, deltaLine, hasCr, absoluteCol, absoluteRow } =
      this.calculateCursorOffset(textBefore);
    let startCol = this.term.buffer.active.cursorX;
    let startBufferLine = this.term.buffer.active.baseY + this.term.buffer.active.cursorY;

    if (absoluteRow !== undefined && absoluteCol !== undefined) {
      startCol = absoluteCol % termCols;
      startBufferLine = this.term.buffer.active.baseY + absoluteRow;
    } else if (deltaLine > 0 || hasCr) {
      startCol = deltaCol % termCols;
      startBufferLine += deltaLine;
    } else if (deltaCol > 0) {
      startCol = (startCol + deltaCol) % termCols;
    }

    cmd.startCol = startCol;
    cmd.startBufferLine = startBufferLine;
    cmd.cols = cols;
    cmd.rows = rows;

    const C = cmd.keys.C ?? 0;
    if (C === 1) {
      return '';
    }

    if (this.term.buffer.active.type === 'alternate') {
      return '';
    }

    let seq = '';
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

    if (startCol + cols >= termCols) {
      seq += '\r\n';
    }

    return seq;
  }

  public scheduleRender(): void {
    if (this.renderScheduled || this.isDisposed) return;
    this.renderScheduled = true;
    const scheduleFn =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: () => void) => setTimeout(cb, 16);
    scheduleFn(() => {
      this.renderScheduled = false;
      if (!this.isDisposed) {
        this.render();
      }
    });
  }

  public render(): void {
    this.installCanvasRendererHook();
    this.renderer.render(
      this.placements,
      this.virtualPlacements,
      this.commandHandler.lastTransmittedImageId
    );
  }

  public scanPlaceholderGridDimensions(): void {
    this.renderer.scanPlaceholderGridDimensions(
      this.virtualPlacements,
      this.commandHandler.lastTransmittedImageId
    );
  }

  private sendPtyResponse(
    id: number,
    message: string,
    quiet?: number,
    force: boolean = false,
    defaultSilentOnSuccess: boolean = false
  ): void {
    if (!force) {
      if (quiet === 2) return;
      if (quiet === 1 && message === 'OK') return;
      if (quiet === undefined && message === 'OK') {
        if (defaultSilentOnSuccess) return;
        if (id === 0) return;
      }
    }

    const resp = id > 0 ? `\x1b_Gi=${id};${message}\x1b\\` : `\x1b_G;${message}\x1b\\`;
    if (this.onPtyWrite) {
      try {
        this.onPtyWrite(resp);
      } catch (err) {
        console.warn('Failed to write Kitty response via onPtyWrite:', err);
      }
    } else {
      TauriApi.writePty(this.sessionId, resp).catch(() => {});
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    this.animationController.dispose();
    this.loadingImages.clear();
    for (const d of this.disposables) {
      try {
        d();
      } catch {}
    }
    this.disposables = [];
    this.cache.clear();
    for (const p of this.placements.values()) {
      try {
        p.marker?.dispose();
      } catch {}
    }
    this.placements.clear();
    this.virtualPlacements.clear();
    this.renderer.dispose();
  }
}
