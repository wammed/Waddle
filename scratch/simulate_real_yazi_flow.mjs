import fs from 'fs';
import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;
import { Unicode11Addon } from '@xterm/addon-unicode11';

// Setup mock terminal
const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = '11';

let drawnPlaceholders = [];
let renderVisibleCalls = [];

const fakeContainer = {
  querySelector: () => null,
  querySelectorAll: () => [],
  appendChild: () => {},
  clientWidth: 1200,
  clientHeight: 700,
};

// Global mocks
globalThis.document = {
  createElement: () => ({
    style: {},
    getContext: () => ({
      save: () => {},
      restore: () => {},
      drawImage: (...args) => {
        // Log drawImage call!
        // drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh)
        drawnPlaceholders.push({
          sx: args[1], sy: args[2], sw: args[3], sh: args[4],
          dx: args[5], dy: args[6], dw: args[7], dh: args[8],
        });
      },
      setTransform: () => {},
      clearRect: () => {},
      beginPath: () => {},
      rect: () => {},
      clip: () => {},
    }),
    parentElement: null,
  }),
};
globalThis.window = {
  devicePixelRatio: 1,
};
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { KittyGraphicsManager } = await import('../src/services/kittyGraphics/manager.ts');
const manager = new KittyGraphicsManager(term, fakeContainer, 'sim-yazi-session');

// Mock ImageBitmap decoding so decoder succeeds
const { KittyDecoder } = await import('../src/services/kittyGraphics/decoder.ts');
manager.decoder.decode = async (keys, payload) => {
  return {
    bitmap: { width: keys.s || 396, height: keys.v || 444, close: () => {} },
    width: keys.s || 396,
    height: keys.v || 444,
  };
};

const rawDump = fs.readFileSync('scratch/real_yazi_dump.bin');
// Feed the rawDump through filterPtyOutput and term.write in chunks
const chunkSize = 4096;
for (let i = 0; i < rawDump.length; i += chunkSize) {
  const chunkBuf = rawDump.slice(i, i + chunkSize);
  const chunkStr = chunkBuf.toString('utf-8');
  const clean = manager.filterPtyOutput(chunkStr);
  if (clean) {
    term.write(clean);
  }
}

// Wait for all command promises in manager.commandQueue
await manager.commandQueue;
await new Promise(r => setTimeout(r, 200));

console.log('VirtualPlacements size:', manager.virtualPlacements.size);
for (const [id, vp] of manager.virtualPlacements.entries()) {
  console.log(`VP id=${id}: cols=${vp.cols}, rows=${vp.rows}, explicitCols=${vp.explicitCols}, explicitRows=${vp.explicitRows}`);
}

console.log('Placements size:', manager.placements.size);
console.log('Cache size:', manager.cache.size);
for (const [id, img] of manager.cache.entries()) {
  console.log(`Cache id=${id}: width=${img.width}, height=${img.height}`);
}

// Now trigger manager.render()
drawnPlaceholders = [];
manager.render();

console.log('Total drawImage calls during render():', drawnPlaceholders.length);
if (drawnPlaceholders.length > 0) {
  console.log('First 5 drawImage calls:');
  console.log(drawnPlaceholders.slice(0, 5));
  console.log('Last 5 drawImage calls:');
  console.log(drawnPlaceholders.slice(-5));
}

