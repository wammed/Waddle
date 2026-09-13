globalThis.self = globalThis;
global.self = global;
import fs from 'fs';
import terminalMod from '../node_modules/@xterm/xterm/lib/xterm.js';
const Terminal = terminalMod.Terminal || terminalMod;
const canvasMod = await import('../node_modules/@xterm/addon-canvas/lib/addon-canvas.js');
const CanvasAddon = canvasMod.CanvasAddon || canvasMod.default?.CanvasAddon || canvasMod.default;
globalThis.Path2D = class Path2D {
  moveTo() {}
  lineTo() {}
  closePath() {}
  arc() {}
  rect() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
};
globalThis.ImageData = class ImageData {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 4);
  }
};
import { KittyGraphicsManager } from '../src/services/kittyGraphics/manager.ts';

const textLayerDrawCalls = [];
const kittyLayerDrawCalls = [];

const recordDraw = (name, type, details) => {
  if (name.includes('text')) {
    textLayerDrawCalls.push({ type, ...details });
  } else if (name.includes('kitty')) {
    kittyLayerDrawCalls.push({ type, ...details });
  }
};

class Mock2DContext {
  constructor(name) {
    this.name = name;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.globalAlpha = 1.0;
    this.font = '';
    this.globalCompositeOperation = 'source-over';
    this.canvas = { width: 1080, height: 540 };
  }
  save() {}
  restore() {}
  beginPath() {}
  closePath() {}
  moveTo(x, y) {}
  lineTo(x, y) {}
  stroke() {}
  fill() {}
  rect() {}
  clip() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
  setTransform() {}
  translate(x, y) {}
  scale(x, y) {}
  clearRect(x, y, w, h) {
    recordDraw(this.name, 'clearRect', { x, y, w, h });
  }
  fillRect(x, y, w, h) {
    recordDraw(this.name, 'fillRect', { x, y, w, h, fillStyle: this.fillStyle });
  }
  fillText(text, x, y) {
    recordDraw(this.name, 'fillText', { text, x, y });
  }
  strokeText(text, x, y) {}
  drawImage(image, ...args) {
    if (this.name.includes('text')) {
      textLayerDrawCalls.push({ type: 'drawImage', args });
    } else if (this.name.includes('kitty')) {
      kittyLayerDrawCalls.push({ type: 'drawImage', args });
    }
  }
  measureText(text) {
    return { width: text.length * 9, actualBoundingBoxAscent: 14, actualBoundingBoxDescent: 4 };
  }
  getImageData() {
    return { data: new Uint8Array(4) };
  }
  putImageData() {}
  createLinearGradient() {
    return { addColorStop: () => {} };
  }
}

class MockDOMElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.style = {};
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      contains: (c) => this.classList._classes.has(c),
    };
    Object.defineProperty(this, 'className', {
      get: () => Array.from(this.classList._classes).join(' '),
      set: (val) => {
        this.classList._classes = new Set((val || '').split(/\s+/).filter(Boolean));
      }
    });
    this.children = [];
    this.clientWidth = 1080;
    this.clientHeight = 540;
    this.offsetWidth = 1080;
    this.offsetHeight = 540;
    this.ownerDocument = globalThis.document;
    if (tag.toLowerCase() === 'canvas') {
      this._ctx = new Mock2DContext('unknown');
    }
  }
  get firstChild() {
    return this.children[0] || null;
  }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    if (child.tagName === 'CANVAS') {
      child._ctx = new Mock2DContext(child.className || 'canvas');
    }
    return child;
  }
  insertBefore(newChild, refChild) {
    newChild.parentElement = this;
    const idx = this.children.indexOf(refChild);
    if (idx >= 0) {
      this.children.splice(idx, 0, newChild);
    } else {
      this.children.push(newChild);
    }
    if (newChild.tagName === 'CANVAS') {
      newChild._ctx = new Mock2DContext(newChild.className || 'canvas');
    }
    return newChild;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
    child.parentElement = null;
    return child;
  }
  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }
  querySelector(sel) {
    const cls = sel.replace('.', '');
    if (this.classList.contains(cls)) return this;
    for (const c of this.children) {
      const res = c.querySelector(sel);
      if (res) return res;
    }
    return null;
  }
  querySelectorAll(sel) {
    const cls = sel.replace('.', '');
    const list = [];
    if (this.classList.contains(cls)) list.push(this);
    for (const c of this.children) {
      list.push(...c.querySelectorAll(sel));
    }
    return list;
  }
  getContext(type) {
    return this._ctx;
  }
  setAttribute() {}
  getAttribute() { return null; }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 1080, height: 540, right: 1080, bottom: 540 };
  }
}

globalThis.document = {
  createElement: (tag) => new MockDOMElement(tag),
  createDocumentFragment: () => new MockDOMElement('fragment'),
  addEventListener: () => {},
  removeEventListener: () => {},
  fonts: { ready: Promise.resolve() },
};
globalThis.window = {
  devicePixelRatio: 1,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }),
  getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }),
  document: globalThis.document,
};
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
global.ResizeObserver = globalThis.ResizeObserver;
globalThis.self = globalThis.window;

const container = new MockDOMElement('div');
const term = new Terminal({ cols: 120, rows: 30, allowTransparency: true });

// 1. Open term into container
term.open(container);

// 2. Load CanvasAddon
const canvasAddon = new CanvasAddon();
term.loadAddon(canvasAddon);

// 3. Initialize KittyGraphicsManager
const km = new KittyGraphicsManager(
  term,
  container,
  'test-session',
  { enabled: true },
  canvasAddon,
  () => {}
);
km.installCanvasRendererHook();

// Inspect DOM layers in .xterm-screen
const screen = container.querySelector('.xterm-screen');
console.log('Screen found:', !!screen);
if (screen) {
  console.log('Layers in .xterm-screen:', screen.children.map(c => `${c.tagName}.${c.className} (zIndex: ${c.style.zIndex})`));
}

// 4. Feed Yazi data
const raw = fs.readFileSync('scratch/waddle_identical_yazi.bin').toString('utf-8');
const clean = km.filterPtyOutput(raw);

textLayerDrawCalls.length = 0;
kittyLayerDrawCalls.length = 0;

term.write(clean, () => {
  console.log('\n--- AFTER TERM.WRITE ---');
  console.log('Active buffer type:', term.buffer.active.type);
  console.log('Row 1 translateToString:', term.buffer.active.getLine(1)?.translateToString(true).slice(0, 60));

  // Trigger render
  const renderService = term._core._renderService;
  console.log('renderService:', !!renderService);
  console.log('renderService._renderer:', !!renderService?._renderer?.value);
  const renderer = renderService._renderer.value;
  console.log('renderer is CanvasRenderer:', renderer?.constructor?.name);
  console.log('renderer._renderLayers length:', renderer?._renderLayers?.length);
  const textLayer = renderer?._renderLayers[0];
  const origHGC = textLayer.handleGridChanged.bind(textLayer);
  textLayer.handleGridChanged = function(firstRow, lastRow) {
    console.log('>>> textLayer.handleGridChanged called with:', firstRow, lastRow);
    return origHGC(firstRow, lastRow);
  };

  const origDF = textLayer._drawForeground.bind(textLayer);
  textLayer._drawForeground = function(firstRow, lastRow) {
    console.log('>>> textLayer._drawForeground called with:', firstRow, lastRow);
    console.log('>>> this._forEachCell exists:', typeof this._forEachCell);
    try {
      origDF(firstRow, lastRow);
    } catch (err) {
      console.error('>>> ERROR in _drawForeground:', err);
    }
  };

  let fgCellCount = 0;
  let fgPlaceholderCount = 0;
  let fgDrawCharsCount = 0;

  const origDC = textLayer._drawChars.bind(textLayer);
  textLayer._drawChars = function(cell, x, y) {
    fgDrawCharsCount++;
    if (fgDrawCharsCount <= 5) {
      console.log('>>> textLayer._drawChars called:', cell.getChars(), x, y);
      const chars = cell.getChars();
      let glyph;
      if (chars && chars.length > 1) {
        glyph = this._charAtlas?.getRasterizedGlyphCombinedChar(chars, this._cellColorResolver?.result?.bg, this._cellColorResolver?.result?.fg, this._cellColorResolver?.result?.ext, true);
      } else {
        glyph = this._charAtlas?.getRasterizedGlyph(cell.getCode() || 32, this._cellColorResolver?.result?.bg, this._cellColorResolver?.result?.fg, this._cellColorResolver?.result?.ext, true);
      }
      console.log('>>> glyph result:', glyph?.size);
    }
    return origDC(cell, x, y);
  };

  term.refresh(0, 29);

  // If renderDebouncer is debouncing, wait or flush:
  const debouncer = renderService._renderDebouncer;
  console.log('debouncer:', !!debouncer);
  if (debouncer) {
    console.log('Flushing debouncer...');
    debouncer._innerRefresh();
  }

  console.log('Total fgDrawCharsCount called:', fgDrawCharsCount);
  console.log('textLayer draw calls count:', textLayerDrawCalls.length);
  if (textLayerDrawCalls.length > 0) {
    console.log('First 5 textLayer draw calls:', textLayerDrawCalls.slice(0, 5));
  } else {
    console.log('WARNING: ZERO DRAW CALLS ON TEXT LAYER!');
  }
});
