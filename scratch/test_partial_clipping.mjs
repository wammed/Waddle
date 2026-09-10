import assert from 'node:assert';

function calculatePartialClip({
  col,
  cols,
  bufferLine,
  rows,
  xOffset = 0,
  yOffset = 0,
  viewportY,
  termCols = 80,
  termRows = 24,
  cellWidth = 10,
  cellHeight = 20,
  width = 800,
  height = 480,
  bmpW = 800,
  bmpH = 400
}) {
  const screenRow = bufferLine - viewportY;

  const imgColStart = col;
  const imgColEnd = col + cols;
  const imgRowStart = screenRow;
  const imgRowEnd = screenRow + rows;

  // AABB intersection
  if (
    imgRowEnd <= 0 ||
    imgRowStart >= termRows ||
    imgColEnd <= 0 ||
    imgColStart >= termCols
  ) {
    return null; // Culled completely
  }

  const rawX = col * cellWidth + xOffset;
  const rawY = screenRow * cellHeight + yOffset;
  const rawW = cols * cellWidth;
  const rawH = rows * cellHeight;

  if (rawW <= 0 || rawH <= 0) return null;

  const destX = Math.max(0, Math.min(width, rawX));
  const destY = Math.max(0, Math.min(height, rawY));
  const destRight = Math.max(0, Math.min(width, rawX + rawW));
  const destBottom = Math.max(0, Math.min(height, rawY + rawH));

  const destW = destRight - destX;
  const destH = destBottom - destY;

  if (destW <= 0 || destH <= 0) return null;

  const u1 = (destX - rawX) / rawW;
  const u2 = (destRight - rawX) / rawW;
  const v1 = (destY - rawY) / rawH;
  const v2 = (destBottom - rawY) / rawH;

  const srcX = Math.max(0, Math.min(bmpW, u1 * bmpW));
  const srcY = Math.max(0, Math.min(bmpH, v1 * bmpH));
  const srcRight = Math.max(0, Math.min(bmpW, u2 * bmpW));
  const srcBottom = Math.max(0, Math.min(bmpH, v2 * bmpH));

  const srcW = srcRight - srcX;
  const srcH = srcBottom - srcY;

  if (srcW <= 0 || srcH <= 0) return null;

  return {
    screenRow,
    destX,
    destY,
    destW,
    destH,
    u1,
    u2,
    v1,
    v2,
    srcX,
    srcY,
    srcW,
    srcH
  };
}

console.log('--- Test 1: Full visible image ---');
const t1 = calculatePartialClip({
  col: 0,
  cols: 8,
  bufferLine: 5,
  rows: 4,
  viewportY: 0
});
assert(t1 !== null);
assert.strictEqual(t1.destY, 5 * 20);
assert.strictEqual(t1.destH, 4 * 20);
assert.strictEqual(t1.v1, 0);
assert.strictEqual(t1.v2, 1);
assert.strictEqual(t1.srcY, 0);
assert.strictEqual(t1.srcH, 400);
console.log('PASS: Test 1 (Full visible)');

console.log('--- Test 2: Top clipping (k=2 rows scrolled off top) ---');
const t2 = calculatePartialClip({
  col: 0,
  cols: 8,
  bufferLine: 8,
  rows: 4,
  viewportY: 10 // screenRow = -2
});
assert(t2 !== null);
assert.strictEqual(t2.screenRow, -2);
assert.strictEqual(t2.destY, 0, 'destY should be fixed at top of viewport (0)');
assert.strictEqual(t2.destH, 2 * 20, 'destH should be 2 rows (40px)');
assert.strictEqual(t2.v1, 0.5, 'v1 (UV vertical offset) should be k / r = 2 / 4 = 0.5');
assert.strictEqual(t2.v2, 1.0, 'v2 should be 1.0');
assert.strictEqual(t2.srcY, 200, 'srcY should start at 0.5 * 400 = 200');
assert.strictEqual(t2.srcH, 200, 'srcH should be 200');
console.log('PASS: Test 2 (Top clipping k=2)');

console.log('--- Test 3: Top clipping (k=3 rows scrolled off top, 1 row visible) ---');
const t3 = calculatePartialClip({
  col: 0,
  cols: 8,
  bufferLine: 7,
  rows: 4,
  viewportY: 10 // screenRow = -3
});
assert(t3 !== null);
assert.strictEqual(t3.screenRow, -3);
assert.strictEqual(t3.destY, 0);
assert.strictEqual(t3.destH, 1 * 20);
assert.strictEqual(t3.v1, 0.75, 'v1 should be 3 / 4 = 0.75');
assert.strictEqual(t3.srcY, 300);
assert.strictEqual(t3.srcH, 100);
console.log('PASS: Test 3 (Top clipping 1 row visible)');

console.log('--- Test 4: Completely scrolled off top (k=4 rows, 0 rows visible) ---');
const t4 = calculatePartialClip({
  col: 0,
  cols: 8,
  bufferLine: 6,
  rows: 4,
  viewportY: 10 // screenRow = -4
});
assert.strictEqual(t4, null, 'Should be culled by AABB intersection when completely outside');
console.log('PASS: Test 4 (AABB culling above top)');

console.log('--- Test 5: Bottom clipping (at row 22, 2 rows visible of 4) ---');
const t5 = calculatePartialClip({
  col: 0,
  cols: 8,
  bufferLine: 22,
  rows: 4,
  viewportY: 0, // screenRow = 22, termRows = 24
  termRows: 24,
  height: 480
});
assert(t5 !== null);
assert.strictEqual(t5.screenRow, 22);
assert.strictEqual(t5.destY, 22 * 20);
assert.strictEqual(t5.destH, 2 * 20, 'Only 2 rows visible inside 480px viewport');
assert.strictEqual(t5.v1, 0.0);
assert.strictEqual(t5.v2, 0.5, 'v2 should be 2 / 4 = 0.5');
assert.strictEqual(t5.srcY, 0);
assert.strictEqual(t5.srcH, 200);
console.log('PASS: Test 5 (Bottom clipping 2 rows visible)');

console.log('--- Test 6: Completely below viewport ---');
const t6 = calculatePartialClip({
  col: 0,
  cols: 8,
  bufferLine: 24,
  rows: 4,
  viewportY: 0, // screenRow = 24
  termRows: 24
});
assert.strictEqual(t6, null, 'Should be culled by AABB when starting at or beyond termRows');
console.log('PASS: Test 6 (AABB culling below bottom)');

console.log('--- Test 7: Sub-pixel smooth scroll / offset (yOffset = -10) ---');
const t7 = calculatePartialClip({
  col: 0,
  cols: 8,
  bufferLine: 0,
  rows: 4,
  viewportY: 0,
  yOffset: -10 // half a line off top
});
assert(t7 !== null);
assert.strictEqual(t7.destY, 0);
assert.strictEqual(t7.destH, 70);
assert.strictEqual(t7.v1, 10 / 80);
assert.strictEqual(t7.srcY, (10 / 80) * 400);
console.log('PASS: Test 7 (Sub-pixel smooth scroll / offset)');

console.log('>>> ALL 7 PARTIAL CLIPPING TESTS PASSED! <<<');
