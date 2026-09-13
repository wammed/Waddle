import assert from 'assert';
import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;

// Setup mock terminal
const term = new Terminal({ cols: 100, rows: 30 });
// Mock container
const fakeContainer = {
  querySelector: () => null,
  querySelectorAll: () => [],
  appendChild: () => {},
  clientWidth: 1000,
  clientHeight: 600,
};

// Global mocks
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
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { KittyGraphicsManager } = await import('../src/services/kittyGraphics/manager.ts');
const manager = new KittyGraphicsManager(term, fakeContainer, 'yazi-test-session');

console.log('1. Testing Yazi placement with C=1 and CUP sequence (\\x1b[5;70H)...');
// Yazi places image with C=1, cols=25, rows=15
const ptyChunk = '\x1b[5;70H\x1b_Ga=p,i=1897743571,c=25,r=15,C=1;\x1b\\';
const filtered = manager.filterPtyOutput(ptyChunk);

assert.strictEqual(filtered.includes('\r\n'), false, 'Filtered output must NOT contain \\r\\n when C=1');
assert.strictEqual(filtered, '\x1b[5;70H', 'Filtered output should only keep terminal text / CUP sequence');

// Check parsed command anchors
const parsedCmd = manager.parser.parse(ptyChunk).commands[0];
assert.strictEqual(parsedCmd !== undefined, true, 'Command should be parsed');

// Run manager.generatePlaceholderSequence directly to inspect cmd properties
manager.generatePlaceholderSequence(parsedCmd, '\x1b[5;70H');
assert.strictEqual(parsedCmd.startCol, 69, 'startCol should be 69 (0-indexed col for col 70)');
assert.strictEqual(parsedCmd.startBufferLine, 4, 'startBufferLine should be 4 (0-indexed row for row 5)');
assert.strictEqual(parsedCmd.cols, 25);
assert.strictEqual(parsedCmd.rows, 15);

console.log('2. Testing standard CLI command with C=0 (e.g. fastfetch/icat)...');
const regularChunk = '\x1b_Ga=T,f=100,i=1,c=10,r=5;\x1b\\';
const regularFiltered = manager.filterPtyOutput(regularChunk);
assert.strictEqual(regularFiltered.includes('\r\n'), true, 'C=0 should allocate lines with \\r\\n');
assert.strictEqual((regularFiltered.match(/\r\n/g) || []).length, 4, 'Should allocate linefeeds for rows');

console.log('3. Testing uppercase delete action (a=d, d=A)...');
manager.cache.set(100, { id: 100, bitmap: null, frames: [] });
manager.placements.set('p1', { id: 'p1', imageId: 100 });
assert.strictEqual(manager.cache.size, 1);
assert.strictEqual(manager.placements.size, 1);

// Send delete with d=A
manager.filterPtyOutput('\x1b_Ga=d,d=A;\x1b\\');
// Allow microtask queue to process handleCommand
await new Promise(r => setTimeout(r, 50));
assert.strictEqual(manager.cache.size, 0, 'Cache should be cleared on d=A');
assert.strictEqual(manager.placements.size, 0, 'Placements should be cleared on d=A');

console.log('4. Testing placement reuse for same imageId...');
manager.cache.set(200, { id: 200, bitmap: null, frames: [], width: 100, height: 100 });
manager.placeImage(200, {}, 100, 100, 10, 5, 20, 10);
assert.strictEqual(manager.placements.size, 1);
const firstKey = Array.from(manager.placements.keys())[0];

// Re-place same imageId with new anchor
manager.placeImage(200, {}, 100, 100, 15, 8, 20, 10);
assert.strictEqual(manager.placements.size, 1, 'Placements should not accumulate duplicates for same imageId');
const secondPlacement = manager.placements.get(firstKey);
assert.strictEqual(secondPlacement.col, 15);
assert.strictEqual(secondPlacement.bufferLine, 8);

manager.dispose();
console.log('✓ All Yazi fix verification tests passed successfully!');
