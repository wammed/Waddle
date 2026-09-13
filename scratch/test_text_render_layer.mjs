globalThis.self = globalThis;
global.self = global;
import terminalMod from '../node_modules/@xterm/xterm/lib/xterm.js';
const Terminal = terminalMod.Terminal || terminalMod;
const canvasMod = await import('../node_modules/@xterm/addon-canvas/lib/addon-canvas.js');
const CanvasAddon = canvasMod.CanvasAddon || canvasMod.default?.CanvasAddon || canvasMod.default;
import { KittyGraphicsManager } from '../src/services/kittyGraphics/manager.ts';

// Mock DOM
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.window = {
  devicePixelRatio: 1,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  requestAnimationFrame: global.requestAnimationFrame,
  cancelAnimationFrame: global.cancelAnimationFrame,
  addEventListener: () => {},
  removeEventListener: () => {},
  matchMedia: () => ({ addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }),
};
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

const drawCalls = [];

class MockContext {
  constructor(name) {
    this.name = name;
    this.fillStyle = '';
  }
  save() {}
  restore() {}
  beginPath() {}
  rect() {}
  clip() {}
  clearRect(x, y, w, h) {
    // console.log(`[${this.name} clearRect]`, x, y, w, h);
  }
  fillRect(x, y, w, h) {
    // console.log(`[${this.name} fillRect]`, x, y, w, h, this.fillStyle);
  }
  drawImage(...args) {
    drawCalls.push({ ctx: this.name, args: args.slice(1) });
  }
  fillText(text, x, y) {
    drawCalls.push({ ctx: this.name, text, x, y });
  }
  setTransform() {}
  measureText(str) {
    return { width: str.length * 9 };
  }
}

class MockElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = globalThis.document;
    this.style = {};
    this.classList = {
      add: (cls) => { this.className = (this.className || '') + ' ' + cls; },
      remove: (cls) => { if (this.className) this.className = this.className.replace(cls, ''); },
      contains: (cls) => (this.className || '').includes(cls),
    };
    this.children = [];
    this.firstChild = null;
    this.clientWidth = 720;
    this.clientHeight = 432;
    this._ctx = new MockContext(tag);
  }
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
  getAttribute() { return null; }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
  }
  appendChild(child) {
    this.children.push(child);
    this.firstChild = this.children[0];
    return child;
  }
  insertBefore(newChild, refChild) {
    const idx = this.children.indexOf(refChild);
    if (idx >= 0) {
      this.children.splice(idx, 0, newChild);
    } else {
      this.children.push(newChild);
    }
    this.firstChild = this.children[0];
    return newChild;
  }
  remove() {
    this.children = [];
  }
  querySelector(sel) {
    if (this.className && this.className.includes(sel.replace('.', ''))) return this;
    for (const c of this.children) {
      const res = c.querySelector ? c.querySelector(sel) : null;
      if (res) return res;
    }
    return null;
  }
  querySelectorAll(sel) {
    let res = [];
    if (this.className && this.className.includes(sel.replace('.', ''))) res.push(this);
    for (const c of this.children) {
      if (c.querySelectorAll) res.push(...c.querySelectorAll(sel));
    }
    return res;
  }
  getContext(type, opts) {
    return this._ctx;
  }
}

globalThis.document = {
  createElement: (tag) => new MockElement(tag),
  createDocumentFragment: () => new MockElement('fragment'),
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.document = globalThis.document;
globalThis.window.document = globalThis.document;
global.window = globalThis.window;

const container = new MockElement('div');
const screen = new MockElement('div');
screen.className = 'xterm-screen';
container.appendChild(screen);

const term = new Terminal({ rows: 24, cols: 80, allowTransparency: true });

// Load canvas addon
const canvasAddon = new CanvasAddon();
term.loadAddon(canvasAddon);

// Open term into container
term.open(container);

const actualScreen = container.querySelector('.xterm-screen');
console.log('Found actualScreen:', !!actualScreen);
if (actualScreen) {
  console.log('actualScreen children:', actualScreen.children.map(c => c.className));
}

const km = new KittyGraphicsManager(
  term,
  container,
  'test-session',
  { enabled: true },
  canvasAddon,
  () => {}
);

km.installCanvasRendererHook();

console.log('Screen children after KittyGraphicsManager:', screen.children.map(c => c.className));

// Write some prompt text
term.write('hello world prompt');
term._core._writeBuffer._innerWrite();

// Render rows
drawCalls.length = 0;
term.refresh(0, 23);

console.log('Draw calls count after term.refresh:', drawCalls.length);
console.log('First 5 draw calls:', drawCalls.slice(0, 5));
