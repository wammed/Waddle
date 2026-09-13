import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;
import { Unicode11Addon } from '@xterm/addon-unicode11';
import fs from 'fs';

const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = '11';

// Read real bytes from real_yazi_dump.bin around first placeholder!
const rawDump = fs.readFileSync('scratch/real_yazi_dump.bin');
const placeholderBytes = Buffer.from([0xf4, 0x8e, 0xbb, 0xae]);
const firstPos = rawDump.indexOf(placeholderBytes);

// Get the slice containing CUP and placeholders:
// \x1b[38;2;0;222;106m\x1b[2;76H...
const startPos = rawDump.lastIndexOf(Buffer.from('\x1b['), firstPos);
// Take 3 lines of output
const sliceBytes = rawDump.slice(startPos, startPos + 3000);
const sliceStr = sliceBytes.toString('utf-8');

term.write(sliceStr, () => {
  console.log('Cursor pos after write:', term.buffer.active.cursorX, term.buffer.active.cursorY);
  
  // Inspect line 1 (row 2 in 1-based is index 1 in 0-based)
  const line1 = term.buffer.active.getLine(1);
  console.log('Line 1 length:', line1.length);
  for (let col = 74; col < 85; col++) {
    const cell = line1.getCell(col);
    if (cell) {
      console.log(`Line 1 Col ${col}: chars=${JSON.stringify(cell.getChars())}, width=${cell.getWidth()}, code=${cell.getCode()}`);
    }
  }

  // Inspect line 2 (row 3 in 1-based is index 2 in 0-based)
  const line2 = term.buffer.active.getLine(2);
  for (let col = 74; col < 85; col++) {
    const cell = line2.getCell(col);
    if (cell) {
      console.log(`Line 2 Col ${col}: chars=${JSON.stringify(cell.getChars())}, width=${cell.getWidth()}, code=${cell.getCode()}`);
    }
  }
});
