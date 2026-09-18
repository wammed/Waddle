import { describe, it, expect, vi } from 'vitest';
import {
  pathToAutosaveFilename,
  handleTabIndentation,
  handleAutoClosePair,
  findExactMatches,
  replaceSingleMatch,
  replaceAllExactMatches,
  EditorHistoryManager,
  AutosaveScheduler,
} from '../editorService';

describe('editorService', () => {
  describe('pathToAutosaveFilename', () => {
    it('escapes slashes to percent characters', () => {
      const canonical = '/home/user/.config/fish/config.fish';
      expect(pathToAutosaveFilename(canonical)).toBe('%home%user%.config%fish%config.fish');
    });

    it('handles root or shallow paths', () => {
      expect(pathToAutosaveFilename('/etc/hosts')).toBe('%etc%hosts');
    });
  });

  describe('handleTabIndentation', () => {
    it('inserts 4 spaces when no text is selected', () => {
      const content = 'echo';
      const res = handleTabIndentation(content, 4, 4, false);
      expect(res.newContent).toBe('echo    ');
      expect(res.newStart).toBe(8);
      expect(res.newEnd).toBe(8);
    });

    it('indents multiple lines by 4 spaces on Tab', () => {
      const content = 'line 1\nline 2\nline 3';
      // select from line 1 to line 2
      const res = handleTabIndentation(content, 2, 9, false);
      expect(res.newContent).toBe('    line 1\n    line 2\nline 3');
    });

    it('unindents multiple lines by up to 4 spaces on Shift+Tab', () => {
      const content = '    line 1\n  line 2\nline 3';
      const res = handleTabIndentation(content, 4, 15, true);
      expect(res.newContent).toBe('line 1\nline 2\nline 3');
    });
  });

  describe('handleAutoClosePair', () => {
    it('auto-inserts closing brackets and positions cursor in-between', () => {
      const content = 'const a = ';
      const res = handleAutoClosePair(content, 10, 10, '[');
      expect(res.handled).toBe(true);
      expect(res.newContent).toBe('const a = []');
      expect(res.newStart).toBe(11);
      expect(res.newEnd).toBe(11);
    });

    it('auto-inserts closing quotes and positions cursor in-between', () => {
      const content = 'name: ';
      const res = handleAutoClosePair(content, 6, 6, '"');
      expect(res.handled).toBe(true);
      expect(res.newContent).toBe('name: ""');
      expect(res.newStart).toBe(7);
      expect(res.newEnd).toBe(7);
    });

    it('wraps selected text in brackets', () => {
      const content = 'foo bar baz';
      // select "bar" (index 4 to 7)
      const res = handleAutoClosePair(content, 4, 7, '{');
      expect(res.handled).toBe(true);
      expect(res.newContent).toBe('foo {bar} baz');
      expect(res.newStart).toBe(5);
      expect(res.newEnd).toBe(8);
    });

    it('skips inserting duplicate closing character when typed before one', () => {
      const content = 'const a = []';
      // cursor is at index 11 (right before ']')
      const res = handleAutoClosePair(content, 11, 11, ']');
      expect(res.handled).toBe(true);
      expect(res.newContent).toBe('const a = []'); // no duplicate
      expect(res.newStart).toBe(12); // advances past ']'
    });

    it('returns handled: false for non-bracket characters', () => {
      const content = 'hello';
      const res = handleAutoClosePair(content, 2, 2, 'x');
      expect(res.handled).toBe(false);
      expect(res.newContent).toBe('hello');
    });
  });

  describe('findExactMatches (ReDoS-free)', () => {
    it('finds exact matches case-insensitively by default', () => {
      const content = 'Foo bar FOO baz foo';
      const matches = findExactMatches(content, 'foo', false);
      expect(matches.length).toBe(3);
      expect(matches[0]).toEqual({ start: 0, end: 3 });
      expect(matches[1]).toEqual({ start: 8, end: 11 });
      expect(matches[2]).toEqual({ start: 16, end: 19 });
    });

    it('finds exact matches case-sensitively when requested', () => {
      const content = 'Foo bar FOO baz foo';
      const matches = findExactMatches(content, 'foo', true);
      expect(matches.length).toBe(1);
      expect(matches[0]).toEqual({ start: 16, end: 19 });
    });

    it('handles special regex characters safely as plain text', () => {
      const content = 'price is $10.00 (discount? [yes/no]) *.*';
      const matches = findExactMatches(content, '$10.00 (discount? [yes/no]) *.*', true);
      expect(matches.length).toBe(1);
      expect(matches[0].start).toBe(9);
    });

    it('returns empty array when query is empty', () => {
      expect(findExactMatches('sample text', '', false)).toEqual([]);
    });
  });

  describe('replaceSingleMatch and replaceAllExactMatches', () => {
    it('replaces a single match and returns updated cursor position', () => {
      const content = 'Hello world, hello everyone';
      const match = { start: 6, end: 11 }; // "world"
      const res = replaceSingleMatch(content, match, 'Waddle');
      expect(res.newContent).toBe('Hello Waddle, hello everyone');
      expect(res.nextCursor).toBe(12);
    });

    it('replaces all matches correctly', () => {
      const content = 'apple orange apple banana APPLE';
      const res = replaceAllExactMatches(content, 'apple', 'pear', false);
      expect(res.count).toBe(3);
      expect(res.newContent).toBe('pear orange pear banana pear');
    });
  });

  describe('EditorHistoryManager (Undo/Redo)', () => {
    it('manages undo and redo states with bounded history', () => {
      const history = new EditorHistoryManager('v1', 5);
      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);

      history.push('v2');
      history.push('v3');
      expect(history.canUndo()).toBe(true);

      const undov2 = history.undo('v3');
      expect(undov2).toBe('v2');
      expect(history.canRedo()).toBe(true);

      const undov1 = history.undo('v2');
      expect(undov1).toBe('v1');
      expect(history.canUndo()).toBe(false);

      const redov2 = history.redo();
      expect(redov2).toBe('v2');

      const redov3 = history.redo();
      expect(redov3).toBe('v3');
      expect(history.canRedo()).toBe(false);
    });

    it('clears redo stack upon new push', () => {
      const history = new EditorHistoryManager('v1');
      history.push('v2');
      history.undo('v2');
      expect(history.canRedo()).toBe(true);

      history.push('v2_branch');
      expect(history.canRedo()).toBe(false);
    });
  });

  describe('AutosaveScheduler', () => {
    it('starts timer on first input and fires after 120s', () => {
      vi.useFakeTimers();
      const scheduler = new AutosaveScheduler(120 * 1000);
      const onSave = vi.fn();

      const started = scheduler.schedule('tab-1', onSave);
      expect(started).toBe(true);
      expect(scheduler.hasTimer('tab-1')).toBe(true);

      vi.advanceTimersByTime(119 * 1000);
      expect(onSave).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(scheduler.hasTimer('tab-1')).toBe(false);

      vi.useRealTimers();
    });

    it('does NOT reset or delay timer on subsequent inputs within the 120s window (first-input anchor)', () => {
      vi.useFakeTimers();
      const scheduler = new AutosaveScheduler(120 * 1000);
      const onSave = vi.fn();

      // First input at t=0s
      expect(scheduler.schedule('tab-1', onSave)).toBe(true);

      // Subsequent inputs at t=30s, 60s, 90s, 110s must NOT reset timer
      vi.advanceTimersByTime(30 * 1000);
      expect(scheduler.schedule('tab-1', onSave)).toBe(false);

      vi.advanceTimersByTime(30 * 1000);
      expect(scheduler.schedule('tab-1', onSave)).toBe(false);

      vi.advanceTimersByTime(30 * 1000);
      expect(scheduler.schedule('tab-1', onSave)).toBe(false);

      vi.advanceTimersByTime(20 * 1000);
      expect(scheduler.schedule('tab-1', onSave)).toBe(false);

      // Total time elapsed: 110s. onSave must not have fired yet.
      expect(onSave).not.toHaveBeenCalled();

      // Advance remaining 10s (total 120s from FIRST input at t=0s)
      vi.advanceTimersByTime(10 * 1000);
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(scheduler.hasTimer('tab-1')).toBe(false);

      vi.useRealTimers();
    });

    it('starts a new 120s cycle from the first input of the next session', () => {
      vi.useFakeTimers();
      const scheduler = new AutosaveScheduler(120 * 1000);
      const onSave1 = vi.fn();
      const onSave2 = vi.fn();

      // Cycle 1
      scheduler.schedule('tab-1', onSave1);
      vi.advanceTimersByTime(120 * 1000);
      expect(onSave1).toHaveBeenCalledTimes(1);

      // User pauses, then types again at t=150s (this is the new first input)
      vi.advanceTimersByTime(30 * 1000);
      expect(scheduler.schedule('tab-1', onSave2)).toBe(true);

      // 60s later (t=210s)
      vi.advanceTimersByTime(60 * 1000);
      expect(onSave2).not.toHaveBeenCalled();

      // 60s later (total 120s from second first input)
      vi.advanceTimersByTime(60 * 1000);
      expect(onSave2).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('cancels timer on manual save or tab close', () => {
      vi.useFakeTimers();
      const scheduler = new AutosaveScheduler(120 * 1000);
      const onSave = vi.fn();

      scheduler.schedule('tab-1', onSave);
      expect(scheduler.hasTimer('tab-1')).toBe(true);

      scheduler.cancel('tab-1');
      expect(scheduler.hasTimer('tab-1')).toBe(false);

      vi.advanceTimersByTime(120 * 1000);
      expect(onSave).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('tracks and manages last saved content per tab', () => {
      const scheduler = new AutosaveScheduler();
      expect(scheduler.getLastSavedContent('tab-1')).toBeUndefined();

      scheduler.setLastSavedContent('tab-1', 'hello world');
      expect(scheduler.getLastSavedContent('tab-1')).toBe('hello world');

      scheduler.removeTab('tab-1');
      expect(scheduler.getLastSavedContent('tab-1')).toBeUndefined();
    });
  });

  describe('shell configuration files warning and editability', () => {
    it('propagates warning_message and maintains isReadOnly = false for shell config files', () => {
      // Simulated EditorOpenResult from Rust backend
      const shellOpenResult = {
        content: 'export PATH="$HOME/.local/bin:$PATH"\n',
        original_path: '/home/user/.bashrc',
        canonical_path: '/home/user/.bashrc',
        is_symlink: false,
        is_readonly: false,
        readonly_reason: null,
        warning_message: '⚠️ シェル設定ファイルです。構文ミスによりシェル起動に影響が出る恐れがあります（自動バックアップ有効）。',
        has_autosave: false,
        autosave_content: null,
        autosave_timestamp: null,
      };

      // Tab mapping as performed in EditorPane handleOpenFile
      const tab = {
        id: 'tab-shell-1',
        filePath: shellOpenResult.original_path,
        canonicalPath: shellOpenResult.canonical_path,
        fileName: '.bashrc',
        content: shellOpenResult.content,
        savedContent: shellOpenResult.content,
        isDirty: false,
        isReadOnly: shellOpenResult.is_readonly,
        readOnlyReason: shellOpenResult.readonly_reason,
        warningMessage: shellOpenResult.warning_message,
        isSymlink: shellOpenResult.is_symlink,
        undoStack: [shellOpenResult.content],
        redoStack: [],
        cursorPosition: 0,
        scrollTop: 0,
        scrollLeft: 0,
      };

      expect(tab.warningMessage).toBe(
        '⚠️ シェル設定ファイルです。構文ミスによりシェル起動に影響が出る恐れがあります（自動バックアップ有効）。'
      );
      expect(tab.isReadOnly).toBe(false);

      // Verify that save is NOT blocked for shell config files
      const canSave = !tab.isReadOnly;
      expect(canSave).toBe(true);
    });

    it('blocks save when file is genuinely read-only (outside $HOME or non-owner)', () => {
      const readonlyResult = {
        content: 'root:x:0:0:root:/root:/bin/bash\n',
        original_path: '/etc/passwd',
        canonical_path: '/etc/passwd',
        is_symlink: false,
        is_readonly: true,
        readonly_reason: '[保存不可] このファイルは $HOME ディレクトリ外にあるため、閲覧専用（Read-Only）です。',
        warning_message: null,
        has_autosave: false,
        autosave_content: null,
        autosave_timestamp: null,
      };

      const tab = {
        id: 'tab-readonly-1',
        filePath: readonlyResult.original_path,
        canonicalPath: readonlyResult.canonical_path,
        fileName: 'passwd',
        content: readonlyResult.content,
        savedContent: readonlyResult.content,
        isDirty: false,
        isReadOnly: readonlyResult.is_readonly,
        readOnlyReason: readonlyResult.readonly_reason,
        warningMessage: readonlyResult.warning_message,
        isSymlink: readonlyResult.is_symlink,
        undoStack: [readonlyResult.content],
        redoStack: [],
        cursorPosition: 0,
        scrollTop: 0,
        scrollLeft: 0,
      };

      expect(tab.warningMessage).toBeNull();
      expect(tab.isReadOnly).toBe(true);

      const canSave = !tab.isReadOnly;
      expect(canSave).toBe(false);
    });
  });
});

