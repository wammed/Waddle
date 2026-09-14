/**
 * SecretMasker: Real-time secret and sensitive credential redaction service.
 * Protects against accidental terminal screen leakage of API keys, tokens,
 * passwords, JWTs, and private keys.
 */

interface SecretRule {
  name: string;
  regex: RegExp;
  replace: (match: string, ...args: any[]) => string;
}

const RULES: SecretRule[] = [
  // 1. Private Key Blocks (SSH, RSA, OpenSSH, PGP)
  {
    name: 'PrivateKeyBlock',
    regex: /-----BEGIN (?:[A-Z0-9_-]+\s+)?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+\s+)?PRIVATE KEY-----/g,
    replace: () => '[REDACTED_PRIVATE_KEY_BLOCK]',
  },
  // 2. AWS Access Key ID (AKIA...)
  {
    name: 'AwsKey',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    replace: (_match, key: string) => `AKIA${'•'.repeat(Math.max(4, key.length - 4))}`,
  },
  // 3. GitHub Personal Access Tokens (ghp_, gho_, ghu_, ghs_, ghr_)
  {
    name: 'GitHubToken',
    regex: /\b(gh[pousr]_[A-Za-z0-9_]{36,255})\b/g,
    replace: (_match, token: string) => `${token.slice(0, 4)}${'•'.repeat(16)}[REDACTED_GH_TOKEN]`,
  },
  // 4. Bearer Tokens in HTTP headers or curl output
  {
    name: 'BearerToken',
    regex: /\b(Bearer\s+)([A-Za-z0-9\-_.+=/]{16,})\b/gi,
    replace: (_match, prefix: string) => `${prefix}[REDACTED_BEARER_TOKEN]`,
  },
  // 5. JSON Web Tokens (JWT)
  {
    name: 'JWT',
    regex: /\b(eyJ[A-Za-z0-9-_=]{10,}\.eyJ[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_.+/=]{10,})\b/g,
    replace: () => '[REDACTED_JWT]',
  },
  // 6. Generic Key/Password/Token key-value assignments
  {
    name: 'KeyValueSecret',
    regex: /\b((?:api[_-]?key|secret|password|passwd|auth[_-]?token|access[_-]?token)\s*[:=]\s*["']?)([^\s"']{8,})(["']?)/gi,
    replace: (_match, prefix: string, _val: string, suffix: string) => `${prefix}••••••••[REDACTED]${suffix}`,
  },
];

/**
 * Redacts known sensitive patterns from the provided text string.
 * Returns the masked text and the total count of redacted secrets.
 */
export function maskSecrets(text: string): { maskedText: string; count: number } {
  if (!text) {
    return { maskedText: text, count: 0 };
  }

  let maskedText = text;
  let count = 0;

  for (const rule of RULES) {
    const matches = maskedText.match(rule.regex);
    if (matches) {
      count += matches.length;
      maskedText = maskedText.replace(rule.regex, rule.replace);
    }
  }

  return { maskedText, count };
}

/**
 * Checks if the text contains any detectable secrets without altering it.
 */
export function hasSecrets(text: string): boolean {
  if (!text) return false;
  return RULES.some((rule) => {
    rule.regex.lastIndex = 0;
    return rule.regex.test(text);
  });
}
