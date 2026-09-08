import { KittyImageRecord } from './types';

export class KittyLruCache {
  private records: Map<number, KittyImageRecord> = new Map();
  private maxBytes: number;
  private currentBytes: number = 0;

  constructor(limitMb: number = 256) {
    this.maxBytes = limitMb * 1024 * 1024;
  }

  public setLimitMb(mb: number) {
    this.maxBytes = Math.max(64, Math.min(1024, mb)) * 1024 * 1024;
    this.evictUntilFits(0);
  }

  public get(id: number): KittyImageRecord | undefined {
    const record = this.records.get(id);
    if (record) {
      record.lastUsed = Date.now();
    }
    return record;
  }

  public set(id: number, record: KittyImageRecord): void {
    // If updating existing record with same ID, remove old one first
    if (this.records.has(id)) {
      this.delete(id);
    }

    // Evict oldest entries until new image fits within maxBytes
    this.evictUntilFits(record.byteSize);

    this.records.set(id, record);
    this.currentBytes += record.byteSize;
  }

  public delete(id: number): boolean {
    const record = this.records.get(id);
    if (!record) return false;

    // Explicitly close ImageBitmap to release WebKitGTK and GPU VRAM
    try {
      record.bitmap.close();
    } catch {
      // ignore
    }

    this.currentBytes = Math.max(0, this.currentBytes - record.byteSize);
    this.records.delete(id);
    return true;
  }

  public clear(): void {
    for (const record of this.records.values()) {
      try {
        record.bitmap.close();
      } catch {
        // ignore
      }
    }
    this.records.clear();
    this.currentBytes = 0;
  }

  public getCurrentBytes(): number {
    return this.currentBytes;
  }

  public getMaxBytes(): number {
    return this.maxBytes;
  }

  private evictUntilFits(incomingBytes: number): void {
    while (this.currentBytes + incomingBytes > this.maxBytes && this.records.size > 0) {
      // Find oldest record by lastUsed timestamp
      let oldestId: number | null = null;
      let oldestTime = Infinity;

      for (const [id, rec] of this.records.entries()) {
        if (rec.lastUsed < oldestTime) {
          oldestTime = rec.lastUsed;
          oldestId = id;
        }
      }

      if (oldestId !== null) {
        this.delete(oldestId);
      } else {
        break;
      }
    }
  }
}
