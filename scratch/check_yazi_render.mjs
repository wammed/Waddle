import fs from 'fs';
import { StringDecoder } from 'string_decoder';
import terminalMod from '../node_modules/@xterm/xterm/lib/xterm.js';
const Terminal = terminalMod.Terminal || terminalMod;
import { KittyGraphicsManager } from '../src/services/kittyGraphics/manager.ts';

globalThis.document = {
  createElement: (tag) => ({
    tagName: tag,
    style: {},
    getContext: () => ({
      save: () => {},
      restore: () => {},
      drawImage: () => {},
      clearRect: () => {},
      setTransform: () => {},
      scale: () => {},
    }),
  }),
};
globalThis.window = {
  devicePixelRatio: 1,
  getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }),
};

const raw = fs.readFileSync('scratch/waddle_identical_yazi.bin');

// Test 1: Full text through parser directly (like test_text_flow.mjs)
for (const cols of [110, 112, 115, 118, 120, 125]) {
  const term1 = new Terminal({ cols, rows: 30, allowTransparency: true });
  const km1 = new KittyGraphicsManager(term1, { querySelector: () => null, querySelectorAll: () => [], appendChild: () => {} }, 'test1');
  const clean1 = km1.filterPtyOutput(raw.toString('utf-8'));
  term1.write(clean1, () => {
    console.log(`cols ${cols}: Row 0: [${term1.buffer.active.getLine(0)?.translateToString(true).slice(0, 50)}]`);
  });
}

// Test 2: Chunked through filterPtyOutput (like PTY streaming)
{
  const term2 = new Terminal({ cols: 112, rows: 30, allowTransparency: true });
  const km2 = new KittyGraphicsManager(term2, { querySelector: () => null, querySelectorAll: () => [], appendChild: () => {} }, 'test2');
  const decoder = new StringDecoder('utf8');
  const chunkSize = 4096;
  let clean2 = '';
  for (let i = 0; i < raw.length; i += chunkSize) {
    const chunk = raw.subarray(i, i + chunkSize);
    const textChunk = decoder.write(chunk);
    clean2 += km2.filterPtyOutput(textChunk);
  }
  clean2 += km2.filterPtyOutput(decoder.end());

  term2.write(clean2, () => {
    console.log('\n--- TEST 2: Chunked write with accumulated clean text ---');
    console.log('Row 0:', term2.buffer.active.getLine(0)?.translateToString(true));
    console.log('Row 1:', term2.buffer.active.getLine(1)?.translateToString(true).slice(0, 60));
  });
}

// Test 3: Chunked write with term.write per chunk (EXACTLY like SingleTerminalView.tsx)
{
  const term3 = new Terminal({ cols: 120, rows: 30, allowTransparency: true });
  const km3 = new KittyGraphicsManager(term3, { querySelector: () => null, querySelectorAll: () => [], appendChild: () => {} }, 'test3');
  const decoder = new StringDecoder('utf8');
  const chunkSize = 4096;
  for (let i = 0; i < raw.length; i += chunkSize) {
    const chunk = raw.subarray(i, i + chunkSize);
    const textChunk = decoder.write(chunk);
    const c = km3.filterPtyOutput(textChunk);
    if (c) term3.write(c);
  }
  const last = km3.filterPtyOutput(decoder.end());
  if (last) term3.write(last);

  setTimeout(() => {
    console.log('\n--- TEST 3 with cols=120: Real-time term.write per chunk ---');
    console.log('Row 0:', term3.buffer.active.getLine(0)?.translateToString(true));
    console.log('Row 1:', term3.buffer.active.getLine(1)?.translateToString(true).slice(0, 60));
    console.log('Row 5:', term3.buffer.active.getLine(5)?.translateToString(true).slice(0, 60));
    console.log('Row 8:', term3.buffer.active.getLine(8)?.translateToString(true).slice(0, 60));
    console.log('Row 29:', term3.buffer.active.getLine(29)?.translateToString(true).slice(0, 60));
  }, 100);
}
