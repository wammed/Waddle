import { describe, it, expect } from 'vitest';
import { maskSecrets, hasSecrets } from '../secretMasker';

describe('secretMasker', () => {
  it('detects and masks AWS keys', () => {
    const text = 'export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
    expect(hasSecrets(text)).toBe(true);
    const res = maskSecrets(text);
    expect(res.count).toBe(1);
    expect(res.maskedText).toContain('AKIA••••••••••••••••');
  });

  it('detects and masks GitHub tokens', () => {
    const token = 'ghp_' + 'A'.repeat(36);
    const text = `git clone https://${token}@github.com/org/repo`;
    expect(hasSecrets(text)).toBe(true);
    const res = maskSecrets(text);
    expect(res.count).toBe(1);
    expect(res.maskedText).toContain('[REDACTED_GH_TOKEN]');
  });

  it('detects and masks Bearer tokens', () => {
    const text = 'Authorization: Bearer mySecretToken1234567890';
    expect(hasSecrets(text)).toBe(true);
    const res = maskSecrets(text);
    expect(res.count).toBe(1);
    expect(res.maskedText).toBe('Authorization: Bearer [REDACTED_BEARER_TOKEN]');
  });

  it('detects and masks private key blocks', () => {
    const text = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Y...
-----END RSA PRIVATE KEY-----`;
    expect(hasSecrets(text)).toBe(true);
    const res = maskSecrets(text);
    expect(res.count).toBe(1);
    expect(res.maskedText).toBe('[REDACTED_PRIVATE_KEY_BLOCK]');
  });

  it('detects key-value credential assignments', () => {
    const text = 'api_key = "super_secret_api_key_value"';
    expect(hasSecrets(text)).toBe(true);
    const res = maskSecrets(text);
    expect(res.count).toBe(1);
    expect(res.maskedText).toContain('••••••••[REDACTED]');
  });

  it('resets lastIndex and prevents false negatives on consecutive calls', () => {
    const textWithSecret = 'AKIAIOSFODNN7EXAMPLE';
    const textClean = 'echo "hello world"';

    // Call multiple times consecutively
    expect(hasSecrets(textWithSecret)).toBe(true);
    expect(hasSecrets(textWithSecret)).toBe(true);
    expect(hasSecrets(textClean)).toBe(false);
    expect(hasSecrets(textWithSecret)).toBe(true);
    expect(hasSecrets(textClean)).toBe(false);
  });

  it('returns unchanged text and 0 count for clean strings', () => {
    const text = 'ls -la /home/user/workspace';
    expect(hasSecrets(text)).toBe(false);
    const res = maskSecrets(text);
    expect(res.count).toBe(0);
    expect(res.maskedText).toBe(text);
  });
});
