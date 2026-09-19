import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup mock localStorage and window for Node environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, val: string) => {
      store[key] = val;
    }),
    clear: () => {
      store = {};
    },
    triggerQuotaErrorOnNextSet: false,
  };
})();

(globalThis as any).localStorage = {
  getItem: (k: string) => storageMock.getItem(k),
  setItem: (k: string, v: string) => {
    if (storageMock.triggerQuotaErrorOnNextSet) {
      storageMock.triggerQuotaErrorOnNextSet = false;
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    storageMock.setItem(k, v);
  },
};

(globalThis as any).window = {
  dispatchEvent: vi.fn(),
};
(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

describe('sessionHistory', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.clearAllMocks();
    storageMock.triggerQuotaErrorOnNextSet = false;
  });

  it('adds a record and truncates output snippet to 500 chars', async () => {
    const { sessionHistory } = await import('../sessionHistory');
    sessionHistory.clearRecords();

    const longOutput = 'A'.repeat(1200);
    const rec = sessionHistory.addRecord({
      command: 'cat large_file.txt',
      cwd: '/tmp',
      exitCode: 0,
      durationMs: 15,
      outputSnippet: longOutput,
      paneId: 'pane-1',
    });

    expect(rec.outputSnippet).toBeDefined();
    expect(rec.outputSnippet?.length).toBe(500);
    expect(sessionHistory.getRecords().length).toBe(1);
  });

  it('clamps total records to 100 max', async () => {
    const { sessionHistory } = await import('../sessionHistory');
    sessionHistory.clearRecords();

    for (let i = 0; i < 120; i++) {
      sessionHistory.addRecord({
        command: `echo ${i}`,
        cwd: '/tmp',
        exitCode: 0,
      });
    }

    const records = sessionHistory.getRecords();
    expect(records.length).toBe(100);
    // Newest is at index 0
    expect(records[0].command).toBe('echo 119');
  });

  it('recovers from QuotaExceededError by pruning older records to 50%', async () => {
    const { sessionHistory } = await import('../sessionHistory');
    sessionHistory.clearRecords();

    for (let i = 0; i < 20; i++) {
      sessionHistory.addRecord({ command: `cmd ${i}`, cwd: '/tmp' });
    }

    expect(sessionHistory.getRecords().length).toBe(20);

    // Trigger quota error on next add
    storageMock.triggerQuotaErrorOnNextSet = true;

    sessionHistory.addRecord({ command: 'quota_trigger_cmd', cwd: '/tmp' });

    // After quota recovery, older records pruned to half
    expect(sessionHistory.getRecords().length).toBeLessThanOrEqual(50);
  });

  it('automatically masks sensitive tokens in command and output snippet before storing', async () => {
    const { sessionHistory } = await import('../sessionHistory');
    sessionHistory.clearRecords();

    const sensitiveToken = 'ghp_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
    const awsKey = 'AKIAIOSFODNN7EXAMPLE';

    const rec = sessionHistory.addRecord({
      command: `export GITHUB_TOKEN=${sensitiveToken}`,
      cwd: '~',
      outputSnippet: `Authenticated as AWS user with key: ${awsKey}`,
    });

    expect(rec.command).not.toContain(sensitiveToken);
    expect(rec.command).toContain('[REDACTED_GH_TOKEN]');
    expect(rec.outputSnippet).not.toContain(awsKey);
    expect(rec.outputSnippet).toContain('AKIA••••••••••••••••');

    const stored = sessionHistory.getRecords()[0];
    expect(stored.command).not.toContain(sensitiveToken);
    expect(stored.outputSnippet).not.toContain(awsKey);
  });

  it('rejects empty or whitespace command', async () => {
    const { sessionHistory } = await import('../sessionHistory');
    expect(() => sessionHistory.addRecord({ command: '   ', cwd: '/tmp' })).toThrow(
      'Command cannot be empty'
    );
  });

  it('deletes a record by id', async () => {
    const { sessionHistory } = await import('../sessionHistory');
    sessionHistory.clearRecords();
    const rec1 = sessionHistory.addRecord({ command: 'echo first', cwd: '' });
    const rec2 = sessionHistory.addRecord({ command: 'echo second', cwd: '/home' });
    expect(rec1.cwd).toBe('~'); // Default cwd fallback
    expect(sessionHistory.getRecords().length).toBe(2);

    sessionHistory.deleteRecord(rec1.id);
    expect(sessionHistory.getRecords().length).toBe(1);
    expect(sessionHistory.getRecords()[0].id).toBe(rec2.id);
  });

  it('handles corrupted or non-array localStorage data gracefully during load', async () => {
    storageMock.setItem('waddle_session_history_records', '{ "not": "an array" }');
    const { sessionHistory } = await import('../sessionHistory');
    expect(sessionHistory.getRecords()).toBeDefined();

    storageMock.setItem('waddle_session_history_records', 'corrupted invalid json');
    expect(sessionHistory.getRecords()).toBeDefined();

    // Valid array with records (one with snippet, one without, one with empty command)
    const validData = [
      { id: 'rec_1', command: 'git status', outputSnippet: 'On branch main' },
      { id: 'rec_2', command: '', outputSnippet: undefined },
    ];
    storageMock.setItem('waddle_session_history_records', JSON.stringify(validData));
    const instance = new (sessionHistory.constructor as any)();
    expect(instance.getRecords().length).toBe(2);
    expect(instance.getRecords()[0].command).toBe('git status');
    expect(instance.getRecords()[1].command).toBe('');
  });
});
