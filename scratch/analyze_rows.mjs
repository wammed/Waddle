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

const rawDump = fs.readFileSync('scratch/waddle_identical_yazi.bin');
const slice = rawDump.slice(0, 2170000);

for (let i = 0; i < slice.length; i += 4096) {
  const clean = manager.filterPtyOutput(slice.slice(i, i + 4096).toString('utf-8'));
  if (clean) term.write(clean);
}

await manager.commandQueue;
await new Promise(r => setTimeout(r, 200));

drawnPlaceholders = [];
manager.render();

// Group by dy (row)
const rows = {};
for (const d of drawnPlaceholders) {
  if (!rows[d.dy]) rows[d.dy] = [];
  rows[d.dy].push(d);
}

const line4 = term.buffer.active.getLine(4);
const c0 = line4.getCell(0);
console.log('Cell 0 on line 4:', {
  chars: c0.getChars(),
  code: c0.getCode(),
  isFgRGB: c0.isFgRGB(),
  fg: c0.getFgColor(),
  isPlaceholder: (await import('../src/services/kittyGraphics/unicodePlaceholder.ts')).isPlaceholderCell(c0)
});
