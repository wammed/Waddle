import assert from 'assert';
import {
  isPlaceholderCell,
  decodePlaceholderCell,
  computePlaceholderUV,
  ROW_COLUMN_DIACRITICS,
  PLACEHOLDER_CODEPOINT,
} from '../src/services/kittyGraphics/unicodePlaceholder.ts';
import { KittyGraphicsManager } from '../src/services/kittyGraphics/manager.ts';
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
assert.deepStrictEqual(uv00, { sx: 0, sy: 0, sw: 100, sh: 50 });

const uv01 = computePlaceholderUV(0, 1, 2, 2, 200, 100);
assert.deepStrictEqual(uv01, { sx: 100, sy: 0, sw: 100, sh: 50 });

const uv10 = computePlaceholderUV(1, 0, 2, 2, 200, 100);
assert.deepStrictEqual(uv10, { sx: 0, sy: 50, sw: 100, sh: 50 });

const uv11 = computePlaceholderUV(1, 1, 2, 2, 200, 100);
assert.deepStrictEqual(uv11, { sx: 100, sy: 50, sw: 100, sh: 50 });

// 2x2 grid on sub-rectangle (srcX: 50, srcY: 20, srcWidth: 100, srcHeight: 60) of 200x100 bitmap:
const uvSub00 = computePlaceholderUV(0, 0, 2, 2, 200, 100, 50, 20, 100, 60);
assert.deepStrictEqual(uvSub00, { sx: 50, sy: 20, sw: 50, sh: 30 });

const uvSub11 = computePlaceholderUV(1, 1, 2, 2, 200, 100, 50, 20, 100, 60);
assert.deepStrictEqual(uvSub11, { sx: 100, sy: 50, sw: 50, sh: 30 });

// 7. Test KittyGraphicsManager generatePlaceholderSequence with U=1
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

console.log('✓ All Unicode Placeholder tests passed!');
