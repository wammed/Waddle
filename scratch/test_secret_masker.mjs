import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

const { maskSecrets, hasSecrets } = await import('../src/services/secretMasker.ts');

console.log('=== TC-ENH-01: Real-Time Terminal Secret Masking (SecretMasker) Verification ===\n');

// 1. AWS Access Key ID Test
const awsSample = 'My key is AKIA1234567890ABCDEF and it works';
const awsResult = maskSecrets(awsSample);
console.log('1. AWS Key Test:');
console.log('   Original:', awsSample);
console.log('   Masked:  ', awsResult.maskedText);
assert.strictEqual(hasSecrets(awsSample), true, 'hasSecrets should detect AWS key');
assert.ok(awsResult.maskedText.includes('AKIA••••••••••••••••'), 'AWS Key masking failed');
assert.ok(!awsResult.maskedText.includes('AKIA1234567890ABCDEF'), 'Raw AWS key must not leak');
console.log('   ✓ AWS Access Key masked correctly.');

// 2. GitHub Personal Access Token Test
const ghSample = 'Authorization: token ghp_123456789012345678901234567890123456';
const ghResult = maskSecrets(ghSample);
console.log('\n2. GitHub Token Test:');
console.log('   Original:', ghSample);
console.log('   Masked:  ', ghResult.maskedText);
assert.strictEqual(hasSecrets(ghSample), true, 'hasSecrets should detect GitHub token');
assert.ok(ghResult.maskedText.includes('[REDACTED_GH_TOKEN]'), 'GitHub Token masking failed');
assert.ok(!ghResult.maskedText.includes('ghp_123456789012345678901234567890123456'), 'Raw GitHub token must not leak');
console.log('   ✓ GitHub Token masked correctly.');

// 3. Bearer Token Test
const bearerSample = "curl -H 'Authorization: Bearer mySecretToken12345678' https://api.com";
const bearerResult = maskSecrets(bearerSample);
console.log('\n3. Bearer Token Test:');
console.log('   Original:', bearerSample);
console.log('   Masked:  ', bearerResult.maskedText);
assert.strictEqual(hasSecrets(bearerSample), true, 'hasSecrets should detect Bearer token');
assert.ok(bearerResult.maskedText.includes('[REDACTED_BEARER_TOKEN]'), 'Bearer Token masking failed');
assert.ok(!bearerResult.maskedText.includes('mySecretToken12345678'), 'Raw Bearer token must not leak');
console.log('   ✓ Bearer Token masked correctly.');

// 4. Private Key Block Test
const pkeySample = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y1+EXAMPLEKEYMATERIALHERE
-----END RSA PRIVATE KEY-----`;
const pkeyResult = maskSecrets(pkeySample);
console.log('\n4. Private Key Block Test:');
console.log('   Masked:  ', pkeyResult.maskedText);
assert.strictEqual(hasSecrets(pkeySample), true, 'hasSecrets should detect private key block');
assert.ok(pkeyResult.maskedText.includes('[REDACTED_PRIVATE_KEY_BLOCK]'), 'Private Key Block masking failed');
assert.ok(!pkeyResult.maskedText.includes('MIIEowIBAAKCAQEA0Y1+'), 'Raw private key material must not leak');
console.log('   ✓ Private Key Block redacted correctly.');

// 5. JSON Web Token (JWT) Test
const jwtSample = 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
const jwtResult = maskSecrets(jwtSample);
console.log('\n5. JWT Test:');
console.log('   Original:', jwtSample);
console.log('   Masked:  ', jwtResult.maskedText);
assert.strictEqual(hasSecrets(jwtSample), true, 'hasSecrets should detect JWT');
assert.ok(jwtResult.maskedText.includes('[REDACTED_JWT]'), 'JWT masking failed');
assert.ok(!jwtResult.maskedText.includes('dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'), 'Raw JWT must not leak');
console.log('   ✓ JWT redacted correctly.');

// 6. Generic Key-Value Secret Assignment Test
const kvSample = 'export API_KEY="super_secret_password_123"';
const kvResult = maskSecrets(kvSample);
console.log('\n6. Key-Value Secret Assignment Test:');
console.log('   Original:', kvSample);
console.log('   Masked:  ', kvResult.maskedText);
assert.strictEqual(hasSecrets(kvSample), true, 'hasSecrets should detect Key-Value secret');
assert.ok(kvResult.maskedText.includes('[REDACTED]'), 'Key-Value Secret masking failed');
assert.ok(!kvResult.maskedText.includes('super_secret_password_123'), 'Raw secret value must not leak');
console.log('   ✓ Key-Value Secret masked correctly.');

console.log('\n=== TC-ENH-01 Result: PASS (All 6 Secret Categories Masked) ===\n');
