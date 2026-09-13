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
const manager = new KittyGraphicsManager(term, fakeContainer, 'sim-inspect');

manager.decoder.decode = async (keys, payload) => ({
  bitmap: { width: keys.s || 396, height: keys.v || 444, close: () => {} },
  width: keys.s || 396,
  height: keys.v || 444,
});

const rawDump = fs.readFileSync('scratch/real_yazi_dump.bin');

// Stream up to 950000 (when 1st image is rendered on screen)
const slice = rawDump.slice(0, 950000);

for (let i = 0; i < slice.length; i += 4096) {
  const clean = manager.filterPtyOutput(slice.slice(i, i + 4096).toString('utf-8'));
  if (clean) term.write(clean);
}

await manager.commandQueue;
await new Promise(r => setTimeout(r, 200));

console.log('=== XTERM BUFFER STATE (rows=35, cols=120) ===');
const buf = term.buffer.active;
console.log('buffer.type:', buf.type, 'baseY:', buf.baseY, 'cursorX:', buf.cursorX, 'cursorY:', buf.cursorY);

for (let y = 0; y < term.rows; y++) {
  const line = buf.getLine(y);
  if (!line) continue;
  let str = '';
  let phCount = 0;
  for (let x = 0; x < term.cols; x++) {
    const cell = line.getCell(x);
    const chars = cell?.getChars() || ' ';
    if (chars.includes('\u{10EEEE}')) {
      str += '█';
      phCount++;
    } else {
      str += chars || ' ';
    }
  }
  console.log(`[row ${String(y).padStart(2, ' ')}] (ph=${String(phCount).padStart(2, ' ')}) |${str}|`);
}
