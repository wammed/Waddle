/**
 * SecretMasker: Real-time secret and sensitive credential redaction service.
 * Protects against accidental terminal screen leakage of API keys, tokens,
 * passwords, JWTs, and private keys.
 */

export interface SecretRange {
  start: number;
  end: number;
  ruleName: string;
}

interface SecretRule {
  name: string;
  regex: RegExp;
  replace: (match: string, ...args: any[]) => string;
  getValueRange?: (match: RegExpExecArray) => { start: number; end: number };
}

const RULES: SecretRule[] = [
  // 1. Private Key Blocks (SSH, RSA, OpenSSH, PGP)
  {
    name: 'PrivateKeyBlock',
    regex: /-----BEGIN (?:[A-Z0-9_-]+\s+)?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+\s+)?PRIVATE KEY-----/g,
    replace: () => '[REDACTED_PRIVATE_KEY_BLOCK]',
  },
  // 2. Bearer Tokens in HTTP headers or curl output
  {
    name: 'BearerToken',
    regex: /\b(Bearer\s+)([A-Za-z0-9\-_.+=/]{16,})\b/gi,
    replace: (_match, prefix: string) => `${prefix}[REDACTED_BEARER_TOKEN]`,
    getValueRange: (match) => {
      const start = match.index + match[1].length;
      return { start, end: start + match[2].length };
    },
  },
  // 3. AWS Secret Access Key (pattern and environment variable)
  {
    name: 'AwsSecretKey',
    regex: /(AWS_SECRET_ACCESS_KEY\s*[:=]\s*["']?)(?![^\s"']*\[REDACTED)(?![^\s"']*•)([A-Za-z0-9/+=]{40})(["']?)/gi,
    replace: (_match, prefix: string, _val: string, suffix: string) =>
      `${prefix}••••••••[REDACTED_AWS_SECRET]${suffix}`,
    getValueRange: (match) => {
      const start = match.index + match[1].length;
      return { start, end: start + match[2].length };
    },
  },
  // 4. AWS Access Key ID (AKIA...)
  {
    name: 'AwsKey',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    replace: (_match, key: string) => `AKIA${'•'.repeat(Math.max(4, key.length - 4))}`,
  },
  // 5. GitHub Personal Access Tokens (Classic ghp_, gho_, ghu_, ghs_, ghr_ + Fine-grained github_pat_)
  {
    name: 'GitHubToken',
    regex: /\b(github_pat_[A-Za-z0-9_]{22,255}|gh[pousr]_[A-Za-z0-9_]{36,255})\b/g,
    replace: (_match, token: string) => {
      if (token.startsWith('github_pat_')) {
        return `github_pat_${'•'.repeat(16)}[REDACTED_GH_TOKEN]`;
      }
      return `${token.slice(0, 4)}${'•'.repeat(16)}[REDACTED_GH_TOKEN]`;
    },
  },
  // 6. AI Model API Keys (OpenAI Classic sk-, OpenAI Project sk-proj-, Admin sk-admin-, Anthropic sk-ant-)
  {
    name: 'AiApiKey',
    regex: /\b(sk-(?:proj-|admin-|ant-)?[A-Za-z0-9_-]{32,160})\b/g,
    replace: (_match, key: string) => {
      const prefix = key.startsWith('sk-proj-')
        ? 'sk-proj-'
        : key.startsWith('sk-admin-')
        ? 'sk-admin-'
        : key.startsWith('sk-ant-')
        ? 'sk-ant-'
        : 'sk-';
      return `${prefix}${'•'.repeat(12)}[REDACTED_AI_KEY]`;
    },
  },
  // 7. Slack Tokens (Bot xoxb-, User xoxp-, App xoxa-, Refresh xoxr-, Workspace xoxs-)
  {
    name: 'SlackToken',
    regex: /\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*)\b/g,
    replace: () => 'xox••••••••[REDACTED_SLACK_TOKEN]',
  },
  // 8. Google Cloud / Gemini API Keys (AIza...)
  {
    name: 'GoogleApiKey',
    regex: /\b(AIza[0-9A-Za-z_-]{30,40})\b/g,
    replace: () => 'AIza••••••••[REDACTED_GOOGLE_KEY]',
  },
  // 9. JSON Web Tokens (bare JWT)
  {
    name: 'JWT',
    regex: /\b(eyJ[A-Za-z0-9-_=]{10,}\.eyJ[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_.+/=]{10,})\b/g,
    replace: () => '[REDACTED_JWT]',
  },
  // 10. Generic Key/Password/Token/Credential key-value assignments (supports prefixed env vars like OPENAI_API_KEY, SLACK_BOT_TOKEN, etc.)
  {
    name: 'KeyValueSecret',
    regex: /\b([A-Za-z0-9_]*(?:SECRET|API_?KEY|AUTH_?TOKEN|ACCESS_?TOKEN|PASSWORD|PASSWD)[A-Za-z0-9_]*\s*[:=]\s*["']?|(?:api[_-]?key|secret|password|passwd|token|auth[_-]?token|access[_-]?token|private[_-]?key|credential[s]?|base[_-]?key)\s*[:=]\s*["']?)(?![^\s"']*\[REDACTED)(?![^\s"']*•)([^\s"']{8,})(["']?)/gi,
    replace: (_match, prefix: string, _val: string, suffix: string) =>
      `${prefix}••••••••[REDACTED]${suffix}`,
    getValueRange: (match) => {
      const start = match.index + match[1].length;
      return { start, end: start + match[2].length };
    },
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
    rule.regex.lastIndex = 0;
    const matches = maskedText.match(rule.regex);
    if (matches) {
      count += matches.length;
      rule.regex.lastIndex = 0;
      maskedText = maskedText.replace(rule.regex, rule.replace);
    }
    rule.regex.lastIndex = 0;
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
    const matched = rule.regex.test(text);
    rule.regex.lastIndex = 0;
    return matched;
  });
}

/**
 * Finds character ranges of all detectable secrets in the given text.
 * Used for non-destructive visual masking and indicator badges in the editor.
 * Returns sorted, non-overlapping ranges.
 */
export function findSecretRanges(text: string): SecretRange[] {
  if (!text) return [];

  const rawRanges: SecretRange[] = [];

  for (const rule of RULES) {
    rule.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(text)) !== null) {
      if (rule.getValueRange) {
        const { start, end } = rule.getValueRange(match);
        if (end > start) {
          rawRanges.push({ start, end, ruleName: rule.name });
        }
      } else {
        const start = match.index;
        const end = match.index + match[0].length;
        if (end > start) {
          rawRanges.push({ start, end, ruleName: rule.name });
        }
      }
    }
    rule.regex.lastIndex = 0;
  }

  if (rawRanges.length === 0) return [];

  // Sort by start ascending, then end descending
  rawRanges.sort((a, b) => a.start - b.start || b.end - a.end);

  // Merge overlapping ranges
  const merged: SecretRange[] = [];
  let current = rawRanges[0];

  for (let i = 1; i < rawRanges.length; i++) {
    const next = rawRanges[i];
    if (next.start < current.end) {
      if (next.end > current.end) {
        current.end = next.end;
      }
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}
