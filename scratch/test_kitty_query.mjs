import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Auto-delegate to `npx tsx` if executed directly via `node` without TypeScript/TSX loader
const hasTsxLoader = process.execArgv.some((a) => a.includes('tsx/dist'));
if (!hasTsxLoader) {
  const result = spawnSync(
    'npx',
    ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit' }
  );
  process.exit(result.status ?? 0);
}

import assert from 'node:assert';
const { KittyGraphicsManager } = await import('../src/services/kittyGraphics/manager.ts');

// Mock DOM elements and Terminal for testing KittyGraphicsManager in Node.js
const fakeContainer = {
  querySelector: () => null,
  appendChild: () => {},
  clientWidth: 800,
  clientHeight: 600,
};

// Minimal DOM document mock if needed
if (typeof document === 'undefined') {
  globalThis.document = {
    createElement: (tag) => {
      return {
        className: '',
        style: {},
        getContext: () => ({
          setTransform: () => {},
          clearRect: () => {},
          save: () => {},
          restore: () => {},
          beginPath: () => {},
          rect: () => {},
          clip: () => {},
          drawImage: () => {},
        }),
        parentElement: {
          removeChild: () => {},
        },
      };
    },
  };
}
if (typeof window === 'undefined') {
  globalThis.window = {
    devicePixelRatio: 1,
    getComputedStyle: () => ({ paddingLeft: '0', paddingTop: '0' }),
  };
}
if (typeof createImageBitmap === 'undefined') {
  globalThis.createImageBitmap = async () => ({
    width: 1,
    height: 1,
    close: () => {},
  });
}

const mockTerm = {
  cols: 80,
  rows: 24,
  buffer: {
    active: {
      cursorX: 0,
      cursorY: 0,
      baseY: 0,
      viewportY: 0,
      getLine: () => null,
    },
  },
  options: { scrollback: 1000 },
  onScroll: () => ({ dispose: () => {} }),
  onRender: () => ({ dispose: () => {} }),
  onResize: () => ({ dispose: () => {} }),
  refresh: () => {},
};

async function runTests() {
  console.log('--- Testing Kitty Graphics Query (a=q) Implementation ---');

  const ptyWrites = [];
  const manager = new KittyGraphicsManager(
    mockTerm,
    fakeContainer,
    'test-session-123',
    undefined,
    undefined,
    (data) => {
      ptyWrites.push(data);
    }
  );

  // Test 1: Query non-existent image ID 9999
  ptyWrites.length = 0;
  manager.filterPtyOutput('\x1b_Ga=q,i=9999;\x1b\\');
  // Wait for commandQueue microtask
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(ptyWrites.length, 1, 'Should send exactly 1 response for i=9999');
  assert.strictEqual(ptyWrites[0], '\x1b_Gi=9999;ENOENT\x1b\\', 'Should respond with ENOENT for non-existent image ID 9999');
  console.log('✔ Test 1: Non-existent image ID 9999 correctly responded with \\x1b_Gi=9999;ENOENT\\x1b\\');

  // Test 2: Query existing image
  // Inject mock image into cache
  manager.cache.set(42, {
    id: 42,
    bitmap: {},
    width: 100,
    height: 100,
    byteSize: 40000,
    lastUsed: Date.now(),
  });

  ptyWrites.length = 0;
  manager.filterPtyOutput('\x1b_Ga=q,i=42;\x1b\\');
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(ptyWrites.length, 1, 'Should send exactly 1 response for i=42');
  assert.strictEqual(ptyWrites[0], '\x1b_Gi=42;OK\x1b\\', 'Should respond with OK for existing image ID 42');
  console.log('✔ Test 2: Existing image ID 42 correctly responded with \\x1b_Gi=42;OK\\x1b\\');

  // Test 3: Capability query probe (a=q without i)
  ptyWrites.length = 0;
  manager.filterPtyOutput('\x1b_Ga=q;\x1b\\');
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(ptyWrites.length, 1, 'Should send exactly 1 response for capability query');
  assert.strictEqual(ptyWrites[0], '\x1b_G;OK\x1b\\', 'Should respond with \\x1b_G;OK\\x1b\\ for capability query');
  console.log('✔ Test 3: Capability query (a=q) correctly responded with \\x1b_G;OK\\x1b\\');

  // Test 4: Capability query probe with i=0 (a=q,i=0)
  ptyWrites.length = 0;
  manager.filterPtyOutput('\x1b_Ga=q,i=0;\x1b\\');
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(ptyWrites.length, 1, 'Should send exactly 1 response for i=0 query');
  assert.strictEqual(ptyWrites[0], '\x1b_G;OK\x1b\\', 'Should respond with \\x1b_G;OK\\x1b\\ for i=0 query');
  console.log('✔ Test 4: Capability query with i=0 correctly responded with \\x1b_G;OK\\x1b\\');

  // Test 5: Query with quiet flag q=0 (default quiet) - responses must NOT be suppressed
  ptyWrites.length = 0;
  manager.filterPtyOutput('\x1b_Ga=q,i=8888,q=0;\x1b\\');
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(ptyWrites.length, 1, 'Should send response even with q=0');
  assert.strictEqual(ptyWrites[0], '\x1b_Gi=8888;ENOENT\x1b\\', 'Should respond with ENOENT even with q=0');
  console.log('✔ Test 5: Query with q=0 is not suppressed (spec compliance)');

  // Test 6: Query with image number I=7777 (non-existent)
  ptyWrites.length = 0;
  manager.filterPtyOutput('\x1b_Ga=q,I=7777;\x1b\\');
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(ptyWrites.length, 1, 'Should send response for I=7777');
  assert.strictEqual(ptyWrites[0], '\x1b_Gi=7777;ENOENT\x1b\\', 'Should respond with ENOENT for I=7777');
  console.log('✔ Test 6: Query with I=7777 correctly responded with \\x1b_Gi=7777;ENOENT\\x1b\\');

  // Test 7: Virtual placement query (U=1)
  manager.virtualPlacements.set(99, {
    imageId: 99,
    cols: 2,
    rows: 2,
  });
  ptyWrites.length = 0;
  manager.filterPtyOutput('\x1b_Ga=q,i=99;\x1b\\');
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(ptyWrites.length, 1, 'Should send response for virtual placement');
  assert.strictEqual(ptyWrites[0], '\x1b_Gi=99;OK\x1b\\', 'Should respond with OK for existing virtual placement ID 99');
  console.log('✔ Test 7: Query for virtual placement ID 99 correctly responded with OK');

  // Test 8: Quiet mode q=2 suppresses transmission response (completely silent)
  ptyWrites.length = 0;
  const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  manager.filterPtyOutput(`\x1b_Ga=t,f=100,i=101,q=2;${tinyPng}\x1b\\`);
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(ptyWrites.length, 0, 'q=2 MUST suppress responses to prevent prompt pollution');
  console.log('✔ Test 8: Image transmission with q=2 is completely silent (no leak)');

  // Test 9: Quiet mode q=0 sends transmission response
  ptyWrites.length = 0;
  manager.filterPtyOutput(`\x1b_Ga=t,f=100,i=102,q=0;${tinyPng}\x1b\\`);
  await new Promise((r) => setTimeout(r, 50));
  assert.strictEqual(ptyWrites.length, 1, 'q=0 MUST send response');
  assert.strictEqual(ptyWrites[0], '\x1b_Gi=102;OK\x1b\\', 'q=0 should respond with OK');
  console.log('✔ Test 9: Image transmission with q=0 responds with OK');

  manager.dispose();

  // Test 10: Rust backend PTY query probe tests
  console.log('\nTesting Rust backend PTY instant query response tests...');
  const rustTest = spawnSync('cargo', ['test', 'test_kitty_query', '--manifest-path', 'src-tauri/Cargo.toml'], {
    encoding: 'utf-8',
  });
  assert.strictEqual(rustTest.status, 0, 'Rust test_kitty_query tests must pass');
  console.log('✔ Test 10: Rust backend 0ms PTY query tests (3 tests) all passed');

  console.log('\n=== TC-KITTY-04 Result: ALL CHECKS PASSED ===');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
