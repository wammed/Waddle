import assert from 'node:assert';
import xtermPkg from '@xterm/xterm';
const Terminal = xtermPkg.Terminal || xtermPkg;

// Simulate the KittyGraphicsManager anchor calculation and placement retention
class MockKittyManager {
  constructor(term) {
    this.term = term;
    this.placements = new Map();
    this.cache = new Map();
    this.nextImageId = 1;
  }

  calculateCursorOffset(text) {
    if (!text) return { deltaCol: 0, deltaLine: 0 };
    let deltaLine = 0;
    let lastLineLen = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        deltaLine++;
        lastLineLen = 0;
      } else if (text[i] === '\r') {
        lastLineLen = 0;
      } else {
        lastLineLen++;
      }
    }
    return { deltaCol: lastLineLen, deltaLine };
  }

  generatePlaceholder(cmd, textBefore) {
    const { cols = 6, rows = 3 } = cmd.keys;
    const termCols = this.term.cols || 80;

    const { deltaCol, deltaLine } = this.calculateCursorOffset(textBefore);
    let startCol = this.term.buffer.active.cursorX;
    let startBufferLine = this.term.buffer.active.baseY + this.term.buffer.active.cursorY;

    if (deltaLine > 0) {
      startCol = deltaCol % termCols;
      startBufferLine += deltaLine;
    } else if (deltaCol > 0) {
      startCol = (startCol + deltaCol) % termCols;
    }

    cmd.startCol = startCol;
    cmd.startBufferLine = startBufferLine;
    cmd.cols = cols;
    cmd.rows = rows;

    let seq = '';
    const spaces = ' '.repeat(cols);
    for (let r = 0; r < rows; r++) {
      if (r > 0) {
        seq += '\r\n';
        if (startCol > 0) {
          seq += `\x1b[${startCol}C`;
        }
      }
      seq += spaces;
    }
    return seq;
  }

  placeImage(imageId, keys, anchorCol, anchorBufferLine, cols, rows) {
    const { baseY, cursorY, cursorX } = this.term.buffer.active;
    const placementId = keys.p ? String(keys.p) : `img-${imageId}`;
    const existing = this.placements.get(placementId);

    const bufferLine = anchorBufferLine !== undefined
      ? anchorBufferLine
      : (existing ? existing.bufferLine : (baseY + cursorY));
    const col = anchorCol !== undefined
      ? anchorCol
      : (existing ? existing.col : cursorX);

    const placement = {
      id: placementId,
      imageId,
      bufferLine,
      col,
      cols,
      rows,
    };
    this.placements.set(placementId, placement);
    return placement;
  }

  calculateRenderCoords(placement, cellWidth = 10, cellHeight = 20, paddingLeft = 2, paddingTop = 2) {
    const viewportY = this.term.buffer.active.viewportY;
    const screenRow = placement.bufferLine - viewportY;
    const renderX = paddingLeft + placement.col * cellWidth;
    const renderY = paddingTop + screenRow * cellHeight;
    return { renderX, renderY, screenRow };
  }
}

async function runTest() {
  const term = new Terminal({ rows: 24, cols: 80 });
  const manager = new MockKittyManager(term);

  let ptyQueue = Promise.resolve();
  function processChunk(chunk, isKitty = false, cmd = null) {
    return new Promise((resolve) => {
      ptyQueue = ptyQueue.then(() => new Promise((chunkDone) => {
        let textToWrite = chunk;
        if (isKitty && cmd) {
          const placeholder = manager.generatePlaceholder(cmd, '');
          textToWrite = placeholder;
        }
        term.write(textToWrite, () => {
          chunkDone();
          resolve();
        });
      }));
    });
  }

  console.log('--- Step 1: Output title line ---');
  await processChunk('=== Kitty Test ===\r\n');
  assert.strictEqual(term.buffer.active.cursorY, 1, 'Cursor should be on row 1 after title line');
  assert.strictEqual(term.buffer.active.cursorX, 0, 'Cursor should be at col 0');
  console.log('Title row confirmed on line 0, cursor on line 1, col 0');

  console.log('--- Step 2: Output a=T image command (3 rows x 6 cols) ---');
  const cmd = {
    keys: { a: 'T', i: 1, c: 6, r: 3 },
    payload: 'base64...'
  };
  await processChunk('', true, cmd);

  assert.strictEqual(cmd.startBufferLine, 1, 'cmd.startBufferLine must be line 1 (NOT line 0!)');
  assert.strictEqual(cmd.startCol, 0, 'cmd.startCol must be col 0');

  const p1 = manager.placeImage(1, cmd.keys, cmd.startCol, cmd.startBufferLine, cmd.cols, cmd.rows);
  assert.strictEqual(p1.bufferLine, 1, 'Placement bufferLine must be 1');
  assert.strictEqual(p1.col, 0, 'Placement col must be 0');

  const coords = manager.calculateRenderCoords(p1);
  console.log('Render coords for image 1:', coords);
  assert.strictEqual(coords.renderX, 2 + 0 * 10, 'renderX must be padding_left (2px) + 0 * cellWidth');
  assert.strictEqual(coords.renderY, 2 + 1 * 20, 'renderY must be padding_top (2px) + 1 * cellHeight (22px)');
  console.log('PASS: Image placed at row 1, renderY = 22px (NOT row 0 / 2px)!');

  console.log('--- Step 3: Animation frame a=f update ---');
  const frameCmd = {
    keys: { a: 'f', i: 1 },
    payload: 'frame2...'
  };
  // Frame update does not generate placeholder, retains original anchor
  const pFrame = manager.placeImage(1, frameCmd.keys, undefined, undefined, p1.cols, p1.rows);
  assert.strictEqual(pFrame.bufferLine, 1, 'Frame must retain anchor row 1');
  assert.strictEqual(pFrame.col, 0, 'Frame must retain anchor col 0');

  const frameCoords = manager.calculateRenderCoords(pFrame);
  assert.strictEqual(frameCoords.renderY, 22, 'Frame renderY must remain 22px');
  console.log('PASS: Animation frame a=f successfully retained anchor coordinates (row 1, col 0)!');

  console.log('>>> ALL ANCHOR AND FRAME TESTS PASSED! <<<');
}

runTest();
