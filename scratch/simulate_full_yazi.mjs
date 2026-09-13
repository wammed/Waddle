import fs from 'fs';
import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;
import { Unicode11Addon } from '@xterm/addon-unicode11';

const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = '11';

let drawnPlaceholders = [];
let drawnImages = [];

const fakeContainer = {
  querySelector: () => null,
  querySelectorAll: () => [],
  appendChild: () => {},
  clientWidth: 1200,
  clientHeight: 700,
};

globalThis.document = {
  createElement: () => ({
    style: {},
    getContext: () => ({
      save: () => {},
      restore: () => {},
      drawImage: (...args) => {
        drawnImages.push({
          args,
          callType: args.length === 9 ? '9-args' : '3-args',
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
  getComputedStyle: () => ({ paddingLeft: "0", paddingTop: "0" }),
  devicePixelRatio: 1,
};
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { KittyGraphicsManager } = await import('../src/services/kittyGraphics/manager.ts');
const manager = new KittyGraphicsManager(term, fakeContainer, 'sim-full-yazi');

manager.decoder.decode = async (keys, payload) => {
  return {
    bitmap: { width: keys.s || 396, height: keys.v || 444, close: () => {} },
    width: keys.s || 396,
    height: keys.v || 444,
  };
};

const rawDump = fs.readFileSync('scratch/real_yazi_dump.bin');

const chunkSize = 4096;
for (let i = 0; i < rawDump.length; i += chunkSize) {
  const chunkBuf = rawDump.slice(i, i + chunkSize);
  const chunkStr = chunkBuf.toString('utf-8');
  const clean = manager.filterPtyOutput(chunkStr);
  if (clean) {
    term.write(clean);
  }
}

await manager.commandQueue;
await new Promise(r => setTimeout(r, 500));

console.log('VirtualPlacements:', manager.virtualPlacements.size);
for (const [id, vp] of manager.virtualPlacements.entries()) {
  console.log(`VP id=${id}: cols=${vp.cols}, rows=${vp.rows}`);
}

console.log('Placements count:', manager.placements.size);
for (const [key, p] of manager.placements.entries()) {
  console.log('Placement:', key, { imageId: p.imageId, startCol: p.startCol, bufferLine: p.bufferLine, cols: p.cols, rows: p.rows });
}

console.log('Cache size:', manager.cache.size);

drawnImages = [];
manager.render();

console.log('Total drawImage calls on render():', drawnImages.length);

// Also check xterm buffer content!
const buf = term.buffer.active;
console.log('Buffer lines count:', buf.length, 'viewportY:', buf.viewportY, 'cursor:', buf.cursorX, buf.cursorY);

for (let y = 0; y < term.rows; y++) {
  const line = buf.getLine(y);
  if (!line) continue;
  const lineStr = line.translateToString(true);
  if (lineStr.trim().length > 0) {
    // Check if line has placeholder
    let phCount = 0;
    for (let x = 0; x < term.cols; x++) {
      const cell = line.getCell(x);
      const chars = cell?.getChars() || '';
      if (chars.includes('\u{10EEEE}')) phCount++;
    }
    console.log(`Line ${y}: len=${lineStr.length}, phCount=${phCount}, preview=${lineStr.slice(0, 40)}`);
  }
}
