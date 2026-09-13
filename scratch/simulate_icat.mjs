import terminalMod from '../node_modules/@xterm/xterm/lib/xterm.js';
const Terminal = terminalMod.Terminal || terminalMod;
import { KittyGraphicsManager } from '../src/services/kittyGraphics/manager.ts';
import { execFileSync } from 'child_process';
import path from 'path';

// Run kitten icat to get the exact output stream
const pythonScript = path.join(import.meta.dirname, 'run_kitten_icat.py');
const output = execFileSync('python3', [pythonScript], { maxBuffer: 10 * 1024 * 1024 });

console.log('Got icat output, size:', output.length);

// Mock DOM environment for xterm and canvas
globalThis.window = {
  devicePixelRatio: 1,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
};
globalThis.document = {
  createElement: (tag) => {
    return {
      tagName: tag.toUpperCase(),
      style: {},
      classList: { add: () => {} },
      appendChild: () => {},
      remove: () => {},
      getContext: () => ({
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        rect: () => {},
        clip: () => {},
        clearRect: () => {},
        fillRect: () => {},
        drawImage: (...args) => {
          console.log('[MockCanvas drawImage]:', args.length, 'args:', args.slice(1));
        },
        setTransform: () => {},
      }),
    };
  },
};

const term = new Terminal({ rows: 24, cols: 80 });

// Simulate prompt before running icat
term.write('susie@host ~/Downloads > kitty +kitten icat bye-bye.gif\r\n');
term._core._writeBuffer._innerWrite();

console.log('Initial cursor:', {
  baseY: term.buffer.active.baseY,
  cursorY: term.buffer.active.cursorY,
  cursorX: term.buffer.active.cursorX,
  length: term.buffer.active.length,
});

const mockContainer = {
  querySelector: () => null,
  querySelectorAll: () => [],
  appendChild: () => {},
  clientWidth: 720,
  clientHeight: 432,
};

const km = new KittyGraphicsManager(
  term,
  mockContainer,
  'test-pane',
  { enabled: true },
  undefined,
  (resp) => {
    console.log('[PTY Response from Manager]:', JSON.stringify(resp));
  }
);

// Filter PTY output
const cleanText = km.filterPtyOutput(output.toString('utf-8'));
console.log('Clean text length:', cleanText.length);
console.log('Clean text escaped:', JSON.stringify(cleanText));

// Write cleanText into terminal
term.write(cleanText);
term._core._writeBuffer._innerWrite();

console.log('Cursor after cleanText:', {
  baseY: term.buffer.active.baseY,
  cursorY: term.buffer.active.cursorY,
  cursorX: term.buffer.active.cursorX,
  length: term.buffer.active.length,
});

// Print all lines of the buffer
console.log('--- Buffer Lines ---');
for (let i = 0; i < term.buffer.active.length; i++) {
  const line = term.buffer.active.getLine(i);
  const str = line ? line.translateToString(true) : '';
  if (str.trim().length > 0) {
    console.log(`Line ${i}: "${str}"`);
  } else {
    console.log(`Line ${i}: [BLANK LINE, len=${line ? line.length : 0}]`);
  }
}
