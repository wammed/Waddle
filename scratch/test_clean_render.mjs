import fs from 'fs';
import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;
import { Unicode11Addon } from '@xterm/addon-unicode11';

const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = '11';

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
  getComputedStyle: () => ({ paddingLeft: "0", paddingTop: "0" }),
  devicePixelRatio: 1,
};
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { KittyGraphicsManager } = await import('../src/services/kittyGraphics/manager.ts');
const manager = new KittyGraphicsManager(term, fakeContainer, 'sim-test-clean');

manager.decoder.decode = async (keys, payload) => ({
  bitmap: { width: keys.s || 600, height: keys.v || 673, close: () => {} },
  width: keys.s || 600,
  height: keys.v || 673,
});

import { StringDecoder } from 'string_decoder';
const decoder = new StringDecoder('utf-8');

const rawDump = fs.readFileSync('scratch/waddle_identical_yazi.bin');
const slice = rawDump.slice(0, 2170000);

for (let i = 0; i < slice.length; i += 4096) {
  const chunkBuf = slice.slice(i, i + 4096);
  const chunkStr = decoder.write(chunkBuf);
  const clean = manager.filterPtyOutput(chunkStr);
  if (clean) term.write(clean);
}
const rem = decoder.end();
if (rem) {
  const clean = manager.filterPtyOutput(rem);
  if (clean) term.write(clean);
}

await manager.commandQueue;
await new Promise(r => setTimeout(r, 200));

// Test scanPlaceholderGridDimensions
manager.scanPlaceholderGridDimensions();
console.log('VirtualPlacements after scan:');
for (const [id, vp] of manager.virtualPlacements.entries()) {
  console.log(`VP id=${id}: cols=${vp.cols}, rows=${vp.rows}`);
}

drawnImages = [];
manager.render();

console.log('Total draw calls on Kitty canvas:', drawnImages.length);

// Verify that all draw calls are strictly inside the preview pane [750..1200]
const outside = drawnImages.filter(d => d.dx < 740);
console.log('Draw calls outside preview pane (dx < 740):', outside.length);

// Verify UV continuity: check if sx goes from 0 to 600, and sy goes from 0 to 673
const minSx = Math.min(...drawnImages.map(d => d.sx));
const maxSx = Math.max(...drawnImages.map(d => d.sx + d.sw));
const minSy = Math.min(...drawnImages.map(d => d.sy));
const maxSy = Math.max(...drawnImages.map(d => d.sy + d.sh));
console.log(`Source Texture UV Box: X=[${minSx}..${maxSx}] (expected [0..600]), Y=[${minSy}..${maxSy}] (expected [0..673])`);

// Verify destination box
const minDx = Math.min(...drawnImages.map(d => d.dx));
const maxDx = Math.max(...drawnImages.map(d => d.dx + d.dw));
const minDy = Math.min(...drawnImages.map(d => d.dy));
const maxDy = Math.max(...drawnImages.map(d => d.dy + d.dh));
console.log(`Destination Box: X=[${minDx}..${maxDx}], Y=[${minDy}..${maxDy}]`);
