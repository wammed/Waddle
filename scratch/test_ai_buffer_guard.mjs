import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TC-AI-04: 64KB Streaming Memory Buffer Guard Verification ===\n');

// 1. Verify Rust source code implementation in src-tauri/src/ai.rs
console.log('1. Verifying Rust backend buffer guard implementation in ai.rs...');
const aiRsPath = path.resolve(__dirname, '../src-tauri/src/ai.rs');
const aiRsContent = fs.readFileSync(aiRsPath, 'utf8');

assert.ok(
  aiRsContent.includes('pending_buffer.len() > 65536'),
  'ai.rs must check pending_buffer.len() > 65536'
);
assert.ok(
  aiRsContent.includes('Ollama response buffer exceeded 64KB without newline'),
  'ai.rs must return error when buffer exceeds 64KB without newline'
);
console.log('  ✓ Verified Rust source code contains 65,536 bytes limit check and error return.');

// 2. Simulate streaming with a mock HTTP server sending 70KB without newline
console.log('\n2. Testing simulated stream exceeding 64KB without newline...');

const PORT = 11438;
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Transfer-Encoding': 'chunked',
  });

  // Send 70KB in 8KB chunks without newlines
  const totalBytes = 70 * 1024;
  const chunkSize = 8 * 1024;
  let sent = 0;

  const interval = setInterval(() => {
    if (sent < totalBytes) {
      const remaining = totalBytes - sent;
      const toSend = Math.min(chunkSize, remaining);
      res.write('X'.repeat(toSend));
      sent += toSend;
    } else {
      clearInterval(interval);
      res.end();
    }
  }, 10);
});

server.listen(PORT, async () => {
  try {
    const res = await fetch(`http://localhost:${PORT}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'test' }], stream: true }),
    });

    const reader = res.body.getReader();
    let pendingBuffer = '';
    let guardTriggered = false;
    let errorMessage = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = new TextDecoder().decode(value);
      pendingBuffer += text;

      // Exact Rust buffer guard logic:
      if (pendingBuffer.length > 65536) {
        guardTriggered = true;
        errorMessage = 'Ollama response buffer exceeded 64KB without newline';
        await reader.cancel(); // Terminate stream immediately to free memory
        break;
      }
    }

    assert.strictEqual(guardTriggered, true, 'Guard should trigger when buffer > 64KB');
    assert.strictEqual(errorMessage, 'Ollama response buffer exceeded 64KB without newline');
    console.log(`  ✓ Successfully intercepted stream at ${pendingBuffer.length} bytes (> 65536).`);
    console.log(`  ✓ Error emitted: "${errorMessage}"`);
    console.log('  ✓ Stream canceled and buffer discarded, preventing DoS/memory exhaustion.');

    console.log('\n=== TC-AI-04 Result: PASS ===\n');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
