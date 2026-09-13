import fs from 'fs';
import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;
import { Unicode11Addon } from '@xterm/addon-unicode11';

const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = '11';

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
      drawImage: () => {},
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
const { isPlaceholderCell } = await import('../src/services/kittyGraphics/unicodePlaceholder.ts');
const manager = new KittyGraphicsManager(term, fakeContainer, 'sim-debug');

const rawDump = fs.readFileSync('scratch/waddle_identical_yazi.bin');
const slice = rawDump.slice(0, 2170000);

for (let i = 0; i < slice.length; i += 4096) {
  const clean = manager.filterPtyOutput(slice.slice(i, i + 4096).toString('utf-8'));
  if (clean) term.write(clean);
}

const line4 = term.buffer.active.getLine(4);
const cell0 = line4.getCell(0);
console.log('Line 4 Cell 0 isPlaceholder:', isPlaceholderCell(cell0));
console.log('Line 4 Cell 0 chars:', JSON.stringify(cell0.getChars()));
console.log('Line 4 Cell 0 code:', cell0.getCode());

const line15 = term.buffer.active.getLine(15);
const cell0_15 = line15.getCell(0);
console.log('Line 15 Cell 0 isPlaceholder:', isPlaceholderCell(cell0_15));
console.log('Line 15 Cell 0 chars:', JSON.stringify(cell0_15.getChars()));
console.log('Line 15 Cell 0 code:', cell0_15.getCode());
