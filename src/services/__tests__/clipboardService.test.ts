import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeClipboardText, readClipboardText } from '../clipboardService';

describe('clipboardService', () => {
  const originalClipboard = (globalThis as any).navigator?.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalClipboard !== undefined) {
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
        writable: true,
      });
    }
  });

  describe('writeClipboardText', () => {
    it('returns true on empty string without doing anything', async () => {
      const res = await writeClipboardText('');
      expect(res).toBe(true);
    });

    it('uses navigator.clipboard.writeText when available', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      if (!globalThis.navigator) {
        (globalThis as any).navigator = {};
      }
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: { writeText: writeTextMock, readText: vi.fn() },
        configurable: true,
        writable: true,
      });

      const res = await writeClipboardText('hello world');
      expect(res).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('hello world');
    });

    it('falls back to execCommand if navigator.clipboard.writeText rejects', async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
      if (!globalThis.navigator) {
        (globalThis as any).navigator = {};
      }
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: { writeText: writeTextMock, readText: vi.fn() },
        configurable: true,
        writable: true,
      });

      const execCommandMock = vi.fn().mockReturnValue(true);
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();
      const mockTextArea = {
        value: '',
        style: {},
        focus: vi.fn(),
        select: vi.fn(),
      };

      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue(mockTextArea),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: execCommandMock,
      };

      try {
        const res = await writeClipboardText('fallback text');
        expect(res).toBe(true);
        expect(execCommandMock).toHaveBeenCalledWith('copy');
      } finally {
        delete (globalThis as any).document;
      }
    });
  });

  describe('readClipboardText', () => {
    it('reads text from navigator.clipboard.readText when available', async () => {
      const readTextMock = vi.fn().mockResolvedValue('clipboard content');
      if (!globalThis.navigator) {
        (globalThis as any).navigator = {};
      }
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: { writeText: vi.fn(), readText: readTextMock },
        configurable: true,
        writable: true,
      });

      const text = await readClipboardText();
      expect(text).toBe('clipboard content');
      expect(readTextMock).toHaveBeenCalled();
    });

    it('returns empty string if navigator.clipboard.readText rejects', async () => {
      const readTextMock = vi.fn().mockRejectedValue(new Error('Not allowed'));
      if (!globalThis.navigator) {
        (globalThis as any).navigator = {};
      }
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: { writeText: vi.fn(), readText: readTextMock },
        configurable: true,
        writable: true,
      });

      const text = await readClipboardText();
      expect(text).toBe('');
    });
  });
});
