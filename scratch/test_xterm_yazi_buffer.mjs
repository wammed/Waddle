import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;
import { Unicode11Addon } from '@xterm/addon-unicode11';

const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = '11';

// Sample from real Yazi dump:
// \x1b[38;2;0;222;106m\x1b[2;76H + placeholders
const yaziSample = '\x1b[38;2;0;222;106m\x1b[2;76H\xf4\x8e\xbb\xae\xcc\x85\xcc\x85\xf4\x8e\xbb\xae\xcc\x85\xcc\x8d\xf4\x8e\xbb\xae\xcc\x85\xcc\x8e\x1b[3;76H\xf4\x8e\xbb\xae\xcc\x8d\xcc\x85\xf4\x8e\xbb\xae\xcc\x8d\xcc\x8d';

term.write(yaziSample, () => {
  console.log('Cursor pos after write:', term.buffer.active.cursorX, term.buffer.active.cursorY);
  
  // Inspect line 1 (row 2 in 1-based is index 1 in 0-based)
  const line1 = term.buffer.active.getLine(1);
  console.log('Line 1 length:', line1.length);
  for (let col = 74; col < 82; col++) {
    const cell = line1.getCell(col);
    if (cell) {
      console.log(`Line 1 Col ${col}: chars=${JSON.stringify(cell.getChars())}, width=${cell.getWidth()}, code=${cell.getCode()}`);
    }
  }

  // Inspect line 2 (row 3 in 1-based is index 2 in 0-based)
  const line2 = term.buffer.active.getLine(2);
  for (let col = 74; col < 82; col++) {
    const cell = line2.getCell(col);
    if (cell) {
      console.log(`Line 2 Col ${col}: chars=${JSON.stringify(cell.getChars())}, width=${cell.getWidth()}, code=${cell.getCode()}`);
    }
  }
});
