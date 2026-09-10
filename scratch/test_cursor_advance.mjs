import xtermPkg from '@xterm/xterm';
const { Terminal } = xtermPkg;

class KittyApcParser {
  constructor(maxPayloadMb = 16) {
    this.buffer = '';
    this.pendingChunkKeys = null;
    this.pendingChunkPayload = '';
    this.maxPayloadBytes = maxPayloadMb * 1024 * 1024;
  }

  parse(chunk, onCommand) {
    let input = this.buffer + chunk;
    this.buffer = '';

    let cleanText = '';
    const commands = [];

    let i = 0;
    const len = input.length;

    while (i < len) {
      const apcIdx = input.indexOf('\x1b_G', i);
      if (apcIdx === -1) {
        if (input.endsWith('\x1b') || input.endsWith('\x1b_')) {
          const cutIdx = input.endsWith('\x1b_') ? len - 2 : len - 1;
          cleanText += input.slice(i, cutIdx);
          this.buffer = input.slice(cutIdx);
        } else {
          cleanText += input.slice(i);
        }
        break;
      }

      cleanText += input.slice(i, apcIdx);

      let endIdx = -1;
      let termLen = 0;

      const stIdx = input.indexOf('\x1b\\', apcIdx + 3);
      const belIdx = input.indexOf('\x07', apcIdx + 3);

      if (stIdx !== -1 && belIdx !== -1) {
        if (stIdx < belIdx) {
          endIdx = stIdx;
          termLen = 2;
        } else {
          endIdx = belIdx;
          termLen = 1;
        }
      } else if (stIdx !== -1) {
        endIdx = stIdx;
        termLen = 2;
      } else if (belIdx !== -1) {
        endIdx = belIdx;
        termLen = 1;
      }

      if (endIdx === -1) {
        this.buffer = input.slice(apcIdx);
        break;
      }

      const sequenceBody = input.slice(apcIdx + 3, endIdx);
      i = endIdx + termLen;

      const semiIdx = sequenceBody.indexOf(';');
      let keysStr = sequenceBody;
      let payload = '';

      if (semiIdx !== -1) {
        keysStr = sequenceBody.slice(0, semiIdx);
        payload = sequenceBody.slice(semiIdx + 1);
      }

      const keys = this.parseControlKeys(keysStr);

      if (keys.m === 1) {
        if (!this.pendingChunkKeys) {
          this.pendingChunkKeys = keys;
          this.pendingChunkPayload = payload;
        } else {
          this.pendingChunkPayload += payload;
        }
      } else {
        let completedCmd = null;
        if (this.pendingChunkKeys) {
          const mergedKeys = {
            ...this.pendingChunkKeys,
            ...keys,
            m: 0,
          };
          const fullPayload = this.pendingChunkPayload + payload;
          this.pendingChunkKeys = null;
          this.pendingChunkPayload = '';
          completedCmd = { keys: mergedKeys, payload: fullPayload };
        } else {
          completedCmd = { keys, payload };
        }

        if (completedCmd) {
          commands.push(completedCmd);
          if (onCommand) {
            const replacement = onCommand(completedCmd, cleanText);
            if (replacement) {
              cleanText += replacement;
            }
          }
        }
      }
    }

    return { cleanText, commands };
  }

  parseControlKeys(keysStr) {
    const result = { raw: {} };
    if (!keysStr.trim()) return result;
    const parts = keysStr.split(',');
    for (const part of parts) {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) continue;
      const k = part.slice(0, eqIdx).trim();
      const v = part.slice(eqIdx + 1).trim();
      result.raw[k] = v;
      if (k === 'a') result.a = v;
      else if (k === 'f') result.f = parseInt(v, 10);
      else if (k === 't') result.t = v;
      else if (k === 's') result.s = parseInt(v, 10);
      else if (k === 'v') result.v = parseInt(v, 10);
      else if (k === 'm') result.m = parseInt(v, 10);
      else if (k === 'i') result.i = parseInt(v, 10);
      else if (k === 'p') result.p = parseInt(v, 10);
      else if (k === 'q') result.q = parseInt(v, 10);
      else if (k === 'c') result.c = parseInt(v, 10);
      else if (k === 'r') result.r = parseInt(v, 10);
      else if (k === 'C') result.C = parseInt(v, 10);
    }
    return result;
  }
}

function computePlaceholder(cmd, startCol = 0, termCols = 80) {
  const cols = cmd.keys.c || 8;
  const rows = cmd.keys.r || 4;
  const C = cmd.keys.C ?? 0;

  let seq = '';
  if (C === 1) seq += '\x1b[s';

  const spaces = ' '.repeat(cols);
  for (let r = 0; r < rows; r++) {
    if (r > 0) {
      seq += '\r\n';
      if (startCol > 0) seq += `\x1b[${startCol}C`;
    }
    seq += spaces;
  }

  if (C === 1) {
    seq += '\x1b[u';
  } else if (startCol + cols >= termCols) {
    seq += '\r\n';
  }
  return seq;
}

console.log('--- Test 1: Parser and Sequence Generation for 4x8 Image (C=0) ---');
const term = new Terminal({ cols: 80, rows: 24 });
const parser = new KittyApcParser();

const inputChunk = '\x1b_Ga=T,f=100,r=4,c=8;payload\x1b\\<- TEXT HERE\r\n';
const { cleanText, commands } = parser.parse(inputChunk, (cmd) => {
  return computePlaceholder(cmd, 0, 80);
});

term.write(cleanText, () => {
  const line0 = term.buffer.active.getLine(0)?.translateToString(true);
  const line1 = term.buffer.active.getLine(1)?.translateToString(true);
  const line2 = term.buffer.active.getLine(2)?.translateToString(true);
  const line3 = term.buffer.active.getLine(3)?.translateToString(true);
  const line4 = term.buffer.active.getLine(4)?.translateToString(true);

  console.log('Line 0:', JSON.stringify(line0));
  console.log('Line 1:', JSON.stringify(line1));
  console.log('Line 2:', JSON.stringify(line2));
  console.log('Line 3:', JSON.stringify(line3));
  console.log('Line 4:', JSON.stringify(line4));
  console.log('Cursor pos:', term.buffer.active.cursorX, term.buffer.active.cursorY);

  const t1Passed =
    line3 === '        <- TEXT HERE' &&
    term.buffer.active.cursorX === 0 &&
    term.buffer.active.cursorY === 4;
  console.log('Test 1 Passed:', t1Passed ? 'YES' : 'NO');

  // --- Test 2: C=1 (Do not advance cursor) ---
  console.log('\n--- Test 2: C=1 (Cursor Not Moved) ---');
  const term2 = new Terminal({ cols: 80, rows: 24 });
  const inputC1 = '\x1b_Ga=T,f=100,r=4,c=8,C=1;payload\x1b\\';
  const resC1 = parser.parse(inputC1, (cmd) => computePlaceholder(cmd, 0, 80));
  term2.write(resC1.cleanText, () => {
    console.log('C=1 Cursor pos:', term2.buffer.active.cursorX, term2.buffer.active.cursorY);
    const t2Passed = term2.buffer.active.cursorX === 0 && term2.buffer.active.cursorY === 0;
    console.log('Test 2 Passed:', t2Passed ? 'YES' : 'NO');

    // --- Test 3: Screen Bottom Overflow Scrolling ---
    console.log('\n--- Test 3: Screen Bottom Overflow (Row 22 with 4 rows) ---');
    const term3 = new Terminal({ cols: 80, rows: 24 });
    let scrollInit = '';
    for (let i = 0; i < 22; i++) {
      scrollInit += `Line ${i}\r\n`;
    }
    term3.write(scrollInit, () => {
      const beforeBaseY = term3.buffer.active.baseY;
      const beforeCursorY = term3.buffer.active.cursorY;
      console.log('Before image at row 22: baseY =', beforeBaseY, 'cursorY =', beforeCursorY);

      const inputBottom = '\x1b_Ga=T,f=100,r=4,c=8;payload\x1b\\<- TEXT HERE\r\n';
      const resBottom = parser.parse(inputBottom, (cmd) => computePlaceholder(cmd, 0, 80));
      term3.write(resBottom.cleanText, () => {
        const afterBaseY = term3.buffer.active.baseY;
        const afterCursorY = term3.buffer.active.cursorY;
        console.log('After image: baseY =', afterBaseY, 'cursorY =', afterCursorY);
        const imageRow3 = term3.buffer.active.getLine(afterBaseY + 22)?.translateToString(true);
        console.log('Image Row 3 in buffer:', JSON.stringify(imageRow3));
        const t3Passed = afterBaseY === 3 && imageRow3?.includes('<- TEXT HERE');
        console.log('Test 3 Passed:', t3Passed ? 'YES' : 'NO');

        if (t1Passed && t2Passed && t3Passed) {
          console.log('\n>>> ALL 3 INTEGRATION TESTS PASSED! <<<');
          process.exit(0);
        } else {
          console.error('\n>>> SOME TESTS FAILED <<<');
          process.exit(1);
        }
      });
    });
  });
});
