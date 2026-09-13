import { Terminal } from '@xterm/xterm';
import { CanvasAddon } from '@xterm/addon-canvas';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><div id="terminal-container"></div>', {
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
global.OffscreenCanvas = class OffscreenCanvas {
  constructor(w, h) { this.width = w; this.height = h; }
  getContext() {
    return {
      font: '',
      measureText: () => ({ width: 10, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 2 }),
      drawImage: () => {},
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8Array(4) }),
      putImageData: () => {},
    };
  }
};

const container = document.getElementById('terminal-container');
const term = new Terminal({ allowTransparency: true, rows: 24, cols: 80 });
const addon = new CanvasAddon();
term.loadAddon(addon);
term.open(container);

console.log('Opened term');
const layers = addon._renderer._renderLayers;
console.log('Layers count:', layers.length);
for (let i = 0; i < layers.length; i++) {
  console.log(`Layer ${i}:`, layers[i].constructor.name, 'canvas:', layers[i].canvas.className, 'zIndex:', layers[i].canvas.style.zIndex);
}

term.write('Hello World\r\n');
addon._renderer.renderRows(0, 5);
console.log('Rendered rows successfully');
