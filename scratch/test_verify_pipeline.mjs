import fs from 'fs';
import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;
import { Unicode11Addon } from '@xterm/addon-unicode11';

const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = '11';

let drawnPlaceholders = [];

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
  getComputedStyle: () => ({ paddingLeft: "0", paddingTop: "0" }),
  devicePixelRatio: 1,
};
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);

const { KittyGraphicsManager } = await import('../src/services/kittyGraphics/manager.ts');
const manager = new KittyGraphicsManager(term, fakeContainer, 'sim-verify');

manager.decoder.decode = async (keys, payload) => ({
  bitmap: { width: keys.s || 600, height: keys.v || 673, close: () => {} },
  width: keys.s || 600,
  height: keys.v || 673,
});

// Use waddle_identical_yazi.bin!
const rawDump = fs.readFileSync('scratch/waddle_identical_yazi.bin');

// Feed up to 2170000 (after 1st image is rendered)
const slice = rawDump.slice(0, 2170000);

for (let i = 0; i < slice.length; i += 4096) {
  const clean = manager.filterPtyOutput(slice.slice(i, i + 4096).toString('utf-8'));
  if (clean) term.write(clean);
}

await manager.commandQueue;
await new Promise(r => setTimeout(r, 200));

console.log('VirtualPlacements before render:');
for (const [id, vp] of manager.virtualPlacements.entries()) {
  console.log(`VP id=${id}: cols=${vp.cols}, rows=${vp.rows}`);
}

drawnPlaceholders = [];
manager.render();

console.log('VirtualPlacements AFTER render:');
for (const [id, vp] of manager.virtualPlacements.entries()) {
  console.log(`VP id=${id}: cols=${vp.cols}, rows=${vp.rows}`);
}

console.log('Total draw calls in renderVisiblePlaceholders:', drawnPlaceholders.length);

if (drawnPlaceholders.length > 0) {
  const first = drawnPlaceholders[0];
  const last = drawnPlaceholders[drawnPlaceholders.length - 1];
  console.log('First cell draw:', first);
  console.log('Last cell draw:', last);
  
  // Calculate bounding box of all draws
  const minDx = Math.min(...drawnPlaceholders.map(d => d.dx));
  const maxDx = Math.max(...drawnPlaceholders.map(d => d.dx + d.dw));
  const minDy = Math.min(...drawnPlaceholders.map(d => d.dy));
  const maxDy = Math.max(...drawnPlaceholders.map(d => d.dy + d.dh));
  console.log(`Drawn Bounding Box: X=[${minDx}..${maxDx}], Y=[${minDy}..${maxDy}]`);
}
