const { Terminal } = require('@xterm/xterm');
const { Unicode11Addon } = require('@xterm/addon-unicode11');

const term = new Terminal({ cols: 120, rows: 35, allowProposedApi: true });
const u11 = new Unicode11Addon();
term.loadAddon(u11);
term.unicode.activeVersion = '11';

term.write('\u{10eeee}\u0305\u0305', () => {
  const line = term.buffer.active.getLine(0);
  const cell0 = line.getCell(0);
  const cell1 = line.getCell(1);
  console.log('Cell 0 width:', cell0.getWidth(), 'code:', cell0.getCode(), 'chars:', cell0.getChars());
  console.log('Cell 1 width:', cell1.getWidth(), 'code:', cell1.getCode(), 'chars:', cell1.getChars());
});
