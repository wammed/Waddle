import { KittyControlKeys } from './types';
import { KittyLruCache } from './lruCache';

export class KittyAnimationController {
  private cache: KittyLruCache;
  private onRender: () => void;
  private isDisposed: boolean = false;

  constructor(cache: KittyLruCache, onRender: () => void) {
    this.cache = cache;
    this.onRender = onRender;
  }

  public getFrameDelayMs(keys: KittyControlKeys): number {
    return keys.z !== undefined && keys.z > 0 ? keys.z : 40;
  }

  public startAnimation(imageId: number): void {
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

  public stopAnimation(imageId: number): void {
    const cached = this.cache.get(imageId);
    if (cached?.animation) {
      if (cached.animation.timer) {
        clearTimeout(cached.animation.timer);
        cached.animation.timer = undefined;
      }
      cached.animation.isPlaying = false;
    }
  }

  public scheduleNextFrame(imageId: number): void {
    if (this.isDisposed) return;
    const cached = this.cache.get(imageId);
    if (
      !cached ||
      !cached.frames ||
      cached.frames.length < 2 ||
      !cached.animation ||
      !cached.animation.isPlaying
    ) {
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

  public advanceFrame(imageId: number): void {
    if (this.isDisposed) return;
    const cached = this.cache.get(imageId);
    if (
      !cached ||
      !cached.frames ||
      cached.frames.length < 2 ||
      !cached.animation ||
      !cached.animation.isPlaying
    ) {
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
      if (anim.loopCount > 1 && anim.loopsCompleted >= anim.loopCount - 1) {
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
    this.onRender();

    // Reschedule timer for subsequent frame (guaranteed to continue loop)
    this.scheduleNextFrame(imageId);
  }

  public dispose(): void {
    this.isDisposed = true;
    for (const record of this.cache.values()) {
      if (record.animation?.timer) {
        clearTimeout(record.animation.timer);
        record.animation.timer = undefined;
        record.animation.isPlaying = false;
      }
    }
  }
}
