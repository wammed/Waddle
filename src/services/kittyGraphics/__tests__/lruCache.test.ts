import { describe, it, expect, vi } from 'vitest';
import { KittyLruCache } from '../lruCache';
import { KittyImageRecord } from '../types';

function createMockRecord(id: number, byteSize: number): KittyImageRecord {
  return {
    id,
    bitmap: { close: vi.fn(), width: 10, height: 10 } as any,
    width: 10,
    height: 10,
    byteSize,
    lastUsed: Date.now(),
  };
}

describe('KittyLruCache', () => {
  it('stores and retrieves records', () => {
    const cache = new KittyLruCache(64);
    const rec = createMockRecord(1, 1024);
    cache.set(1, rec);

    expect(cache.has(1)).toBe(true);
    expect(cache.get(1)).toBe(rec);
    expect(cache.size).toBe(1);
  });

  it('updates lastUsed on cache hit', () => {
    const cache = new KittyLruCache(64);
    const rec = createMockRecord(1, 1024);
    rec.lastUsed = 1000;
    cache.set(1, rec);

    const retrieved = cache.get(1);
    expect(retrieved?.lastUsed).toBeGreaterThan(1000);
  });

  it('evicts oldest unused entries when memory limit is exceeded', () => {
    // 64MB min limit
    const cache = new KittyLruCache(64);
    // 30MB records
    const size30MB = 30 * 1024 * 1024;
    const rec1 = createMockRecord(1, size30MB);
    rec1.lastUsed = 100;
    const rec2 = createMockRecord(2, size30MB);
    rec2.lastUsed = 200;

    cache.set(1, rec1);
    cache.set(2, rec2);
    expect(cache.size).toBe(2);

    // Adding 3rd 30MB record should exceed 64MB and evict rec1
    const rec3 = createMockRecord(3, size30MB);
    rec3.lastUsed = 300;
    cache.set(3, rec3);

    expect(cache.has(1)).toBe(false);
    expect(cache.has(2)).toBe(true);
    expect(cache.has(3)).toBe(true);
    expect(rec1.bitmap.close).toHaveBeenCalled();
  });

  it('cleans up and closes all bitmaps on clear()', () => {
    const cache = new KittyLruCache(64);
    const rec1 = createMockRecord(1, 1024);
    const rec2 = createMockRecord(2, 1024);

    cache.set(1, rec1);
    cache.set(2, rec2);
    cache.clear();

    expect(cache.size).toBe(0);
    expect(rec1.bitmap.close).toHaveBeenCalled();
    expect(rec2.bitmap.close).toHaveBeenCalled();
  });
});
