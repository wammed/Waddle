import { Terminal } from '@xterm/xterm';
import { CanvasAddon } from '@xterm/addon-canvas';
import { KittyGraphicsManager } from '../../src/services/kittyGraphics';
import { THEMES } from '../../src/theme';

// Helper to send a real Kitty Graphics APC escape sequence
async function sendKittyImage(
  manager: KittyGraphicsManager,
  id: number,
  width: number,
  height: number,
  color: string
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);

  // Draw interior details so it's a distinct image
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(width * 0.25, height * 0.25, width * 0.5, height * 0.5);
  ctx.fillStyle = '#ff0055';
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.5, width * 0.15, 0, Math.PI * 2);
  ctx.fill();

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  const apcSeq = `\x1b_Ga=t,f=100,i=${id},s=${width},v=${height};${base64}\x1b\\`;
  manager.filterPtyOutput(apcSeq);
  await manager.flush();
}

// 1. Scenario 1: Kitty Unicode Placeholder (U+10EEEE)
async function initUnicodePlaceholderScenario() {
  const container = document.getElementById('term-unicode')!;
  const term = new Terminal({
    cols: 70,
    rows: 10,
    fontFamily: 'monospace',
    fontSize: 14,
    theme: {
      background: '#0d1117',
      foreground: '#c9d1d9',
    },
  });
  const canvasAddon = new CanvasAddon();
  term.loadAddon(canvasAddon);
  term.open(container);

  const manager = new KittyGraphicsManager(term, container, 'visual-unicode');
  manager.installCanvasRendererHook();

  // Send real Kitty APC escape sequence through protocol pipeline
  await sendKittyImage(manager, 42, 64, 32, '#00d26a');

  term.write('\x1b[1;32m●\x1b[0m Waddle Kitty Graphics Unicode Placeholder Protocol Test\r\n');
  term.write('Verifying that \\u{10EEEE} suppresses undef glyph (□ tofu):\r\n\r\n');
  term.write('Rendered Cell: [ \x1b[38;5;42m\u{10EEEE}\u0305\u0305\u{10EEEE}\u0305\u030D\x1b[0m ] <-- Image inside placeholder\r\n');
  term.write('\r\n\x1b[90mFont pass successfully skipped placeholder codepoint.\x1b[0m\r\n');
}

// 2. Scenario 2: Yazi / Ranger TUI Preview Frame Alignment
async function initTuiPreviewScenario() {
  const container = document.getElementById('term-tui')!;
  const term = new Terminal({
    cols: 70,
    rows: 10,
    fontFamily: 'monospace',
    fontSize: 14,
    theme: {
      background: '#0a0e17',
      foreground: '#e6edf3',
    },
  });
  const canvasAddon = new CanvasAddon();
  term.loadAddon(canvasAddon);
  term.open(container);

  const manager = new KittyGraphicsManager(term, container, 'visual-tui');
  manager.installCanvasRendererHook();

  // Send real Kitty APC escape sequence through protocol pipeline
  await sendKittyImage(manager, 88, 120, 60, '#3b82f6');

  term.write('┌─ Yazi Preview: banner.png ──────────────────────────────────┐\r\n');
  term.write('│                                                             │\r\n');
  term.write('│   \x1b[38;5;88m\u{10EEEE}\u0305\u0305\u{10EEEE}\u0305\u030D\u{10EEEE}\u0305\u030E\u{10EEEE}\u0305\u030F\x1b[0m                                          │\r\n');
  term.write('│   \x1b[38;5;88m\u{10EEEE}\u030D\u0305\u{10EEEE}\u030D\u030D\u{10EEEE}\u030D\u030E\u{10EEEE}\u030D\u030F\x1b[0m                                          │\r\n');
  term.write('│                                                             │\r\n');
  term.write('│ Resolution: 120x60px   Type: PNG   Alpha: Yes               │\r\n');
  term.write('└─────────────────────────────────────────────────────────────┘\r\n');
}

// 3. Scenario 3: High-Voltage Neon Themes Rendering
async function initNeonThemeScenario() {
  const container = document.getElementById('term-neon')!;
  const neonCyberpunk = THEMES.neon_cyberpunk || {
    background: '#090a15',
    foreground: '#00ffff',
    cursor: '#ff007f',
    black: '#101226',
    red: '#ff0055',
    green: '#00ff9f',
    yellow: '#ffe600',
    blue: '#00b8ff',
    magenta: '#ff007f',
    cyan: '#00ffff',
    white: '#f0f6fc',
  };

  const term = new Terminal({
    cols: 70,
    rows: 10,
    fontFamily: 'monospace',
    fontSize: 14,
    theme: neonCyberpunk,
  });
  const canvasAddon = new CanvasAddon();
  term.loadAddon(canvasAddon);
  term.open(container);

  term.write('\x1b[1;35m⚡ HIGH-VOLTAGE NEON THEME PREVIEW ⚡\x1b[0m\r\n');
  term.write('\x1b[36m╭─ user@waddle: ~/workspace ──────────────────────╮\x1b[0m\r\n');
  term.write('\x1b[36m│\x1b[0m \x1b[1;32m❯ cargo test --lib\x1b[0m                                 \x1b[36m│\x1b[0m\r\n');
  term.write('\x1b[36m│\x1b[0m   test result: \x1b[1;32mok\x1b[0m. \x1b[1;33m58 passed\x1b[0m; \x1b[31m0 failed\x1b[0m                \x1b[36m│\x1b[0m\r\n');
  term.write('\x1b[36m╰─────────────────────────────────────────────────╯\x1b[0m\r\n');
  term.write('\x1b[1;31m[Critical: High Contrast]\x1b[0m \x1b[1;33m[Warning: Glowing Border]\x1b[0m\r\n');
}

async function runAll() {
  try {
    await initUnicodePlaceholderScenario();
    await initTuiPreviewScenario();
    await initNeonThemeScenario();
    document.body.dataset.harnessReady = 'true';
    console.log('Visual harness ready!');
  } catch (err) {
    console.error('Failed to init harness:', err);
    document.body.dataset.harnessError = String(err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', runAll);
} else {
  runAll();
}

