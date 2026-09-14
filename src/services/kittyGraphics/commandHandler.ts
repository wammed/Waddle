import { Terminal } from '@xterm/xterm';
import {
  KittyCommand,
  KittyControlKeys,
  KittyPlacement,
  KittyVirtualPlacement,
  KittyAnimationFrame,
} from './types';
import { KittyDecoder } from './decoder';
import { KittyLruCache } from './lruCache';
import { KittyAnimationController } from './animationController';
import { TauriApi } from '../tauriApi';

export interface CommandHandlerContext {
  term: Terminal;
  decoder: KittyDecoder;
  cache: KittyLruCache;
  placements: Map<string, KittyPlacement>;
  virtualPlacements: Map<number, KittyVirtualPlacement>;
  animationController: KittyAnimationController;
  loadingImages: Map<number, Promise<void>>;
  sendPtyResponse: (
    id: number,
    message: string,
    quiet?: number,
    force?: boolean,
    defaultSilentOnSuccess?: boolean
  ) => void;
  computeSpans: (
    keys: KittyControlKeys,
    pixelWidth: number,
    pixelHeight: number
  ) => { cols: number; rows: number };
  flushTerminalBuffer: () => void;
  render: () => void;
  scheduleRender: () => void;
  markCanvasDirty: () => void;
}

export class KittyCommandHandler {
  private ctx: CommandHandlerContext;
  public nextImageId: number = 1;
  public lastTransmittedImageId: number = 0;

  constructor(ctx: CommandHandlerContext) {
    this.ctx = ctx;
  }

  public async handleCommand(cmd: KittyCommand): Promise<void> {
    const action = cmd.keys.a || 't';

    switch (action) {
      case 'q': {
        // Query action (a=q):
        // Query if an image exists in cache / manager, or probe protocol capability.
        const id =
          cmd.keys.i !== undefined
            ? cmd.keys.i
            : cmd.keys.I !== undefined
            ? cmd.keys.I
            : 0;
        if (cmd.keys.s === 1 && cmd.keys.v === 1) {
          // Handled synchronously in Rust by pty.rs directly on the PTY byte stream.
          return;
        } else if (id > 0) {
          const pendingLoad = this.ctx.loadingImages.get(id);
          if (pendingLoad) {
            await pendingLoad;
          }
          const exists = this.ctx.cache.has(id) || this.ctx.virtualPlacements.has(id);
          this.ctx.sendPtyResponse(id, exists ? 'OK' : 'ENOENT', cmd.keys.q, true);
        } else {
          return;
        }
        break;
      }

      case 't': {
        // Transmit and store in cache
        const explicitId = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        const id = explicitId ?? this.nextImageId++;
        this.lastTransmittedImageId = id;
        let resolveLoad!: () => void;
        const loadPromise = new Promise<void>((resolve) => {
          resolveLoad = resolve;
        });
        this.ctx.loadingImages.set(id, loadPromise);

        try {
          const decoded = await this.ctx.decoder.decode(cmd.keys, cmd.payload);
          const isHeight =
            (cmd.keys.f === 24 || cmd.keys.f === 32) && cmd.keys.s !== undefined;
          const loopCount = !isHeight && cmd.keys.v !== undefined ? cmd.keys.v : 0;
          const initialFrame: KittyAnimationFrame = {
            bitmap: decoded.bitmap,
            width: decoded.width,
            height: decoded.height,
            byteSize: decoded.byteSize,
            delayMs: this.ctx.animationController.getFrameDelayMs(cmd.keys),
          };

          const detectedFormat =
            cmd.keys.f ??
            (decoded.byteSize === decoded.width * decoded.height * 3 ? 24 : 32);
          this.ctx.cache.set(id, {
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
          this.ctx.term.refresh(0, this.ctx.term.rows - 1);
          this.ctx.sendPtyResponse(explicitId ?? 0, 'OK', cmd.keys.q);
        } catch (err: any) {
          console.error('[KittyGraphics] Failed to decode image (t):', err);
          const msg = typeof err === 'string' ? err : err?.message || 'EBADMSG';
          this.ctx.sendPtyResponse(explicitId ?? 0, msg, cmd.keys.q);
        } finally {
          resolveLoad();
          this.ctx.loadingImages.delete(id);
        }
        break;
      }

      case 'T': {
        // Transmit and display immediately
        const explicitId = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        const id = explicitId ?? this.nextImageId++;
        this.lastTransmittedImageId = id;
        let resolveLoad!: () => void;
        const loadPromise = new Promise<void>((resolve) => {
          resolveLoad = resolve;
        });
        this.ctx.loadingImages.set(id, loadPromise);

        try {
          const decoded = await this.ctx.decoder.decode(cmd.keys, cmd.payload);
          const isHeight =
            (cmd.keys.f === 24 || cmd.keys.f === 32) && cmd.keys.s !== undefined;
          const loopCount = !isHeight && cmd.keys.v !== undefined ? cmd.keys.v : 0;
          const initialFrame: KittyAnimationFrame = {
            bitmap: decoded.bitmap,
            width: decoded.width,
            height: decoded.height,
            byteSize: decoded.byteSize,
            delayMs: this.ctx.animationController.getFrameDelayMs(cmd.keys),
          };

          const detectedFormat =
            cmd.keys.f ??
            (decoded.byteSize === decoded.width * decoded.height * 3 ? 24 : 32);
          this.ctx.cache.set(id, {
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
            const explicitCols = cmd.keys.c;
            const explicitRows = cmd.keys.r;
            const fallback =
              !explicitCols || !explicitRows
                ? this.ctx.computeSpans(cmd.keys, decoded.width, decoded.height)
                : null;
            this.ctx.virtualPlacements.set(id, {
              imageId: id,
              explicitCols,
              explicitRows,
              cols: explicitCols || fallback?.cols || 1,
              rows: explicitRows || fallback?.rows || 1,
              srcX: cmd.keys.x,
              srcY: cmd.keys.y,
              srcWidth: cmd.keys.w,
              srcHeight: cmd.keys.h,
            });
            const cachedRec = this.ctx.cache.get(id);
            if (
              cachedRec?.frames &&
              cachedRec.frames.length >= 2 &&
              !cachedRec.animation?.isPlaying
            ) {
              this.ctx.animationController.startAnimation(id);
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
          this.ctx.term.refresh(0, this.ctx.term.rows - 1);
          this.ctx.sendPtyResponse(explicitId ?? 0, 'OK', cmd.keys.q);
        } catch (err: any) {
          console.error('[KittyGraphics] Failed to decode image (T):', err);
          const msg = typeof err === 'string' ? err : err?.message || 'EBADMSG';
          this.ctx.sendPtyResponse(explicitId ?? 0, msg, cmd.keys.q);
        } finally {
          resolveLoad();
          this.ctx.loadingImages.delete(id);
        }
        break;
      }

      case 'p': {
        // Place previously transmitted image by ID
        const id = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        if (id === undefined) {
          this.ctx.sendPtyResponse(0, 'ENOENT: Missing image ID', cmd.keys.q);
          return;
        }

        const pendingLoad = this.ctx.loadingImages.get(id);
        if (pendingLoad) {
          await pendingLoad;
        }

        const cached = this.ctx.cache.get(id);
        if (!cached) {
          this.ctx.sendPtyResponse(id, 'ENOENT: Image ID not found in cache', cmd.keys.q);
          return;
        }

        if (cmd.keys.U === 1) {
          const explicitCols = cmd.keys.c;
          const explicitRows = cmd.keys.r;
          const fallback =
            !explicitCols || !explicitRows
              ? this.ctx.computeSpans(cmd.keys, cached.width, cached.height)
              : null;
          this.ctx.virtualPlacements.set(id, {
            imageId: id,
            explicitCols,
            explicitRows,
            cols: explicitCols || fallback?.cols || 1,
            rows: explicitRows || fallback?.rows || 1,
            srcX: cmd.keys.x,
            srcY: cmd.keys.y,
            srcWidth: cmd.keys.w,
            srcHeight: cmd.keys.h,
          });
          if (
            cached?.frames &&
            cached.frames.length >= 2 &&
            !cached.animation?.isPlaying
          ) {
            this.ctx.animationController.startAnimation(id);
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
        this.ctx.term.refresh(0, this.ctx.term.rows - 1);
        this.ctx.sendPtyResponse(id, 'OK', cmd.keys.q, false, true);
        break;
      }

      case 'f': {
        // Animation frame transmission
        const id = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        if (id === undefined) {
          this.ctx.sendPtyResponse(0, 'ENOENT: Missing image ID for frame', cmd.keys.q);
          return;
        }

        const pendingLoad = this.ctx.loadingImages.get(id);
        if (pendingLoad) {
          await pendingLoad;
        }

        const cached = this.ctx.cache.get(id);
        if (!cached) {
          this.ctx.sendPtyResponse(
            id,
            'ENOENT: Image not found in cache for animation frame',
            cmd.keys.q
          );
          return;
        }

        let resolveLoad!: () => void;
        const loadPromise = new Promise<void>((resolve) => {
          resolveLoad = resolve;
        });
        this.ctx.loadingImages.set(id, loadPromise);

        try {
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

          const decoded = await this.ctx.decoder.decode(keysWithFormat, cmd.payload);
          const delayMs = this.ctx.animationController.getFrameDelayMs(cmd.keys);
          const isHeight =
            (cmd.keys.f === 24 || cmd.keys.f === 32) && cmd.keys.s !== undefined;
          const loopCount = !isHeight && cmd.keys.v !== undefined ? cmd.keys.v : 0;

          let frameBitmap = decoded.bitmap;
          let frameWidth = decoded.width;
          let frameHeight = decoded.height;

          const isSubRect =
            cmd.keys.x !== undefined ||
            cmd.keys.y !== undefined ||
            cmd.keys.c !== undefined ||
            cmd.keys.X !== undefined ||
            (cached &&
              (decoded.width !== cached.width || decoded.height !== cached.height));

          if (cached && isSubRect) {
            const fullWidth = cached.width;
            const fullHeight = cached.height;
            const canvas = new OffscreenCanvas(fullWidth, fullHeight);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const baseFrameNum =
                cmd.keys.c !== undefined
                  ? cmd.keys.c
                  : cmd.keys.r !== undefined && cmd.keys.r > 0
                  ? cmd.keys.r
                  : 0;
              if (
                baseFrameNum >= 1 &&
                cached.frames &&
                cached.frames[baseFrameNum - 1]
              ) {
                ctx.drawImage(
                  cached.frames[baseFrameNum - 1].bitmap,
                  0,
                  0,
                  fullWidth,
                  fullHeight
                );
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
              cached.frames = [
                {
                  bitmap: cached.bitmap,
                  width: cached.width,
                  height: cached.height,
                  byteSize: cached.byteSize,
                  delayMs: 40,
                },
              ];
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

            const targetFrameIndex =
              cmd.keys.r !== undefined && cmd.keys.r > 0
                ? cmd.keys.r - 1
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

            if (cached.frames.length >= 2 && !cached.animation.isPlaying) {
              this.ctx.animationController.startAnimation(id);
            } else {
              this.ctx.scheduleRender();
            }
          } else {
            this.ctx.cache.set(id, {
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
            this.ctx.scheduleRender();
          }

          this.ctx.sendPtyResponse(id, 'OK', cmd.keys.q, false, true);
        } catch (err: any) {
          console.error('[KittyGraphics] Failed to decode frame (f):', err);
          const msg = typeof err === 'string' ? err : err?.message || 'EBADMSG';
          this.ctx.sendPtyResponse(id, msg, cmd.keys.q);
        } finally {
          resolveLoad();
          this.ctx.loadingImages.delete(id);
        }
        break;
      }

      case 'a': {
        // Animation control
        const id = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        if (id === undefined) {
          this.ctx.sendPtyResponse(
            0,
            'ENOENT: Missing image ID for animation control',
            cmd.keys.q
          );
          return;
        }

        const pendingLoad = this.ctx.loadingImages.get(id);
        if (pendingLoad) {
          await pendingLoad;
        }

        const cached = this.ctx.cache.get(id);
        if (!cached) {
          this.ctx.sendPtyResponse(id, 'ENOENT: Image not found in cache', cmd.keys.q);
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

        if (cmd.keys.v !== undefined && cmd.keys.v > 0) {
          cached.animation.loopCount = cmd.keys.v;
          cached.animation.loopsCompleted = 0;
        }

        const jumpFrame = cmd.keys.r ?? cmd.keys.c;
        if (jumpFrame !== undefined && cached.frames && cached.frames.length > 0) {
          const idx = Math.max(0, Math.min(cached.frames.length - 1, jumpFrame - 1));
          cached.animation.currentFrameIndex = idx;
          const target = cached.frames[idx];
          cached.bitmap = target.bitmap;
          cached.width = target.width;
          cached.height = target.height;
          this.ctx.render();
        }

        if (cmd.keys.z !== undefined && cached.frames) {
          const delay = Math.max(10, cmd.keys.z);
          const targetIdx =
            jumpFrame !== undefined &&
            jumpFrame >= 1 &&
            jumpFrame <= cached.frames.length
              ? jumpFrame - 1
              : cmd.keys.r !== undefined &&
                cmd.keys.r >= 1 &&
                cmd.keys.r <= cached.frames.length
              ? cmd.keys.r - 1
              : cached.animation.currentFrameIndex;
          if (cached.frames[targetIdx]) {
            cached.frames[targetIdx].delayMs = delay;
          }
        }

        const s = cmd.keys.s;
        if (s === 1) {
          this.ctx.animationController.stopAnimation(id);
        } else if (s === 2) {
          if (!cached.animation.isPlaying && cached.frames && cached.frames.length >= 2) {
            this.ctx.animationController.startAnimation(id);
          }
        } else if (s === 3 || s === undefined) {
          if (cached.frames && cached.frames.length >= 2) {
            this.ctx.animationController.startAnimation(id);
          }
        }

        this.ctx.sendPtyResponse(id, 'OK', cmd.keys.q, false, true);
        break;
      }

      case 'd': {
        // Delete images / placements
        const target = (cmd.keys.d || 'a').toLowerCase();
        const id = cmd.keys.i !== undefined ? cmd.keys.i : cmd.keys.I;
        const placementId = cmd.keys.p;

        if (target === 'a') {
          for (const k of this.ctx.cache.keys()) {
            this.ctx.animationController.stopAnimation(k);
          }
          for (const p of this.ctx.placements.values()) {
            try {
              p.marker?.dispose();
            } catch {}
          }
          this.ctx.placements.clear();
          this.ctx.virtualPlacements.clear();
          this.ctx.cache.clear();
        } else if (target === 'i' || (target !== 'p' && id !== undefined)) {
          if (id !== undefined) {
            this.ctx.animationController.stopAnimation(id);
            this.ctx.cache.delete(id);
            this.ctx.virtualPlacements.delete(id);
            for (const [key, p] of this.ctx.placements.entries()) {
              if (p.imageId === id) {
                try {
                  p.marker?.dispose();
                } catch {}
                this.ctx.placements.delete(key);
              }
            }
          }
        } else if (target === 'p' || placementId !== undefined) {
          if (placementId !== undefined) {
            const pId = String(placementId);
            const p = this.ctx.placements.get(pId);
            try {
              p?.marker?.dispose();
            } catch {}
            this.ctx.placements.delete(pId);
          }
        }
        this.ctx.render();
        this.ctx.term.refresh(0, this.ctx.term.rows - 1);
        this.ctx.sendPtyResponse(id ?? 0, 'OK', cmd.keys.q, false, true);
        break;
      }
    }
  }

  public placeImage(
    imageId: number,
    keys: KittyControlKeys,
    pixelWidth: number,
    pixelHeight: number,
    anchorCol?: number,
    anchorBufferLine?: number,
    spanCols?: number,
    spanRows?: number
  ): void {
    const { baseY, cursorY, cursorX } = this.ctx.term.buffer.active;

    const { cols, rows } =
      spanCols && spanRows
        ? { cols: spanCols, rows: spanRows }
        : this.ctx.computeSpans(keys, pixelWidth, pixelHeight);

    let placementId: string;
    if (keys.p !== undefined) {
      placementId = String(keys.p);
    } else {
      let existingKey: string | undefined;
      for (const [k, p] of this.ctx.placements.entries()) {
        if (p.imageId === imageId) {
          existingKey = k;
          break;
        }
      }
      placementId = existingKey || `img-${imageId}-${Date.now()}`;
    }
    const existingPlacement = this.ctx.placements.get(placementId);

    const bufferLine =
      anchorBufferLine !== undefined
        ? anchorBufferLine
        : existingPlacement
        ? existingPlacement.bufferLine
        : baseY + cursorY;
    const col =
      anchorCol !== undefined
        ? anchorCol
        : existingPlacement
        ? existingPlacement.col
        : cursorX;

    if (existingPlacement?.marker) {
      try {
        existingPlacement.marker.dispose();
      } catch {}
    }

    let marker: any = undefined;
    try {
      this.ctx.flushTerminalBuffer();
      const currentAbsoluteLine =
        this.ctx.term.buffer.active.baseY + this.ctx.term.buffer.active.cursorY;
      const offset = bufferLine - currentAbsoluteLine;
      marker = this.ctx.term.registerMarker(offset);
    } catch {}

    const termCols = this.ctx.term.cols || 80;
    const isCentered = Math.abs(col - Math.round((termCols - cols) / 2)) <= 2;

    const placement: KittyPlacement = {
      id: placementId,
      imageId,
      bufferLine,
      marker,
      col,
      cols,
      rows,
      originalTermCols: termCols,
      isCentered,
      xOffset: keys.X || 0,
      yOffset: keys.Y || 0,
      z: keys.z || 0,
      srcX: keys.x,
      srcY: keys.y,
      srcWidth: keys.w,
      srcHeight: keys.h,
    };

    this.ctx.placements.set(placementId, placement);
    this.ctx.markCanvasDirty();

    const cachedRec = this.ctx.cache.get(imageId);
    TauriApi.logKittyDebug(
      `[placeImage] img=${imageId} placement=${placementId} bufferLine=${bufferLine} col=${col} spans=${cols}x${rows} animFrames=${cachedRec?.frames?.length}`
    );

    if (
      cachedRec?.frames &&
      cachedRec.frames.length >= 2 &&
      !cachedRec.animation?.isPlaying
    ) {
      this.ctx.animationController.startAnimation(imageId);
    } else {
      this.ctx.scheduleRender();
    }
  }
}
