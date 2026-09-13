import fs from 'fs';
import terminalMod from '../node_modules/@xterm/xterm/lib/xterm.js';
const Terminal = terminalMod.Terminal || terminalMod;

const raw = fs.readFileSync('scratch/waddle_identical_yazi.bin').toString('utf-8');
const term = new Terminal({ cols: 120, rows: 30, allowTransparency: true });
term.write(raw, () => {
  const line = term.buffer.active.getLine(1);
  for (let x = 0; x < 25; x++) {
    const cell = line.getCell(x);
    console.log(`x=${x} char=[${cell?.getChars()}] code=${cell?.getCode()} fg=${cell?.getFgColor()} fgMode=${cell?.getFgColorMode()} bg=${cell?.getBgColor()} bgMode=${cell?.getBgColorMode()}`);
  }
});
