import { SessionCommandRecord } from '../types';

const STORAGE_KEY = 'waddle_session_history_records';
const MAX_RECORDS = 200;

class SessionHistoryManager {
  private records: SessionCommandRecord[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.records = JSON.parse(raw);
      }
    } catch {
      this.records = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records.slice(0, MAX_RECORDS)));
      window.dispatchEvent(new CustomEvent('waddle-session-history-updated'));
    } catch (e) {
      console.warn('Failed to save session command history:', e);
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
      outputSnippet: item.outputSnippet ? item.outputSnippet.slice(0, 1000) : undefined,
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
