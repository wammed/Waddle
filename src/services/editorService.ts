/**
 * Editor service utilities for soft tabs, quote/bracket auto-pairing,
 * plain-text (ReDoS-free) exact search/replace, autosave filename mapping,
 * and Undo/Redo history tracking.
 */

export const SOFT_TAB = '    '; // 4 spaces

export function pathToAutosaveFilename(canonicalPath: string): string {
  return canonicalPath.replace(/\//g, '%');
}

/**
 * Handle Tab and Shift+Tab key indentation.
 * - Soft tab: 4 spaces.
 * - Single-line without selection: insert 4 spaces at cursor.
 * - Multi-line selection: indent/unindent all selected lines by up to 4 spaces.
 */
export function handleTabIndentation(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  isShift: boolean
): { newContent: string; newStart: number; newEnd: number } {
  if (!isShift) {
    // Tab (Indent)
    if (selectionStart === selectionEnd) {
      // Single cursor: insert 4 spaces
      const newContent =
        content.slice(0, selectionStart) + SOFT_TAB + content.slice(selectionEnd);
      const newPos = selectionStart + SOFT_TAB.length;
      return { newContent, newStart: newPos, newEnd: newPos };
    } else {
      // Range selection: find lines to indent
      const lineStart = content.lastIndexOf('\n', selectionStart - 1) + 1;
      let lineEnd = content.indexOf('\n', selectionEnd);
      if (lineEnd === -1) lineEnd = content.length;

      const selectedBlock = content.slice(lineStart, lineEnd);
      const lines = selectedBlock.split('\n');
      const indentedLines = lines.map((l) => SOFT_TAB + l);
      const newBlock = indentedLines.join('\n');

      const newContent =
        content.slice(0, lineStart) + newBlock + content.slice(lineEnd);
      const addedChars = SOFT_TAB.length * lines.length;

      return {
        newContent,
        newStart: selectionStart + SOFT_TAB.length,
        newEnd: selectionEnd + addedChars,
      };
    }
  } else {
    // Shift+Tab (Unindent)
    const lineStart = content.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = content.indexOf('\n', selectionEnd);
    if (lineEnd === -1) lineEnd = content.length;

    const selectedBlock = content.slice(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');
    let removedCharsTotal = 0;
    let firstLineRemoved = 0;

    const unindentedLines = lines.map((line, idx) => {
      let removeCount = 0;
      for (let i = 0; i < Math.min(SOFT_TAB.length, line.length); i++) {
        if (line[i] === ' ') {
          removeCount++;
        } else {
          break;
        }
      }
      removedCharsTotal += removeCount;
      if (idx === 0) firstLineRemoved = removeCount;
      return line.slice(removeCount);
    });

    const newBlock = unindentedLines.join('\n');
    const newContent =
      content.slice(0, lineStart) + newBlock + content.slice(lineEnd);

    return {
      newContent,
      newStart: Math.max(lineStart, selectionStart - firstLineRemoved),
      newEnd: Math.max(lineStart, selectionEnd - removedCharsTotal),
    };
  }
}

/**
 * Auto-close brackets and quotes, with selection wrapping.
 * Supported: [, {, (, ", '
 */
const PAIRS: Record<string, string> = {
  '[': ']',
  '{': '}',
  '(': ')',
  '"': '"',
  "'": "'",
};

const CLOSING_CHARS = new Set([']', '}', ')', '"', "'"]);

export function handleAutoClosePair(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  char: string
): { newContent: string; newStart: number; newEnd: number; handled: boolean } {
  // Check if user is typing closing character directly before an identical closing character
  if (selectionStart === selectionEnd && CLOSING_CHARS.has(char)) {
    if (content[selectionStart] === char) {
      // Skip inserting duplicate closing character, advance cursor
      return {
        newContent: content,
        newStart: selectionStart + 1,
        newEnd: selectionStart + 1,
        handled: true,
      };
    }
  }

  const matchingClose = PAIRS[char];
  if (!matchingClose) {
    return { newContent: content, newStart: selectionStart, newEnd: selectionEnd, handled: false };
  }

  if (selectionStart !== selectionEnd) {
    // Wrap selection
    const selectedText = content.slice(selectionStart, selectionEnd);
    const newContent =
      content.slice(0, selectionStart) +
      char +
      selectedText +
      matchingClose +
      content.slice(selectionEnd);
    return {
      newContent,
      newStart: selectionStart + 1,
      newEnd: selectionEnd + 1,
      handled: true,
    };
  } else {
    // Insert pair and place cursor between them
    const newContent =
      content.slice(0, selectionStart) + char + matchingClose + content.slice(selectionEnd);
    return {
      newContent,
      newStart: selectionStart + 1,
      newEnd: selectionStart + 1,
      handled: true,
    };
  }
}

export interface TextMatch {
  start: number;
  end: number;
}

/**
 * Plain-text exact string matching (ReDoS 0% risk).
 * Completely avoids regular expressions.
 */
export function findExactMatches(
  content: string,
  query: string,
  caseSensitive = false
): TextMatch[] {
  if (!query || !content) return [];

  const matches: TextMatch[] = [];
  const src = caseSensitive ? content : content.toLowerCase();
  const q = caseSensitive ? query : query.toLowerCase();
  const qLen = q.length;

  let idx = 0;
  while (idx <= src.length - qLen) {
    const found = src.indexOf(q, idx);
    if (found === -1) break;
    matches.push({ start: found, end: found + qLen });
    idx = found + Math.max(1, qLen);
  }

  return matches;
}

/**
 * Replace single match in content.
 */
export function replaceSingleMatch(
  content: string,
  match: TextMatch,
  replacement: string
): { newContent: string; nextCursor: number } {
  const newContent =
    content.slice(0, match.start) + replacement + content.slice(match.end);
  const nextCursor = match.start + replacement.length;
  return { newContent, nextCursor };
}

/**
 * Replace all exact matches in content without Regex.
 */
export function replaceAllExactMatches(
  content: string,
  query: string,
  replacement: string,
  caseSensitive = false
): { newContent: string; count: number } {
  if (!query || !content) return { newContent: content, count: 0 };

  const matches = findExactMatches(content, query, caseSensitive);
  if (matches.length === 0) return { newContent: content, count: 0 };

  let result = '';
  let lastIndex = 0;

  for (const m of matches) {
    result += content.slice(lastIndex, m.start) + replacement;
    lastIndex = m.end;
  }
  result += content.slice(lastIndex);

  return { newContent: result, count: matches.length };
}

/**
 * Self-contained Undo/Redo stack manager with bounded history.
 */
export class EditorHistoryManager {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistory: number;

  constructor(initialContent = '', maxHistory = 100) {
    this.maxHistory = maxHistory;
    this.undoStack = [initialContent];
  }

  push(content: string): void {
    const last = this.undoStack[this.undoStack.length - 1];
    if (last === content) return;

    this.undoStack.push(content);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // clear redo on new change
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(currentContent: string): string | null {
    if (!this.canUndo()) return null;

    const current = this.undoStack.pop()!;
    this.redoStack.push(currentContent === current ? current : currentContent);

    const previous = this.undoStack[this.undoStack.length - 1];
    return previous;
  }

  redo(): string | null {
    if (!this.canRedo()) return null;

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    return next;
  }

  reset(initialContent: string): void {
    this.undoStack = [initialContent];
    this.redoStack = [];
  }
}

/**
 * AutosaveScheduler manages per-tab autosave timers with first-input start semantics:
 * - When an edit occurs, if no timer is running for the tab, a 120s timer starts (start = first input).
 * - Subsequent edits within that 120s window do NOT reset or extend the timer (unlike debounce).
 * - When the timer fires, the onSave callback is executed with the latest content.
 * - Once saved (or on manual Ctrl+S / tab close), the timer clears,
 *   so the next edit will start a new 120s countdown from that next first input.
 */
export class AutosaveScheduler {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private lastSavedContents: Map<string, string> = new Map();
  private intervalMs: number;

  constructor(intervalMs: number = 120 * 1000) {
    this.intervalMs = intervalMs;
  }

  /**
   * Schedule autosave starting from the FIRST input.
   * If a timer is already running for tabId, this call is a no-op (does NOT reset timer).
   * Returns true if a new timer was started, false if an existing timer is already running.
   */
  schedule(tabId: string, onSave: () => void | Promise<void>): boolean {
    if (this.timers.has(tabId)) {
      return false;
    }

    const timer = setTimeout(async () => {
      this.timers.delete(tabId);
      try {
        await onSave();
      } catch (err) {
        console.warn('Autosave callback execution failed:', err);
      }
    }, this.intervalMs);

    this.timers.set(tabId, timer);
    return true;
  }

  hasTimer(tabId: string): boolean {
    return this.timers.has(tabId);
  }

  cancel(tabId: string): void {
    const timer = this.timers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(tabId);
    }
  }

  clearAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.lastSavedContents.clear();
  }

  setLastSavedContent(tabId: string, content: string): void {
    this.lastSavedContents.set(tabId, content);
  }

  getLastSavedContent(tabId: string): string | undefined {
    return this.lastSavedContents.get(tabId);
  }

  removeTab(tabId: string): void {
    this.cancel(tabId);
    this.lastSavedContents.delete(tabId);
  }
}

/**
 * Handle Cut text from selection.
 * Returns cutText, newContent, and new cursor position.
 */
export function handleCutText(
  content: string,
  selectionStart: number,
  selectionEnd: number
): { cutText: string; newContent: string; newCursor: number } {
  if (selectionStart === selectionEnd) {
    return { cutText: '', newContent: content, newCursor: selectionStart };
  }
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const cutText = content.slice(start, end);
  const newContent = content.slice(0, start) + content.slice(end);
  return {
    cutText,
    newContent,
    newCursor: start,
  };
}

/**
 * Handle Paste text at cursor or replacing selection.
 * Returns newContent and new cursor position (at the end of inserted text).
 */
export function handlePasteText(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  textToPaste: string
): { newContent: string; newCursor: number } {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const newContent = content.slice(0, start) + textToPaste + content.slice(end);
  const newCursor = start + textToPaste.length;
  return {
    newContent,
    newCursor,
  };
}

