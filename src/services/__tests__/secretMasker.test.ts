import { describe, it, expect } from 'vitest';
import { maskSecrets, hasSecrets, findSecretRanges } from '../secretMasker';

describe('secretMasker', () => {
  it('detects and masks AWS keys', () => {
    const text = 'export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
    expect(hasSecrets(text)).toBe(true);
    const res = maskSecrets(text);
    expect(res.count).toBe(1);
    expect(res.maskedText).toContain('AKIA••••••••••••••••');
  });

  it('detects and masks AWS Secret Access Key', () => {
    const text = 'export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    expect(hasSecrets(text)).toBe(true);
    const res = maskSecrets(text);
    expect(res.count).toBe(1);
    expect(res.maskedText).toContain('[REDACTED_AWS_SECRET]');
    expect(res.maskedText).not.toContain('wJalrXUtnFEMI/K7MDENG');
  });

  it('detects and masks GitHub tokens (classic and fine-grained)', () => {
    const classicToken = 'ghp_' + 'A'.repeat(36);
    const fineGrainedToken =
      'github_pat_11ABCD12345_67890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

    expect(hasSecrets(classicToken)).toBe(true);
    expect(hasSecrets(fineGrainedToken)).toBe(true);

    const resClassic = maskSecrets(`git clone https://${classicToken}@github.com/org/repo`);
    expect(resClassic.count).toBe(1);
    expect(resClassic.maskedText).toContain('[REDACTED_GH_TOKEN]');

    const resFine = maskSecrets(`git remote setup with: ${fineGrainedToken}`);
    expect(resFine.count).toBe(1);
    expect(resFine.maskedText).toContain('github_pat_••••••••••••••••[REDACTED_GH_TOKEN]');
    expect(resFine.maskedText).not.toContain('11ABCD12345');
  });

  it('detects and masks OpenAI and Anthropic API keys', () => {
    const classicKey = 'sk-abc1234567890def1234567890abcdef1234';
    const projKey =
      'sk-proj-abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc';
    const antKey = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz01234567890abcdefgh';

    expect(hasSecrets(classicKey)).toBe(true);
    expect(hasSecrets(projKey)).toBe(true);
    expect(hasSecrets(antKey)).toBe(true);

    const res1 = maskSecrets(`base_key=${classicKey}`);
    expect(res1.count).toBe(1);
    expect(res1.maskedText).toContain('[REDACTED_AI_KEY]');
    expect(res1.maskedText).not.toContain('1234567890def');

    const res2 = maskSecrets(`OPENAI_API_KEY=${projKey}`);
    expect(res2.count).toBe(1);
    expect(res2.maskedText).toContain('sk-proj-••••••••••••[REDACTED_AI_KEY]');

    const res3 = maskSecrets(`ANTHROPIC_API_KEY=${antKey}`);
    expect(res3.count).toBe(1);
    expect(res3.maskedText).toContain('sk-ant-••••••••••••[REDACTED_AI_KEY]');
  });

  it('detects and masks Slack tokens', () => {
    const botToken = 'xoxb-123456789012-1234567890123-abcdefghijklmnopqrstuvwx';
    const userToken = 'xoxp-123456789012-1234567890123-abcdefghijklmnopqrstuvwx';

    expect(hasSecrets(botToken)).toBe(true);
    expect(hasSecrets(userToken)).toBe(true);

    const resBot = maskSecrets(`SLACK_BOT_TOKEN=${botToken}`);
    expect(resBot.count).toBe(1);
    expect(resBot.maskedText).toContain('[REDACTED_SLACK_TOKEN]');
    expect(resBot.maskedText).not.toContain('1234567890123');

    const resUser = maskSecrets(`token=${userToken}`);
    expect(resUser.count).toBe(1);
    expect(resUser.maskedText).toContain('[REDACTED_SLACK_TOKEN]');
  });

  it('detects and masks Google Cloud / Gemini API keys', () => {
    const googleKey = 'AIzaSyD-1234567890abcdefghijklmnopqrst';
    expect(hasSecrets(googleKey)).toBe(true);
    const res = maskSecrets(`GEMINI_API_KEY=${googleKey}`);
    expect(res.count).toBe(1);
    expect(res.maskedText).toContain('[REDACTED_GOOGLE_KEY]');
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

  it('passes 100% of test_masker.py generated log lines with 0 leaks', () => {
    const testSecrets = {
      'GitHub PAT (ghp_)': 'ghp_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
      'GitHub Fine-grained PAT':
        'github_pat_11ABCD12345_67890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
      'AWS Access Key ID': 'AKIAIOSFODNN7EXAMPLE',
      'AWS Secret Access Key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      'OpenAI API Key (Classic)': 'sk-abc1234567890def1234567890abcdef1234',
      'OpenAI Project Key':
        'sk-proj-abc1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
      'Slack Bot Token': 'xoxb-123456789012-1234567890123-abcdefghijklmnopqrstuvwx',
      'Slack User Token': 'xoxp-123456789012-1234567890123-abcdefghijklmnopqrstuvwx',
      'JSON Web Token (JWT)':
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'SSH Private Key Header':
        '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFwAAAAdzc2gtcn\n-----END OPENSSH PRIVATE KEY-----',
    };

    const logLines = [
      `[INFO] 2026-09-16 12:00:01 Authenticating to GitHub with token: ${testSecrets['GitHub PAT (ghp_)']}`,
      `[DEBUG] Git remote setup with fine-grained credential: ${testSecrets['GitHub Fine-grained PAT']}`,
      `[INFO] 2026-09-16 12:00:02 Initializing AWS Session: AWS_ACCESS_KEY_ID=${testSecrets['AWS Access Key ID']} AWS_SECRET_ACCESS_KEY=${testSecrets['AWS Secret Access Key']}`,
      `[DEBUG] OpenAI client initialized with base_key=${testSecrets['OpenAI API Key (Classic)']}`,
      `[DEBUG] Project scoped key detected: OPENAI_API_KEY=${testSecrets['OpenAI Project Key']}`,
      `[INFO] 2026-09-16 12:00:03 Slack WebClient config: SLACK_BOT_TOKEN=${testSecrets['Slack Bot Token']}`,
      `[INFO] 2026-09-16 12:00:03 User context: token=${testSecrets['Slack User Token']}`,
      `[TRACE] Authorization: Bearer ${testSecrets['JSON Web Token (JWT)']}`,
      `[WARN] 2026-09-16 12:00:04 Exporting identity key file:\n${testSecrets['SSH Private Key Header']}`,
    ];

    for (const rawLine of logLines) {
      expect(hasSecrets(rawLine)).toBe(true);
      const { maskedText, count } = maskSecrets(rawLine);
      expect(count).toBeGreaterThanOrEqual(1);

      // Verify that none of the original sensitive values appear in the masked text
      for (const [name, secretValue] of Object.entries(testSecrets)) {
        if (name === 'SSH Private Key Header') {
          expect(maskedText).not.toContain('b3BlbnNzaC1rZXktdjE');
        } else {
          expect(maskedText).not.toContain(secretValue);
        }
      }
    }
  });

  it('correctly calculates secret ranges for visual editor masking', () => {
    const text = 'const key = "sk-proj-1234567890123456789012345678901234567890";\nconsole.log("clean");';
    const ranges = findSecretRanges(text);
    expect(ranges.length).toBe(1);
    expect(ranges[0].start).toBe(text.indexOf('sk-proj-'));
    expect(ranges[0].end).toBe(text.indexOf('sk-proj-') + 48);
    expect(text.slice(ranges[0].start, ranges[0].end)).toBe(
      'sk-proj-1234567890123456789012345678901234567890'
    );
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
    expect(findSecretRanges(text)).toEqual([]);
  });
});

