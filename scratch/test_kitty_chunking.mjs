import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-delegate to `npx tsx` if executed directly via `node` without TypeScript loader
const hasTsxLoader = process.execArgv.some((a) => a.includes('tsx/dist'));
if (!hasTsxLoader) {
  const result = spawnSync(
    'npx',
    ['tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: 'inherit' }
  );
  process.exit(result.status ?? 0);
}

const { KittyApcParser } = await import('../src/services/kittyGraphics/parser.ts');

console.log('=== TC-KITTY-03: Chunked Streaming Transmission (m=1, m=0) Verification ===\n');

// 1. Prepare simulated 10KB Base64 payload
const totalPayloadSize = 10000;
const rawChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
let originalPayload = '';
for (let i = 0; i < totalPayloadSize; i++) {
  originalPayload += rawChars[i % rawChars.length];
}

console.log(`Original simulated Base64 payload size: ${originalPayload.length} bytes`);

// 2. Split payload into 4096-byte chunks
const CHUNK_SIZE = 4096;
const chunks = [];
for (let i = 0; i < originalPayload.length; i += CHUNK_SIZE) {
  chunks.push(originalPayload.slice(i, i + CHUNK_SIZE));
}

console.log(`Split into ${chunks.length} chunks:`);
chunks.forEach((c, idx) => console.log(`  Chunk ${idx + 1}: ${c.length} bytes`));

// 3. Initialize KittyApcParser
const parser = new KittyApcParser(16); // 16MB max payload

// 4. Feed chunks into parser
let completedCommand = null;

for (let i = 0; i < chunks.length; i++) {
  const isFirst = i === 0;
  const isLast = i === chunks.length - 1;
  const m = isLast ? 0 : 1;
  const chunkData = chunks[i];

  let apcSequence = '';
  if (isFirst) {
    // Initial chunk includes transmission format and action keys (a=T, f=100, i=999, m=1)
    apcSequence = `\x1b_Ga=T,f=100,i=999,m=${m};${chunkData}\x1b\\`;
  } else {
    // Intermediate and final chunks only need m key
    apcSequence = `\x1b_Gm=${m};${chunkData}\x1b\\`;
  }

  const result = parser.parse(apcSequence);

  if (!isLast) {
    assert.strictEqual(
      result.commands.length,
      0,
      `Intermediate chunk ${i + 1} (m=1) should NOT emit completed command prematurely`
    );
    console.log(`  ✓ Chunk ${i + 1} (m=1): Successfully buffered in memory (commands: 0)`);
  } else {
    assert.strictEqual(
      result.commands.length,
      1,
      `Final chunk (m=0) must emit exactly 1 completed command`
    );
    completedCommand = result.commands[0];
    console.log(`  ✓ Final chunk (m=0): Emitted completed command`);
  }
}

// 5. Validate the coalesced command
assert.ok(completedCommand, 'Completed command must be emitted');
assert.strictEqual(completedCommand.keys.a, 'T', 'Action key a=T preserved');
assert.strictEqual(completedCommand.keys.f, 100, 'Format key f=100 preserved');
assert.strictEqual(completedCommand.keys.i, 999, 'Image ID i=999 preserved');
assert.strictEqual(completedCommand.keys.m, 0, 'Final m key is 0');
assert.strictEqual(
  completedCommand.payload.length,
  originalPayload.length,
  'Coalesced payload length matches original payload'
);
assert.strictEqual(
  completedCommand.payload,
  originalPayload,
  'Coalesced payload content matches original payload byte-for-byte'
);

console.log(`\nCoalesced Payload Verified: ${completedCommand.payload.length} bytes (exact match).`);

// 6. Test Rust PTY buffer chunk splitting (boundary across TCP/PTY read buffer)
console.log('\nTesting Rust backend PTY chunk splitting test (test_kitty_chunk_split)...');
const rustTest = spawnSync('cargo', ['test', 'test_kitty_chunk_split', '--manifest-path', 'src-tauri/Cargo.toml'], {
  encoding: 'utf-8',
});
assert.strictEqual(rustTest.status, 0, 'Rust test_kitty_chunk_split must pass');
console.log('  ✓ Rust test_kitty_chunk_split: PASS');

console.log('\n=== TC-KITTY-03 Result: PASS ===\n');
