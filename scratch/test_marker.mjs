import terminalMod from '../node_modules/@xterm/xterm/lib/xterm.js';
const Terminal = terminalMod.Terminal || terminalMod;

const term = new Terminal({ rows: 10, cols: 40 });

for (let i = 0; i < 5; i++) {
  term.write(`Line ${i}\r\n`);
}
term._core._writeBuffer._innerWrite();

console.log('Cursor:', term.buffer.active.baseY, term.buffer.active.cursorY);
// Register marker at line 2
const currentAbsoluteLine = term.buffer.active.baseY + term.buffer.active.cursorY; // 5
const offset = 2 - currentAbsoluteLine; // -3
const marker = term.registerMarker(offset);
console.log('Marker line initially:', marker.line);

// Now write 20 lines to cause scrolling
for (let i = 0; i < 20; i++) {
  term.write(`New line ${i}\r\n`);
}
term._core._writeBuffer._innerWrite();

console.log('After scroll, baseY:', term.buffer.active.baseY, 'cursorY:', term.buffer.active.cursorY);
console.log('Marker line after scroll:', marker.line);
console.log('Marker isDisposed:', marker.isDisposed);
