import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="terminal" style="width: 800px; height: 600px;"></div></body></html>', {
  pretendToBeVisual: true
});

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.devicePixelRatio = 1;
global.self = global.window;

// Mock canvas context
const mockCtx = {
  save: () => {},
  restore: () => {},
  clearRect: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  drawImage: () => {},
  beginPath: () => {},
  rect: () => {},
  clip: () => {},
  setTransform: () => {},
  scale: () => {},
  translate: () => {},
  measureText: () => ({ width: 9 }),
  getImageData: () => ({ data: new Uint8Array(4) }),
  putImageData: () => {},
  font: '',
  fillStyle: '',
  strokeStyle: '',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  canvas: { width: 800, height: 600 }
};

dom.window.HTMLCanvasElement.prototype.getContext = function(type) {
  return mockCtx;
};

import pkg from '@xterm/xterm';
const { Terminal } = pkg;
import { CanvasAddon } from '@xterm/addon-canvas';
import { KittyGraphicsManager } from './src/services/kittyGraphics/manager.ts';

const container = dom.window.document.getElementById('terminal');
const term = new Terminal({ cols: 80, rows: 24, allowTransparency: true });
term.open(container);

const canvasAddon = new CanvasAddon();
term.loadAddon(canvasAddon);

console.log('DOM child nodes of container:', container.innerHTML);
