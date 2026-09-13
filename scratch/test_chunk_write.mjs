import fs from 'fs';
import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;
import { Unicode11Addon } from '@xterm/addon-unicode11';

const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const unicode11 = new Unicode11Addon();
term.loadAddon(unicode11);
term.unicode.activeVersion = '11';

// Let's write the exact escape sequence for row 2 (which is 1-based row 3: \x1b[4;76H)
// from waddle_identical_yazi.bin
const rawDump = fs.readFileSync('scratch/waddle_identical_yazi.bin');
const cup3 = rawDump.indexOf(Buffer.from('\x1b[3;76H'));
const cup4 = rawDump.indexOf(Buffer.from('\x1b[4;76H'));
const cup5 = rawDump.indexOf(Buffer.from('\x1b[5;76H'));

const chunk3 = rawDump.slice(cup3, cup4);
const chunk4 = rawDump.slice(cup4, cup5);

console.log('Chunk 3 bytes length:', chunk3.length);
console.log('Chunk 4 bytes length:', chunk4.length);

term.write(chunk3.toString('utf-8'), () => {
  const line2 = term.buffer.active.getLine(2);
  const line3 = term.buffer.active.getLine(3);
  console.log('After writing chunk 3:');
  console.log('cursor:', term.buffer.active.cursorX, term.buffer.active.cursorY);
  console.log('Line 2 cell 118:', line2.getCell(118)?.getChars());
  console.log('Line 2 cell 119:', line2.getCell(119)?.getChars());
  console.log('Line 3 cell 0:', line3.getCell(0)?.getChars());
  
  term.write(chunk4.toString('utf-8'), () => {
    const line3_after = term.buffer.active.getLine(3);
    const line4_after = term.buffer.active.getLine(4);
    console.log('After writing chunk 4:');
    console.log('cursor:', term.buffer.active.cursorX, term.buffer.active.cursorY);
    console.log('Line 3 cell 118:', line3_after.getCell(118)?.getChars());
    console.log('Line 3 cell 119:', line3_after.getCell(119)?.getChars());
    console.log('Line 4 cell 0:', line4_after.getCell(0)?.getChars());
  });
});
