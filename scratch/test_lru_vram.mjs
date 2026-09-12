import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-delegate to `npx tsx` if executed directly via `node` without TypeScript loader
const hasTsxLoader = process.execArgv.some((a) => a.includes('tsx/dist'));
if (!hasTsxLoader) {
  const result = spawnSync(
    'npx',
    ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit' }
  );
  process.exit(result.status ?? 0);
}

const { KittyLruCache } = await import('../src/services/kittyGraphics/lruCache.ts');

console.log('=== TC-PERF-01: GPU VRAM / 256MB LRU & bitmap.close() Verification ===\n');

// 1. Initialize LRU Cache with default 256MB limit
const LIMIT_MB = 256;
const MAX_BYTES = LIMIT_MB * 1024 * 1024;
const cache = new KittyLruCache(LIMIT_MB);

assert.strictEqual(cache.getMaxBytes(), MAX_BYTES, `Cache limit should be ${MAX_BYTES} bytes (256MB)`);
console.log(`1. Initialized KittyLruCache with ${LIMIT_MB}MB limit (${MAX_BYTES} bytes).`);

// 2. Stream >500MB of distinct images consecutively (50 images x 10.5MB each = 525MB)
const TOTAL_STREAM_MB = 525;
const IMAGE_COUNT = 50;
const BYTES_PER_IMAGE = Math.floor((TOTAL_STREAM_MB * 1024 * 1024) / IMAGE_COUNT); // ~10.5MB each

console.log(`2. Streaming ${IMAGE_COUNT} distinct images (${BYTES_PER_IMAGE} bytes each, total ${TOTAL_STREAM_MB}MB)...`);

const closedBitmapIds = new Set();
const allImageIds = [];

for (let i = 1; i <= IMAGE_COUNT; i++) {
  const imageId = i;
  allImageIds.push(imageId);

  // Mock ImageBitmap with spy on close()
  let isClosed = false;
  const mockBitmap = {
    width: 1920,
    height: 1080,
    close: () => {
      isClosed = true;
      closedBitmapIds.add(imageId);
    },
  };

  const record = {
    id: imageId,
    bitmap: mockBitmap,
    width: 1920,
    height: 1080,
    byteSize: BYTES_PER_IMAGE,
    lastUsed: Date.now() + i, // ascending timestamp for strict LRU order
    frames: [
      {
        bitmap: mockBitmap,
        width: 1920,
        height: 1080,
        byteSize: BYTES_PER_IMAGE,
        delayMs: 100,
      },
    ],
  };

  cache.set(imageId, record);

  // Invariant check: Cache memory MUST NEVER exceed 256MB
  assert.ok(
    cache.getCurrentBytes() <= MAX_BYTES,
    `Cache size (${cache.getCurrentBytes()} bytes) exceeded max limit (${MAX_BYTES} bytes) at image ${i}`
  );
}

console.log(`  ✓ Current cache size: ${(cache.getCurrentBytes() / (1024 * 1024)).toFixed(2)}MB / ${LIMIT_MB}MB`);
console.log(`  ✓ Active images in cache: ${cache.size} / ${IMAGE_COUNT}`);
console.log(`  ✓ Evicted and closed images: ${closedBitmapIds.size}`);

// 3. Verify that earlier images were evicted and closed
const maxExpectedRetained = Math.floor(MAX_BYTES / BYTES_PER_IMAGE);
assert.ok(
  cache.size <= maxExpectedRetained,
  `Retained images (${cache.size}) should be <= ${maxExpectedRetained}`
);

// The oldest images (1..IMAGE_COUNT - cache.size) must have been evicted and closed
const expectedEvictedCount = IMAGE_COUNT - cache.size;
assert.strictEqual(
  closedBitmapIds.size,
  expectedEvictedCount,
  `Exactly ${expectedEvictedCount} images should have been closed`
);

for (let i = 1; i <= expectedEvictedCount; i++) {
  assert.ok(closedBitmapIds.has(i), `Image ${i} must have had bitmap.close() called`);
  assert.ok(!cache.has(i), `Image ${i} must be removed from cache`);
}

// The newest images must still be present in cache and NOT closed
for (let i = expectedEvictedCount + 1; i <= IMAGE_COUNT; i++) {
  assert.ok(cache.has(i), `Image ${i} should be retained in cache`);
  assert.ok(!closedBitmapIds.has(i), `Image ${i} bitmap should NOT be closed while active in cache`);
}

console.log('3. Strict LRU eviction and ImageBitmap.close() calls verified.');

// 4. Test dynamic limit reduction (e.g. from 256MB down to 128MB)
console.log('\n4. Testing dynamic cache limit downscaling to 128MB...');
const preReductionClosedCount = closedBitmapIds.size;
cache.setLimitMb(128);
const newMaxBytes = 128 * 1024 * 1024;

assert.ok(
  cache.getCurrentBytes() <= newMaxBytes,
  `Cache must evict down to new 128MB limit (${cache.getCurrentBytes()} <= ${newMaxBytes})`
);
assert.ok(
  closedBitmapIds.size > preReductionClosedCount,
  'Additional images must have been closed to satisfy the 128MB limit'
);

console.log(`  ✓ Reduced cache size: ${(cache.getCurrentBytes() / (1024 * 1024)).toFixed(2)}MB / 128MB`);
console.log(`  ✓ Total closed bitmaps after downscaling: ${closedBitmapIds.size}`);

// 5. Test cache.clear() releases all remaining bitmaps
console.log('\n5. Testing cache.clear() to free all remaining VRAM...');
cache.clear();
assert.strictEqual(cache.size, 0, 'Cache should be empty after clear()');
assert.strictEqual(cache.getCurrentBytes(), 0, 'Current bytes should be 0 after clear()');
assert.strictEqual(closedBitmapIds.size, IMAGE_COUNT, 'All 50 bitmaps must now be closed');
console.log('  ✓ All 50 images closed, zero VRAM leak.');

console.log('\n=== TC-PERF-01 Result: PASS ===\n');
