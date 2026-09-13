import fs from 'fs';
import pkg from '@xterm/xterm';
const { Terminal } = pkg;
import { KittyApcParser } from '../src/services/kittyGraphics/parser.ts';

const rawBin = fs.readFileSync('scratch/waddle_identical_yazi.bin');
console.log('Read yazi bin:', rawBin.length, 'bytes');

const parser = new KittyApcParser();
const term = new Terminal({ cols: 120, rows: 30, allowTransparency: true });

const { cleanText, commands } = parser.parse(rawBin.toString('utf-8'));
console.log('Commands extracted:', commands.length);
console.log('Clean text length:', cleanText.length);

term.write(cleanText, () => {
  console.log('\n--- xterm buffer inspect ---');
  const buffer = term.buffer.active;
  console.log('buffer type:', buffer.type);
  console.log('cursorX:', buffer.cursorX, 'cursorY:', buffer.cursorY);
  console.log('baseY:', buffer.baseY, 'viewportY:', buffer.viewportY);
  
  let nonEmptyLines = 0;
  for (let r = 0; r < term.rows; r++) {
    const line = buffer.getLine(buffer.viewportY + r);
    if (!line) continue;
    const str = line.translateToString(true);
    if (str.trim().length > 0) {
      nonEmptyLines++;
      console.log(`Row ${r.toString().padStart(2)}: ${str.slice(0, 80)}`);
    }
  }
  console.log(`Total non-empty lines in viewport: ${nonEmptyLines}/${term.rows}`);
});
