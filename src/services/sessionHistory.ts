import { SessionCommandRecord } from '../types';

const STORAGE_KEY = 'waddle_session_history_records';
const MAX_RECORDS = 100;
const MAX_SNIPPET_LEN = 500;

class SessionHistoryManager {
  private records: SessionCommandRecord[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Clamp records count and sanitize snippet length for existing legacy data
          this.records = parsed.slice(0, MAX_RECORDS).map((rec: SessionCommandRecord) => ({
            ...rec,
            outputSnippet: rec.outputSnippet ? rec.outputSnippet.slice(0, MAX_SNIPPET_LEN) : undefined,
          }));
        }
      }
    } catch {
      this.records = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records.slice(0, MAX_RECORDS)));
      window.dispatchEvent(new CustomEvent('waddle-session-history-updated'));
    } catch (e: any) {
      console.warn('Failed to save session command history, attempting quota recovery:', e);
      try {
        // In case of QuotaExceededError, prune older records to half capacity
        this.records = this.records.slice(0, Math.floor(MAX_RECORDS / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
        window.dispatchEvent(new CustomEvent('waddle-session-history-updated'));
      } catch (retryErr) {
        console.error('Failed to save session history even after pruning:', retryErr);
      }
    }
  }

  public getRecords(): SessionCommandRecord[] {
    return [...this.records];
  }

  public addRecord(item: {
    command: string;
    cwd: string;
    exitCode?: number;
    durationMs?: number;
    outputSnippet?: string;
    paneId?: string;
  }): SessionCommandRecord {
    const cmd = item.command.trim();
    if (!cmd) {
      throw new Error('Command cannot be empty');
    }

    const record: SessionCommandRecord = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      command: cmd,
      cwd: item.cwd || '~',
      timestamp: Date.now(),
      exitCode: item.exitCode,
      durationMs: item.durationMs,
      outputSnippet: item.outputSnippet ? item.outputSnippet.slice(0, MAX_SNIPPET_LEN) : undefined,
      paneId: item.paneId,
    };

    // Insert at front (newest first)
    this.records.unshift(record);
    if (this.records.length > MAX_RECORDS) {
      this.records.length = MAX_RECORDS;
    }
    this.save();
    return record;
  }

  public deleteRecord(id: string): void {
    this.records = this.records.filter((r) => r.id !== id);
    this.save();
  }

  public clearRecords(): void {
    this.records = [];
    this.save();
  }
}

export const sessionHistory = new SessionHistoryManager();
