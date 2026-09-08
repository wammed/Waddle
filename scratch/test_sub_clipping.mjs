import assert from 'assert';
import { KittyApcParser } from '../src/services/kittyGraphics/parser.js';

console.log('Testing Kitty Sub-Rectangle Clipping & APC Parser...');

// 1. Test parsing x, y, w, h, U
const parser = new KittyApcParser();
const input = '\x1b_Ga=T,f=100,i=42,x=20,y=30,w=100,h=80,U=1;aGVsbG8=\x1b\\';
const { cleanText, commands } = parser.parse(input);

assert.strictEqual(commands.length, 1, 'Should parse 1 command');
const cmd = commands[0];
assert.strictEqual(cmd.keys.a, 'T', 'Action should be T');
assert.strictEqual(cmd.keys.i, 42, 'Image ID should be 42');
assert.strictEqual(cmd.keys.x, 20, 'x should be 20');
assert.strictEqual(cmd.keys.y, 30, 'y should be 30');
assert.strictEqual(cmd.keys.w, 100, 'w should be 100');
assert.strictEqual(cmd.keys.h, 80, 'h should be 80');
assert.strictEqual(cmd.keys.U, 1, 'U should be 1');

// 2. Test UV calculation formula
function computeUVComposition(bmpW, bmpH, p, rawX, rawY, rawW, rawH, destX, destY, destRight, destBottom) {
  const relU1 = (destX - rawX) / rawW;
  const relU2 = (destRight - rawX) / rawW;
  const relV1 = (destY - rawY) / rawH;
  const relV2 = (destBottom - rawY) / rawH;

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

  return {
    srcX,
    srcY,
    srcW: srcRight - srcX,
    srcH: srcBottom - srcY,
  };
}

// Full image without scissoring
const fullResult = computeUVComposition(
  200, 100,
  {},
  0, 0, 200, 100,
  0, 0, 200, 100
);
assert.strictEqual(fullResult.srcX, 0);
assert.strictEqual(fullResult.srcY, 0);
assert.strictEqual(fullResult.srcW, 200);
assert.strictEqual(fullResult.srcH, 100);

// Sub-rectangle (x=50, y=20, w=100, h=60) without scissoring
const subResult = computeUVComposition(
  200, 100,
  { srcX: 50, srcY: 20, srcWidth: 100, srcHeight: 60 },
  0, 0, 100, 60,
  0, 0, 100, 60
);
assert.strictEqual(subResult.srcX, 50);
assert.strictEqual(subResult.srcY, 20);
assert.strictEqual(subResult.srcW, 100);
assert.strictEqual(subResult.srcH, 60);

// Sub-rectangle with top 50% scrolled off viewport (rawY = -30, destY = 0, destH = 30)
const clippedResult = computeUVComposition(
  200, 100,
  { srcX: 50, srcY: 20, srcWidth: 100, srcHeight: 60 },
  0, -30, 100, 60,
  0, 0, 100, 30
);
assert.strictEqual(clippedResult.srcX, 50);
assert.strictEqual(clippedResult.srcY, 50, 'Scissored Y should start halfway through sub-rectangle (20 + 30 = 50)');
assert.strictEqual(clippedResult.srcW, 100);
assert.strictEqual(clippedResult.srcH, 30, 'Scissored height should be 30');

console.log('✓ All Sub-Rectangle Clipping tests passed!');
