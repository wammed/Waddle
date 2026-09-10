import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-delegate to `npx tsx` if executed directly via `node` without TypeScript/TSX loader
const hasTsxLoader = process.execArgv.some((a) => a.includes('tsx/dist'));
if (!hasTsxLoader) {
  const result = spawnSync(
    'npx',
    ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit' }
  );
  process.exit(result.status ?? 0);
}

import assert from 'assert';
const {
  isPlaceholderCell,
  decodePlaceholderCell,
  computePlaceholderUV,
  ROW_COLUMN_DIACRITICS,
  PLACEHOLDER_CODEPOINT,
} = await import('../src/services/kittyGraphics/unicodePlaceholder.ts');
const { KittyGraphicsManager } = await import('../src/services/kittyGraphics/manager.ts');
import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;

// Provide global document and window mock if needed in node
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({
      style: {},
      getContext: () => null,
      parentElement: null,
    }),
  };
  globalThis.window = {
    devicePixelRatio: 1,
  };
}

console.log('Testing Kitty Unicode Placeholder (U+10EEEE)...');

// Helper to mock an xterm cell
function createMockCell(options) {
  const { chars, fgColor, isRGB = false, isPalette = false } = options;
  return {
    getChars: () => chars,
    getCode: () => chars.codePointAt(0),
    getFgColor: () => fgColor ?? 0,
    isFgRGB: () => isRGB,
    isFgPalette: () => isPalette,
    isFgDefault: () => !isRGB && !isPalette,
    getWidth: () => 1,
  };
}

// 1. Test isPlaceholderCell
assert.strictEqual(isPlaceholderCell(createMockCell({ chars: '\u{10EEEE}' })), true);
assert.strictEqual(isPlaceholderCell(createMockCell({ chars: '\u{10EEEE}\u0305\u030D' })), true);
assert.strictEqual(isPlaceholderCell(createMockCell({ chars: 'A' })), false);
assert.strictEqual(isPlaceholderCell(null), false);

// 2. Test decodePlaceholderCell - standard 2x2 placeholder with 256-color fg image ID 42
// U+0305 = 0, U+030D = 1
// (0, 0): \U10EEEE\U0305\U0305
const cell00 = createMockCell({ chars: '\u{10EEEE}\u0305\u0305', fgColor: 42, isPalette: true });
const dec00 = decodePlaceholderCell(cell00);
assert.strictEqual(dec00.imageId, 42);
assert.strictEqual(dec00.row, 0);
assert.strictEqual(dec00.col, 0);

// (0, 1): \U10EEEE\U0305\U030D
const cell01 = createMockCell({ chars: '\u{10EEEE}\u0305\u030D', fgColor: 42, isPalette: true });
const dec01 = decodePlaceholderCell(cell01);
assert.strictEqual(dec01.imageId, 42);
assert.strictEqual(dec01.row, 0);
assert.strictEqual(dec01.col, 1);

// (1, 0): \U10EEEE\U030D\U0305
const cell10 = createMockCell({ chars: '\u{10EEEE}\u030D\u0305', fgColor: 42, isPalette: true });
const dec10 = decodePlaceholderCell(cell10);
assert.strictEqual(dec10.imageId, 42);
assert.strictEqual(dec10.row, 1);
assert.strictEqual(dec10.col, 0);

// (1, 1): \U10EEEE\U030D\U030D
const cell11 = createMockCell({ chars: '\u{10EEEE}\u030D\u030D', fgColor: 42, isPalette: true });
const dec11 = decodePlaceholderCell(cell11);
assert.strictEqual(dec11.imageId, 42);
assert.strictEqual(dec11.row, 1);
assert.strictEqual(dec11.col, 1);

// 3. Test 24-bit TrueColor image ID and high byte diacritic (3rd diacritic U+030E = index 2)
// image ID = 0x010203 + (2 << 24) = 0x02010203 = 33620483
const cellHigh = createMockCell({
  chars: '\u{10EEEE}\u0305\u030D\u030E',
  fgColor: 0x010203,
  isRGB: true,
});
const decHigh = decodePlaceholderCell(cellHigh);
assert.strictEqual(decHigh.imageId, 0x02010203);
assert.strictEqual(decHigh.row, 0);
assert.strictEqual(decHigh.col, 1);
assert.strictEqual(decHigh.highByte, 2);

// 4. Test Diacritic Inheritance when diacritics are omitted
// Row 0, Col 0 specified:
const cellRow0 = createMockCell({ chars: '\u{10EEEE}\u0305', fgColor: 42, isPalette: true });
const decRow0 = decodePlaceholderCell(cellRow0);
assert.strictEqual(decRow0.row, 0);
assert.strictEqual(decRow0.col, 0);

// Next cell has NO diacritics: should inherit row=0, col=1
const cellInherit1 = createMockCell({ chars: '\u{10EEEE}', fgColor: 42, isPalette: true });
const decInherit1 = decodePlaceholderCell(cellInherit1, decRow0);
assert.strictEqual(decInherit1.row, 0);
assert.strictEqual(decInherit1.col, 1);

// Next cell has NO diacritics: should inherit row=0, col=2
const cellInherit2 = createMockCell({ chars: '\u{10EEEE}', fgColor: 42, isPalette: true });
const decInherit2 = decodePlaceholderCell(cellInherit2, decInherit1);
assert.strictEqual(decInherit2.row, 0);
assert.strictEqual(decInherit2.col, 2);

// 5. Test Fallback to lastTransmittedImageId when imageId is 0 or default
const cellDefault = createMockCell({ chars: '\u{10EEEE}\u0305\u0305', fgColor: 0 });
const decFallback = decodePlaceholderCell(cellDefault, null, 99);
assert.strictEqual(decFallback.imageId, 99, 'Should fallback to lastTransmittedImageId 99');

// 6. Test computePlaceholderUV
// 2x2 grid on a 200x100 bitmap:
const uv00 = computePlaceholderUV(0, 0, 2, 2, 200, 100);
assert.strictEqual(uv00.sx, 0);
assert.strictEqual(uv00.sy, 0);
assert.strictEqual(uv00.sw, 100);
assert.strictEqual(uv00.sh, 50);
assert.strictEqual(uv00.u1, 0.0);
assert.strictEqual(uv00.u2, 0.5);
assert.strictEqual(uv00.v1, 0.0);
assert.strictEqual(uv00.v2, 0.5);

const uv01 = computePlaceholderUV(0, 1, 2, 2, 200, 100);
assert.strictEqual(uv01.sx, 100);
assert.strictEqual(uv01.sy, 0);
assert.strictEqual(uv01.sw, 100);
assert.strictEqual(uv01.sh, 50);

const uv10 = computePlaceholderUV(1, 0, 2, 2, 200, 100);
assert.strictEqual(uv10.sx, 0);
assert.strictEqual(uv10.sy, 50);
assert.strictEqual(uv10.sw, 100);
assert.strictEqual(uv10.sh, 50);

const uv11 = computePlaceholderUV(1, 1, 2, 2, 200, 100);
assert.strictEqual(uv11.sx, 100);
assert.strictEqual(uv11.sy, 50);
assert.strictEqual(uv11.sw, 100);
assert.strictEqual(uv11.sh, 50);

// Single-cell placeholder: should span entire (0.0, 0.0) .. (1.0, 1.0) UV
const uvSingle = computePlaceholderUV(0, 0, 1, 1, 800, 600, 0, 0, undefined, undefined, true);
assert.deepStrictEqual(uvSingle, {
  u1: 0.0,
  v1: 0.0,
  u2: 1.0,
  v2: 1.0,
  sx: 0,
  sy: 0,
  sw: 800,
  sh: 600,
});

// 2x2 grid on sub-rectangle (srcX: 50, srcY: 20, srcWidth: 100, srcHeight: 60) of 200x100 bitmap:
const uvSub00 = computePlaceholderUV(0, 0, 2, 2, 200, 100, 50, 20, 100, 60);
assert.strictEqual(uvSub00.sx, 50);
assert.strictEqual(uvSub00.sy, 20);
assert.strictEqual(uvSub00.sw, 50);
assert.strictEqual(uvSub00.sh, 30);

const uvSub11 = computePlaceholderUV(1, 1, 2, 2, 200, 100, 50, 20, 100, 60);
assert.strictEqual(uvSub11.sx, 100);
assert.strictEqual(uvSub11.sy, 50);
assert.strictEqual(uvSub11.sw, 50);
assert.strictEqual(uvSub11.sh, 30);

// 7. Test resolveImageFromCache for ID: 77 in all SGR color representations
import { resolveImageFromCache } from '../src/services/kittyGraphics/unicodePlaceholder.ts';
const mockCache = new Map();
const image77 = { id: 77, bitmap: { width: 100, height: 100 } };
mockCache.set(77, image77);

// Direct ID lookup
assert.strictEqual(resolveImageFromCache(mockCache, 77), image77);

// SGR \e[38;2;77;0;0m -> xterm fg = 0x4d0000 (red byte 77)
const cellRed77 = createMockCell({ chars: '\u{10EEEE}', fgColor: 0x4d0000, isRGB: true });
assert.strictEqual(resolveImageFromCache(mockCache, 0x4d0000, cellRed77), image77);

// SGR \e[38;2;0;0;77m -> xterm fg = 77 (blue byte 77)
const cellBlue77 = createMockCell({ chars: '\u{10EEEE}', fgColor: 77, isRGB: true });
assert.strictEqual(resolveImageFromCache(mockCache, 77, cellBlue77), image77);

// SGR \e[38;5;77m -> palette index 77
const cellPal77 = createMockCell({ chars: '\u{10EEEE}', fgColor: 77, isPalette: true });
assert.strictEqual(resolveImageFromCache(mockCache, 77, cellPal77), image77);

// Fallback to lastTransmittedImageId: 77
const cellBlank = createMockCell({ chars: '\u{10EEEE}', fgColor: 0 });
assert.strictEqual(resolveImageFromCache(mockCache, 0, cellBlank, 77), image77);

// 8. Test KittyGraphicsManager generatePlaceholderSequence with U=1
const term = new Terminal({ cols: 80, rows: 24 });
const fakeContainer = {
  querySelector: () => null,
  appendChild: () => {},
  clientWidth: 800,
  clientHeight: 600,
};
const manager = new KittyGraphicsManager(term, fakeContainer, 'test-session');

// Virtual placement command with U=1
const filterResult = manager.filterPtyOutput('\x1b_Ga=T,f=100,i=1,c=10,r=5,U=1;aGVsbG8=\x1b\\');
assert.strictEqual(filterResult, '', 'filterPtyOutput should not emit spaces when U=1');

// Regular placement command without U=1
const filterResultRegular = manager.filterPtyOutput('\x1b_Ga=T,f=100,i=2,c=5,r=2;aGVsbG8=\x1b\\');
assert.strictEqual(filterResultRegular.length > 0, true, 'Regular placement should emit space sequences');
assert.strictEqual(filterResultRegular.includes('     '), true, 'Should include 5 spaces for cols=5');

manager.dispose();

// 9. Test workCell reuse safety (no pollution across cells)
const reusableWorkCell = {
  chars: '',
  getChars() { return this.chars; },
  getCode() { return this.chars.codePointAt(0) || 0; },
  isFgRGB: () => false,
  isFgPalette: () => false,
  getWidth: () => 1,
};
reusableWorkCell.chars = '\u{10EEEE}';
assert.strictEqual(isPlaceholderCell(reusableWorkCell), true, 'Cell 0 should be detected as placeholder');
reusableWorkCell.chars = 'A';
assert.strictEqual(isPlaceholderCell(reusableWorkCell), false, 'Cell 1 (letter A) must NOT be detected as placeholder');

// 10. Test CanvasRenderer Hook Font/Glyph render pass skip
let drawnCharsCalls = [];
let drawnPlaceholderCalls = [];

const mockCtx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  rect: () => {},
  clip: () => {},
  drawImage: () => {},
};

const fakeTextProto = {
  _drawForeground: function (startRow, endRow) {
    this._forEachCell(startRow, endRow, (cell, x, y) => {
      this._drawChars(cell, x, y);
    });
  },
  _drawChars: function (cell, x, y) {
    drawnCharsCalls.push({ x, y, char: cell.getChars() });
  },
  _isOverlapping: function () {
    return true;
  },
};

const fakeTextLayer = Object.create(fakeTextProto);
fakeTextLayer._ctx = mockCtx;
fakeTextLayer._deviceCellWidth = 10;
fakeTextLayer._deviceCellHeight = 20;

const mockCells = [
  createMockCell({ chars: '\u{10EEEE}' }), // col 0: placeholder -> MUST BE SKIPPED in _drawChars
  createMockCell({ chars: 'H' }),          // col 1: normal char -> MUST BE DRAWN
  createMockCell({ chars: 'i' }),          // col 2: normal char -> MUST BE DRAWN
];

fakeTextLayer._forEachCell = function (startRow, endRow, callback) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = 0; c < mockCells.length; c++) {
      callback(mockCells[c], c, r);
    }
  }
};

const fakeRenderer = {
  _renderLayers: [fakeTextLayer, null, null, null],
};

const mockTerm = {
  _core: {
    _renderService: {
      _renderer: fakeRenderer,
    },
  },
  onScroll: () => ({ dispose: () => {} }),
  onRender: () => ({ dispose: () => {} }),
  onResize: () => ({ dispose: () => {} }),
  buffer: {
    active: {
      viewportY: 0,
      baseY: 0,
      cursorX: 0,
      cursorY: 0,
      getLine: () => null,
    },
  },
};

const hookManager = new KittyGraphicsManager(mockTerm, fakeContainer, 'hook-test-session');
// Spy on drawPlaceholderCell
hookManager.drawPlaceholderCell = (ctx, cell, col, row) => {
  drawnPlaceholderCalls.push({ col, row, char: cell.getChars() });
};

// Install the canvas renderer hook
hookManager.installCanvasRendererHook();

// Run _drawForeground (the Font/Glyph Render Pass)
fakeTextLayer._drawForeground(0, 0);

// Verify: col 0 (U+10EEEE) was handled by drawPlaceholderCell
assert.strictEqual(drawnPlaceholderCalls.length, 1, 'Should call drawPlaceholderCell for U+10EEEE');
assert.strictEqual(drawnPlaceholderCalls[0].col, 0);

// Verify: col 0 was completely SKIPPED in _drawChars (Font/Glyph Pass)
assert.strictEqual(drawnCharsCalls.length, 2, 'Only 2 normal characters should be passed to _drawChars');
assert.strictEqual(drawnCharsCalls[0].char, 'H', 'First drawn char should be H');
assert.strictEqual(drawnCharsCalls[1].char, 'i', 'Second drawn char should be i');
assert.strictEqual(drawnCharsCalls.some((c) => c.char === '\u{10EEEE}'), false, 'U+10EEEE MUST NEVER be drawn by _drawChars');

// 11. Test xterm v5 MutableDisposable renderer resolution & setRenderer hook
let v5DrawnChars = [];
const v5TextLayer = Object.create(fakeTextProto);
v5TextLayer._ctx = mockCtx;
v5TextLayer._deviceCellWidth = 10;
v5TextLayer._deviceCellHeight = 20;
v5TextLayer._forEachCell = fakeTextLayer._forEachCell;
v5TextLayer._drawChars = function (cell, x, y) {
  v5DrawnChars.push({ x, y, char: cell.getChars() });
};

const v5Renderer = {
  _renderLayers: [v5TextLayer, null, null, null],
};

const mockMutableDisposable = {
  value: v5Renderer,
};

let setRendererCalled = false;
const v5MockTerm = {
  _core: {
    _renderService: {
      _renderer: mockMutableDisposable,
      setRenderer: function (newR) {
        setRendererCalled = true;
        this._renderer.value = newR;
      },
    },
  },
  onScroll: () => ({ dispose: () => {} }),
  onRender: () => ({ dispose: () => {} }),
  onResize: () => ({ dispose: () => {} }),
  buffer: {
    active: {
      viewportY: 0,
      baseY: 0,
      cursorX: 0,
      cursorY: 0,
      getLine: () => null,
    },
  },
};

const v5Manager = new KittyGraphicsManager(v5MockTerm, fakeContainer, 'v5-test-session');
v5Manager.installCanvasRendererHook();

// Run _drawForeground on v5TextLayer
v5TextLayer._drawForeground(0, 0);

// Verify U+10EEEE was skipped in v5DrawnChars
assert.strictEqual(v5DrawnChars.length, 2, 'Only normal characters drawn');
assert.strictEqual(v5DrawnChars.some((c) => c.char === '\u{10EEEE}'), false, 'U+10EEEE must be skipped in v5 renderer');

v5Manager.dispose();

console.log('✓ All Unicode Placeholder tests passed!');


