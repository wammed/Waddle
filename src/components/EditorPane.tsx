import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileCode,
  Save,
  Play,
  Sparkles,
  FolderOpen,
  X,
  Loader2,
  RefreshCw,
  Eye,
  Plus,
  Search,
  Replace,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lock,
  ShieldAlert,
  EyeOff,
  RotateCcw,
  Copy,
  Scissors,
  Clipboard,
  CheckSquare,
} from 'lucide-react';
import { AppConfig, TerminalContext, EditorTab, AutosaveEntry } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';
import { DangerousCommandModal, isDangerousCommand } from './DangerousCommandModal';
import { EditorWarningBanner } from './EditorWarningBanner';
import { findSecretRanges, type SecretRange } from '../services/secretMasker';
import {
  handleTabIndentation,
  handleAutoClosePair,
  handleCutText,
  handlePasteText,
  findExactMatches,
  replaceSingleMatch,
  replaceAllExactMatches,
  EditorHistoryManager,
  AutosaveScheduler,
  TextMatch,
} from '../services/editorService';
import { writeClipboardText, readClipboardText } from '../services/clipboardService';

import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

const MAX_TABS = 5;
const AUTOSAVE_INTERVAL_MS = 120 * 1000; // 120 seconds
const DEBOUNCE_TYPING_MS = 400; // 400ms debounce merge for undo stack

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatRelativeTime(timestampMs: number, lang: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 60) {
    return lang === 'ja' ? `${diffSec}秒前` : `${diffSec}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return lang === 'ja' ? `${diffMin}分前` : `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return lang === 'ja' ? `${diffHours}時間前` : `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return lang === 'ja' ? `${diffDays}日前` : `${diffDays}d ago`;
}

function formatDateTime(timestampMs: number): string {
  const d = new Date(timestampMs);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getGrammarForFile(filename: string): { grammar: Prism.Grammar; lang: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return { grammar: Prism.languages.typescript, lang: 'typescript' };
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return { grammar: Prism.languages.javascript, lang: 'javascript' };
    case 'rs':
      return { grammar: Prism.languages.rust, lang: 'rust' };
    case 'py':
      return { grammar: Prism.languages.python, lang: 'python' };
    case 'sh':
    case 'bash':
    case 'zsh':
      return { grammar: Prism.languages.bash, lang: 'bash' };
    case 'json':
      return { grammar: Prism.languages.json, lang: 'json' };
    case 'md':
    case 'markdown':
      return { grammar: Prism.languages.markdown, lang: 'markdown' };
    case 'css':
      return { grammar: Prism.languages.css, lang: 'css' };
    case 'html':
    case 'htm':
      return { grammar: Prism.languages.html, lang: 'html' };
    case 'yaml':
    case 'yml':
      return { grammar: Prism.languages.yaml, lang: 'yaml' };
    case 'toml':
      return { grammar: Prism.languages.toml, lang: 'toml' };
    case 'c':
    case 'h':
      return { grammar: Prism.languages.c, lang: 'c' };
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
      return { grammar: Prism.languages.cpp, lang: 'cpp' };
    default:
      return { grammar: Prism.languages.javascript || Prism.languages.clike, lang: 'clike' };
  }
}

function highlightSyntax(code: string, filename: string): string {
  if (!code) return '';
  try {
    const { grammar, lang } = getGrammarForFile(filename);
    if (grammar) {
      return Prism.highlight(code, grammar, lang);
    }
  } catch (err) {
    console.warn('Prism highlight error:', err);
  }
  return escapeHtml(code);
}

interface ToastMessage {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  text: string;
}

interface EditorPaneProps {
  isOpen: boolean;
  onClose: () => void;
  cwd: string;
  config: AppConfig;
  context: TerminalContext;
  onExecuteInTerminal: (command: string, confirmed?: boolean) => void;
  onInsertInTerminal?: (command: string) => void;
  targetFilePath?: string | null;
  onRichPreview?: (filePath: string, fileName: string, content: string) => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  isOpen,
  onClose,
  cwd,
  config,
  context,
  onExecuteInTerminal,
  onInsertInTerminal,
  targetFilePath,
  onRichPreview,
}) => {
  const { t, language } = useI18n();

  // Tabs management
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Quick Open path input
  const [quickPathInput, setQuickPathInput] = useState('');
  const [dirFiles, setDirFiles] = useState<string[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Search & Replace state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Secret Masking state
  const [isSecretMaskingActive, setIsSecretMaskingActive] = useState(true);

  // AutoSave restore history state
  const [autosaveHistory, setAutosaveHistory] = useState<AutosaveEntry[]>([]);
  const [isRestorePopoverOpen, setIsRestorePopoverOpen] = useState(false);
  const restorePopoverRef = useRef<HTMLDivElement>(null);

  // Dialogs & Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showMaxTabsModal, setShowMaxTabsModal] = useState(false);
  const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null);
  const [confirmCloseAllDirty, setConfirmCloseAllDirty] = useState(false);
  const [recoveryData, setRecoveryData] = useState<{
    tabId: string;
    path: string;
    content: string;
  } | null>(null);

  // AI Edit popup & Dangerous command confirmation
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [confirmDangerousCmd, setConfirmDangerousCmd] = useState<string | null>(null);

  // DOM Refs
  const editorContainerRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const searchOverlayRef = useRef<HTMLPreElement>(null);
  const secretOverlayRef = useRef<HTMLPreElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo managers per tab
  const historyManagersRef = useRef<Map<string, EditorHistoryManager>>(new Map());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveSchedulerRef = useRef<AutosaveScheduler>(new AutosaveScheduler(AUTOSAVE_INTERVAL_MS));

  // Show a toast message with auto-dismiss
  const showToast = useCallback((text: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  // Active tab helper
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      autosaveSchedulerRef.current.clearAll();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Load directory files for selector
  const loadDirectoryFiles = useCallback(async () => {
    if (cwd) {
      try {
        const files = await TauriApi.listDirectoryFiles(cwd);
        setDirFiles(files);
      } catch (err) {
        console.warn('Failed to list files:', err);
      }
    }
  }, [cwd]);

  useEffect(() => {
    if (isOpen) {
      loadDirectoryFiles();
    }
  }, [isOpen, loadDirectoryFiles]);

  // Open target file passed from props
  useEffect(() => {
    if (targetFilePath && isOpen) {
      handleOpenFile(targetFilePath);
    }
  }, [targetFilePath, isOpen]);

  // Sync scroll between textarea, line numbers, and syntax highlight layer
  const handleScroll = () => {
    if (textareaRef.current) {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop;
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      if (searchOverlayRef.current) {
        searchOverlayRef.current.scrollTop = textareaRef.current.scrollTop;
        searchOverlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      if (secretOverlayRef.current) {
        secretOverlayRef.current.scrollTop = textareaRef.current.scrollTop;
        secretOverlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    }
  };

  // Switch to or create a new empty tab
  const handleNewTab = () => {
    if (tabs.length >= MAX_TABS) {
      setShowMaxTabsModal(true);
      return;
    }
    const newId = 'tab_' + Date.now();
    const defaultName = `untitled-${tabs.length + 1}.sh`;
    const fullPath = `${cwd.replace(/\/$/, '')}/${defaultName}`;

    const newTab: EditorTab = {
      id: newId,
      filePath: fullPath,
      canonicalPath: fullPath,
      fileName: defaultName,
      content: '',
      savedContent: '',
      isDirty: false,
      isReadOnly: false,
      readOnlyReason: null,
      isSymlink: false,
      undoStack: [''],
      redoStack: [],
      cursorPosition: 0,
      scrollTop: 0,
      scrollLeft: 0,
    };

    historyManagersRef.current.set(newId, new EditorHistoryManager(''));
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Open file with comprehensive backend verification
  const handleOpenFile = async (name: string) => {
    const fullPath = name.startsWith('/') ? name : `${cwd.replace(/\/$/, '')}/${name}`;

    // Check if file is already open in an existing tab
    const existing = tabs.find(
      (t) => t.filePath === fullPath || t.canonicalPath === fullPath
    );
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    // Hard limit check (max 5 tabs)
    if (tabs.length >= MAX_TABS) {
      setShowMaxTabsModal(true);
      return;
    }

    setIsLoadingFile(true);
    try {
      const res = await TauriApi.editorOpenFile(fullPath);
      const tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const fileName = fullPath.split('/').pop() || 'file';

      const newTab: EditorTab = {
        id: tabId,
        filePath: fullPath,
        canonicalPath: res.canonical_path,
        fileName,
        content: res.content,
        savedContent: res.content,
        isDirty: false,
        isReadOnly: res.is_readonly,
        readOnlyReason: res.readonly_reason,
        warningMessage: res.warning_message,
        isSymlink: res.is_symlink,
        undoStack: [res.content],
        redoStack: [],
        cursorPosition: 0,
        scrollTop: 0,
        scrollLeft: 0,
      };

      historyManagersRef.current.set(tabId, new EditorHistoryManager(res.content));
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(tabId);
      setQuickPathInput('');

      // If readonly with reason, show warning toast
      if (res.is_readonly && res.readonly_reason) {
        showToast(res.readonly_reason, 'warning');
      }

      // Check if uncommitted autosave backup was detected
      if (res.has_autosave && res.autosave_content) {
        setRecoveryData({
          tabId,
          path: res.canonical_path,
          content: res.autosave_content,
        });
      }
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || String(err);
      showToast(msg, 'error');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Recovery confirmation: Restore
  const handleConfirmRecovery = () => {
    if (!recoveryData) return;
    const { tabId, content } = recoveryData;
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              content,
              isDirty: true,
            }
          : tab
      )
    );
    const hist = historyManagersRef.current.get(tabId);
    if (hist) {
      hist.push(content);
    }
    showToast('前回の未保存バックアップデータを復元しました', 'info');
    setRecoveryData(null);
  };

  // Recovery confirmation: Discard (retain history snapshots for manual restore)
  const handleDiscardRecovery = () => {
    setRecoveryData(null);
  };

  // Fetch autosave history for a given canonical path
  const fetchAutosaveHistory = useCallback(async (canonicalPath?: string) => {
    const targetPath = canonicalPath || activeTab?.canonicalPath;
    if (!targetPath) {
      setAutosaveHistory([]);
      return;
    }
    try {
      const history = await TauriApi.editorGetAutosaveHistory(targetPath);
      setAutosaveHistory(history);
    } catch (err) {
      console.warn('Failed to fetch autosave history:', err);
      setAutosaveHistory([]);
    }
  }, [activeTab?.canonicalPath]);

  // Sync autosave history when activeTab changes
  useEffect(() => {
    if (activeTab?.canonicalPath) {
      fetchAutosaveHistory(activeTab.canonicalPath);
    } else {
      setAutosaveHistory([]);
      setIsRestorePopoverOpen(false);
    }
  }, [activeTab?.canonicalPath, fetchAutosaveHistory]);

  // Close restore popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isRestorePopoverOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (restorePopoverRef.current && !restorePopoverRef.current.contains(e.target as Node)) {
        setIsRestorePopoverOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRestorePopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRestorePopoverOpen]);

  // Restore a historical autosave snapshot
  const handleRestoreSnapshot = async (entry: AutosaveEntry) => {
    if (!activeTab || activeTab.isReadOnly) return;

    try {
      const content = await TauriApi.editorLoadAutosaveContent(entry.id);

      // Save current content to undo stack so user can Ctrl+Z if needed
      let hist = historyManagersRef.current.get(activeTab.id);
      if (!hist) {
        hist = new EditorHistoryManager();
        historyManagersRef.current.set(activeTab.id, hist);
      }
      hist.push(activeTab.content);

      // Apply snapshot to tab and mark dirty
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                content,
                isDirty: true,
              }
            : t
        )
      );

      setIsRestorePopoverOpen(false);
      showToast(t.editor.restoreSuccessToast(formatDateTime(entry.timestamp)), 'info');
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || String(err);
      showToast(msg, 'error');
    }
  };

  // AutoSave scheduling (120s timer from the FIRST input, recurring every 120s while dirty)
  const scheduleAutoSave = useCallback((tabId: string, canonicalPath: string) => {
    if (config.editor?.autosave === false) return;
    if (!canonicalPath) return;

    // If a 120s timer is already ticking for this tab from its first input, do NOT reset it!
    autosaveSchedulerRef.current.schedule(tabId, async () => {
      const targetTab = tabsRef.current.find((t) => t.id === tabId);
      if (!targetTab || !targetTab.isDirty) return;

      // Skip saving if buffer content has not changed since last autosave
      const lastSaved = autosaveSchedulerRef.current.getLastSavedContent(tabId);
      if (lastSaved !== undefined && lastSaved === targetTab.content) return;

      try {
        await TauriApi.editorSaveAutosave(targetTab.canonicalPath, targetTab.content);
        autosaveSchedulerRef.current.setLastSavedContent(tabId, targetTab.content);
        if (targetTab.canonicalPath) {
          fetchAutosaveHistory(targetTab.canonicalPath);
        }
      } catch (err) {
        console.warn('AutoSave cache write failed:', err);
      }
    });
  }, [config.editor?.autosave, fetchAutosaveHistory]);

  // Update content of active tab with debounced history push
  const updateActiveTabContent = useCallback((newContent: string) => {
    if (!activeTab || activeTab.isReadOnly) return;

    const tabId = activeTab.id;
    const canonicalPath = activeTab.canonicalPath;
    const isNowDirty = newContent !== activeTab.savedContent;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
              ...t,
              content: newContent,
              isDirty: isNowDirty,
            }
          : t
      )
    );

    // Schedule 120s AutoSave from the first input if dirty; cancel if clean
    if (isNowDirty) {
      scheduleAutoSave(tabId, canonicalPath);
    } else {
      autosaveSchedulerRef.current.cancel(tabId);
    }

    // Debounce undo history push
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const hist = historyManagersRef.current.get(tabId);
      if (hist) {
        hist.push(newContent);
      }
    }, DEBOUNCE_TYPING_MS);
  }, [activeTab, scheduleAutoSave]);

  // Push immediate snapshot to history (bypassing debounce)
  const pushImmediateHistory = useCallback((tabId: string, content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const hist = historyManagersRef.current.get(tabId);
    if (hist) {
      hist.push(content);
    }
  }, []);

  // Save current active tab
  const handleSaveActiveTab = async () => {
    if (!activeTab || activeTab.isReadOnly) return;

    try {
      const res = await TauriApi.editorSaveFile(activeTab.filePath, activeTab.content);

      // Clear autosave timer and update last saved content
      autosaveSchedulerRef.current.cancel(activeTab.id);
      autosaveSchedulerRef.current.setLastSavedContent(activeTab.id, activeTab.content);

      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                savedContent: t.content,
                isDirty: false,
                canonicalPath: res.saved_path,
                isSymlink: res.is_symlink,
              }
            : t
        )
      );

      if (res.message) {
        showToast(res.message, 'warning');
      } else {
        showToast(t.common.saved || '保存しました', 'success');
      }

      loadDirectoryFiles();
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || String(err);
      showToast(msg, 'error');
    }
  };

  // Close a specific tab
  const handleRequestCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (!tabToClose) return;

    if (tabToClose.isDirty) {
      setConfirmCloseTabId(tabId);
    } else {
      executeCloseTab(tabId);
    }
  };

  // Execute tab closing after confirmation or if clean
  const executeCloseTab = (tabId: string) => {
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (tabToClose) {
      // Clear timers
      autosaveSchedulerRef.current.removeTab(tabId);
      historyManagersRef.current.delete(tabId);
    }

    setTabs((prev) => {
      const nextTabs = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        if (nextTabs.length > 0) {
          setActiveTabId(nextTabs[nextTabs.length - 1].id);
        } else {
          setActiveTabId('');
        }
      }
      return nextTabs;
    });
    setConfirmCloseTabId(null);
  };

  // Attempt to close entire editor
  const handleAttemptCloseEditor = () => {
    const hasDirtyTabs = tabs.some((t) => t.isDirty);
    if (hasDirtyTabs) {
      setConfirmCloseAllDirty(true);
    } else {
      onClose();
    }
  };

  // Confirm close all dirty tabs & editor
  const handleConfirmCloseAll = () => {
    autosaveSchedulerRef.current.clearAll();
    for (const tab of tabs) {
      historyManagersRef.current.delete(tab.id);
    }
    setConfirmCloseAllDirty(false);
    onClose();
  };

  // Undo / Redo
  const handleUndo = () => {
    if (!activeTab || activeTab.isReadOnly) return;
    const hist = historyManagersRef.current.get(activeTab.id);
    if (!hist || !hist.canUndo()) return;

    const prevContent = hist.undo(activeTab.content);
    if (prevContent !== null) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                content: prevContent,
                isDirty: prevContent !== t.savedContent,
              }
            : t
        )
      );
    }
  };

  const handleRedo = () => {
    if (!activeTab || activeTab.isReadOnly) return;
    const hist = historyManagersRef.current.get(activeTab.id);
    if (!hist || !hist.canRedo()) return;

    const nextContent = hist.redo();
    if (nextContent !== null) {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTab.id
            ? {
                ...t,
                content: nextContent,
                isDirty: nextContent !== t.savedContent,
              }
            : t
        )
      );
    }
  };

  // Search & Replace logic (ReDoS-free exact string search)
  const matches: TextMatch[] = React.useMemo(() => {
    if (!activeTab || !searchQuery) return [];
    return findExactMatches(activeTab.content, searchQuery, caseSensitive);
  }, [activeTab?.content, searchQuery, caseSensitive]);

  useEffect(() => {
    if (matches.length === 0) {
      setCurrentMatchIdx(0);
    } else if (currentMatchIdx >= matches.length) {
      setCurrentMatchIdx(matches.length - 1);
    }
  }, [matches, currentMatchIdx]);

  const jumpToMatch = useCallback((idx: number, focusEditor = false) => {
    if (matches.length === 0 || !textareaRef.current) return;
    const validIdx = (idx + matches.length) % matches.length;
    setCurrentMatchIdx(validIdx);
    const m = matches[validIdx];

    const el = textareaRef.current;
    if (focusEditor) {
      el.focus();
    }
    el.setSelectionRange(m.start, m.end);

    // Calculate approx line scroll
    const textBefore = el.value.substring(0, m.start);
    const lineNum = textBefore.split('\n').length;
    const lineHeight = 1.5 * config.terminal.font_size;
    const targetScrollTop = Math.max(0, (lineNum - 5) * lineHeight);
    el.scrollTop = targetScrollTop;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = targetScrollTop;
    }
    if (highlightRef.current) {
      highlightRef.current.scrollTop = targetScrollTop;
    }
    if (searchOverlayRef.current) {
      searchOverlayRef.current.scrollTop = targetScrollTop;
    }
  }, [matches, config.terminal.font_size]);

  const handleNextMatch = () => jumpToMatch(currentMatchIdx + 1, false);
  const handlePrevMatch = () => jumpToMatch(currentMatchIdx - 1, false);

  const handleReplaceSingle = () => {
    if (!activeTab || activeTab.isReadOnly || matches.length === 0) return;
    const m = matches[currentMatchIdx];
    const { newContent, nextCursor } = replaceSingleMatch(activeTab.content, m, replaceQuery);
    updateActiveTabContent(newContent);
    pushImmediateHistory(activeTab.id, newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 0);
  };

  const handleReplaceAll = () => {
    if (!activeTab || activeTab.isReadOnly || !searchQuery) return;
    const { newContent, count } = replaceAllExactMatches(
      activeTab.content,
      searchQuery,
      replaceQuery,
      caseSensitive
    );
    if (count > 0) {
      updateActiveTabContent(newContent);
      pushImmediateHistory(activeTab.id, newContent);
      showToast(`${count} 箇所を置換しました`, 'success');
    }
  };

  // Context menu state for Editor
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number } | null>(null);
  const editorContextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (editorContextMenuRef.current && !editorContextMenuRef.current.contains(e.target as Node)) {
        setEditorContextMenu(null);
      }
    };
    if (editorContextMenu) {
      window.addEventListener('mousedown', handleClickOutside);
      return () => window.removeEventListener('mousedown', handleClickOutside);
    }
  }, [editorContextMenu]);

  // Select All text in editor
  const handleSelectAll = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
    }
  }, []);

  // Copy selection from active tab to clipboard
  const handleCopySelection = useCallback(async () => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = Math.min(el.selectionStart, el.selectionEnd);
    const end = Math.max(el.selectionStart, el.selectionEnd);
    if (start === end) return;
    const selectedText = el.value.substring(start, end);
    const ok = await writeClipboardText(selectedText);
    if (ok) {
      showToast(language === 'ja' ? '選択範囲をコピーしました' : 'Selection copied to clipboard', 'info');
    }
  }, [language, showToast]);

  // Cut selection from active tab to clipboard
  const handleCutSelection = useCallback(async () => {
    if (!activeTab || activeTab.isReadOnly || !textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const { cutText, newContent, newCursor } = handleCutText(activeTab.content, start, end);
    if (cutText) {
      await writeClipboardText(cutText);
      updateActiveTabContent(newContent);
      pushImmediateHistory(activeTab.id, newContent);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursor, newCursor);
          textareaRef.current.focus();
        }
      }, 0);
      showToast(language === 'ja' ? '選択範囲を切り取りました' : 'Selection cut to clipboard', 'info');
    }
  }, [activeTab, language, showToast, updateActiveTabContent, pushImmediateHistory]);

  // Paste from clipboard into active tab
  const handlePasteSelection = useCallback(async (pastedText?: string) => {
    if (!activeTab || activeTab.isReadOnly || !textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const textToInsert = pastedText !== undefined ? pastedText : await readClipboardText();
    if (!textToInsert) return;
    const { newContent, newCursor } = handlePasteText(activeTab.content, start, end, textToInsert);
    updateActiveTabContent(newContent);
    pushImmediateHistory(activeTab.id, newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursor, newCursor);
        textareaRef.current.focus();
      }
    }, 0);
  }, [activeTab, updateActiveTabContent, pushImmediateHistory]);

  // Focus-exclusive shortcut controller (onKeyDownCapture on container)
  const handleContainerKeyDownCapture = (e: React.KeyboardEvent<HTMLElement>) => {
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const keyLower = e.key.toLowerCase();
    const code = e.code;

    // Shortcuts for Input elements (e.g. search / replace box) should be skipped so input box retains standard behavior
    const target = e.target as HTMLElement;
    const isInsideInput =
      target && (target.tagName === 'INPUT' || (target.tagName === 'TEXTAREA' && target !== textareaRef.current));

    if (!isInsideInput) {
      // Ctrl+A: Select All
      if (isCtrlOrMeta && !e.shiftKey && (keyLower === 'a' || code === 'KeyA')) {
        e.preventDefault();
        e.stopPropagation();
        handleSelectAll();
        return;
      }
    }

    // Ctrl+F: Open/toggle Find
    if (isCtrlOrMeta && !e.shiftKey && keyLower === 'f') {
      e.preventDefault();
      e.stopPropagation();
      setIsSearchOpen(true);
      setIsReplaceOpen(false);
      setTimeout(() => searchInputRef.current?.select(), 0);
      return;
    }

    // Ctrl+H: Open/toggle Replace
    if (isCtrlOrMeta && !e.shiftKey && keyLower === 'h') {
      e.preventDefault();
      e.stopPropagation();
      setIsSearchOpen(true);
      setIsReplaceOpen(true);
      setTimeout(() => replaceInputRef.current?.select(), 0);
      return;
    }

    // Ctrl+S: Atomic save
    if (isCtrlOrMeta && !e.shiftKey && keyLower === 's') {
      e.preventDefault();
      e.stopPropagation();
      handleSaveActiveTab();
      return;
    }

    // Esc: Close search/replace bar if open, else close editor
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (isSearchOpen) {
        setIsSearchOpen(false);
        textareaRef.current?.focus();
      } else {
        handleAttemptCloseEditor();
      }
      return;
    }

    // Undo / Redo
    if (isCtrlOrMeta && keyLower === 'z') {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }
    if (isCtrlOrMeta && keyLower === 'y') {
      e.preventDefault();
      e.stopPropagation();
      handleRedo();
      return;
    }

    // Ctrl+Shift+K: AI Code Edit
    if (isCtrlOrMeta && e.shiftKey && keyLower === 'k') {
      e.preventDefault();
      e.stopPropagation();
      setIsAiModalOpen(true);
      return;
    }
  };

  // Handle keys in textarea (Tab soft indent, Bracket auto pair, Cut, Copy, Paste, Select All)
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeTab) return;

    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const keyLower = e.key.toLowerCase();
    const code = e.code;

    // Ctrl+A: Select All (supported even if read-only)
    if (isCtrlOrMeta && !e.shiftKey && (keyLower === 'a' || code === 'KeyA')) {
      e.preventDefault();
      e.stopPropagation();
      handleSelectAll();
      return;
    }

    // Ctrl+C: Copy (supported even if read-only)
    if (isCtrlOrMeta && !e.shiftKey && (keyLower === 'c' || code === 'KeyC')) {
      if (start !== end) {
        handleCopySelection();
      }
      return;
    }

    // If read-only, disallow modifying operations
    if (activeTab.isReadOnly) return;

    // Ctrl+X: Cut
    if (isCtrlOrMeta && !e.shiftKey && (keyLower === 'x' || code === 'KeyX')) {
      if (start !== end) {
        e.preventDefault();
        e.stopPropagation();
        handleCutSelection();
      }
      return;
    }

    // Ctrl+V: Paste
    if (isCtrlOrMeta && !e.shiftKey && (keyLower === 'v' || code === 'KeyV')) {
      e.preventDefault();
      e.stopPropagation();
      handlePasteSelection();
      return;
    }

    // Soft Tab (4 spaces) / Shift+Tab (Unindent)
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const { newContent, newStart, newEnd } = handleTabIndentation(
        activeTab.content,
        start,
        end,
        e.shiftKey
      );
      updateActiveTabContent(newContent);
      pushImmediateHistory(activeTab.id, newContent);

      setTimeout(() => {
        el.setSelectionRange(newStart, newEnd);
      }, 0);
      return;
    }

    // Auto-close brackets & quotes: [, {, (, ", '
    if (['[', '{', '(', '"', "'", ']', '}', ')'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const { newContent, newStart, newEnd, handled } = handleAutoClosePair(
        activeTab.content,
        start,
        end,
        e.key
      );
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        updateActiveTabContent(newContent);
        pushImmediateHistory(activeTab.id, newContent);
        setTimeout(() => {
          el.setSelectionRange(newStart, newEnd);
        }, 0);
        return;
      }
    }
  };

  // Run in terminal
  const handleRun = () => {
    if (!activeTab) return;
    let cmd = '';
    const fp = activeTab.filePath;
    if (fp.endsWith('.py')) {
      cmd = `python3 "${fp}"`;
    } else if (fp.endsWith('.js') || fp.endsWith('.ts')) {
      cmd = `node "${fp}"`;
    } else if (fp.endsWith('.sh') || fp.endsWith('.bash')) {
      cmd = `bash "${fp}"`;
    } else if (fp.endsWith('.rs')) {
      cmd = `cargo run`;
    } else if (fp) {
      cmd = `cat "${fp}"`;
    } else {
      cmd = activeTab.content;
    }

    if (!cmd.trim()) return;

    if (isDangerousCommand(cmd) || (!fp && isDangerousCommand(activeTab.content))) {
      setConfirmDangerousCmd(cmd);
    } else {
      onExecuteInTerminal(cmd);
    }
  };

  // AI Edit with Ollama
  const handleAiEdit = async () => {
    if (!aiInstruction.trim() || isAiEditing || !activeTab) return;
    setIsAiEditing(true);
    setAiError(null);

    try {
      const fileName = activeTab.fileName || 'script.sh';
      const updatedCode = await TauriApi.aiEditCode(
        aiInstruction.trim(),
        activeTab.content,
        fileName,
        context
      );
      updateActiveTabContent(updatedCode);
      pushImmediateHistory(activeTab.id, updatedCode);
      setIsAiModalOpen(false);
      setAiInstruction('');
    } catch (err: any) {
      setAiError(String(err));
    } finally {
      setIsAiEditing(false);
    }
  };

  // Detected secrets in active tab
  const detectedSecrets = React.useMemo<SecretRange[]>(() => {
    if (!activeTab?.content) return [];
    return findSecretRanges(activeTab.content);
  }, [activeTab?.content]);

  // Syntax highlight for active tab
  // When secret masking is active, secrets are replaced with SPACES (preserving \n)
  // so that the syntax highlight layer NEVER renders plain text secrets underneath!
  const highlightedHtml = React.useMemo(() => {
    if (!activeTab) return '';
    let codeToHighlight = activeTab.content;
    if (isSecretMaskingActive && detectedSecrets.length > 0) {
      let maskedCode = '';
      let lastIndex = 0;
      for (const range of detectedSecrets) {
        if (range.start > lastIndex) {
          maskedCode += codeToHighlight.slice(lastIndex, range.start);
        }
        const secretSlice = codeToHighlight.slice(range.start, range.end);
        maskedCode += secretSlice.replace(/[^\n]/g, ' ');
        lastIndex = range.end;
      }
      if (lastIndex < codeToHighlight.length) {
        maskedCode += codeToHighlight.slice(lastIndex);
      }
      codeToHighlight = maskedCode;
    }
    return highlightSyntax(codeToHighlight, activeTab.fileName);
  }, [activeTab?.content, activeTab?.fileName, isSecretMaskingActive, detectedSecrets]);

  // Search match highlights overlay
  const searchHighlightHtml = React.useMemo(() => {
    if (!isSearchOpen || !searchQuery || !activeTab || matches.length === 0) return '';
    const content = activeTab.content;
    let result = '';
    let lastIndex = 0;

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m.start > lastIndex) {
        result += escapeHtml(content.slice(lastIndex, m.start));
      }
      const isCurrent = i === currentMatchIdx;
      const bg = isCurrent
        ? 'background: rgba(56, 189, 248, 0.65); outline: 1px solid #38bdf8;'
        : 'background: rgba(234, 179, 8, 0.35);';
      result += `<mark style="${bg} color: transparent; border-radius: 2px;">${escapeHtml(content.slice(m.start, m.end))}</mark>`;
      lastIndex = m.end;
    }
    if (lastIndex < content.length) {
      result += escapeHtml(content.slice(lastIndex));
    }
    return result;
  }, [isSearchOpen, searchQuery, activeTab?.content, matches, currentMatchIdx]);

  // Secret mask overlay: preserves newlines and non-secret monospace spacing
  const secretMaskHighlightHtml = React.useMemo(() => {
    if (!activeTab || !isSecretMaskingActive || detectedSecrets.length === 0) return '';
    const content = activeTab.content;
    let result = '';
    let lastIndex = 0;

    for (const range of detectedSecrets) {
      if (range.start > lastIndex) {
        // Non-secret span: replace all non-newline characters with spaces
        const nonSecret = content.slice(lastIndex, range.start);
        result += nonSecret.replace(/[^\n]/g, ' ');
      }
      const secretSlice = content.slice(range.start, range.end);
      const maskedBullets = secretSlice.replace(/[^\n]/g, '•');
      result += `<span style="background: rgba(239, 68, 68, 0.2); color: #f87171; outline: 1px dashed rgba(239, 68, 68, 0.7); border-radius: 2px;">${maskedBullets}</span>`;
      lastIndex = range.end;
    }
    if (lastIndex < content.length) {
      const remainder = content.slice(lastIndex);
      result += remainder.replace(/[^\n]/g, ' ');
    }
    return result;
  }, [activeTab?.content, isSecretMaskingActive, detectedSecrets]);

  const lineCount = Math.max(1, (activeTab?.content || '').split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  if (!isOpen) return null;

  return (
    <aside
      ref={editorContainerRef}
      className="editor-container"
      tabIndex={-1}
      onKeyDownCapture={handleContainerKeyDownCapture}
      style={{
        width: '520px',
        maxWidth: '90vw',
        height: '100%',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 24,
        outline: 'none',
        position: 'relative',
      }}
    >
      {/* Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.35)',
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
          minHeight: '36px',
          padding: '0 4px',
          gap: '2px',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
                background: isActive ? 'var(--bg-main)' : 'rgba(255, 255, 255, 0.04)',
                borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                borderBottom: isActive ? '1px solid var(--bg-main)' : 'none',
                color: isActive ? 'var(--fg-main)' : 'var(--fg-dim)',
                borderRadius: '4px 4px 0 0',
                maxWidth: '140px',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'background 0.15s',
              }}
              title={tab.canonicalPath || tab.filePath}
            >
              <FileCode size={13} color={isActive ? '#38bdf8' : '#94a3b8'} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                {tab.fileName}
              </span>

              {tab.isReadOnly && (
                <span
                  title={tab.readOnlyReason || t.editor.readOnlyTooltip}
                  style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                >
                  <Lock size={11} color="#fbbf24" />
                </span>
              )}

              {tab.isDirty && (
                <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '14px', lineHeight: 0 }}>
                  ●
                </span>
              )}

              <button
                type="button"
                className="action-btn"
                style={{ padding: '2px', marginLeft: '2px', border: 'none', background: 'transparent' }}
                onClick={(e) => handleRequestCloseTab(tab.id, e)}
                title={t.editor.closeTab}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}

        {tabs.length < MAX_TABS && (
          <button
            type="button"
            className="action-btn"
            style={{ padding: '4px 6px', margin: '2px', fontSize: '11px' }}
            onClick={handleNewTab}
            title={t.editor.newTab}
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Editor Header Toolbar */}
      <div
        style={{
          height: '40px',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--fg-main)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '160px',
            }}
            title={activeTab?.fileName || t.editor.title}
          >
            {activeTab?.fileName || t.editor.title}
          </span>

          {activeTab?.isDirty && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#38bdf8',
                flexShrink: 0,
              }}
              title="未保存の変更"
            />
          )}

          {activeTab?.isReadOnly && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 5px',
                background: 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 600,
                color: '#fbbf24',
                flexShrink: 0,
              }}
              title={activeTab.readOnlyReason || t.editor.readOnlyTooltip}
            >
              <Lock size={10} />
              <span>{t.editor.readOnlyBadge}</span>
            </span>
          )}

          {activeTab?.isSymlink && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                borderRadius: '3px',
                flexShrink: 0,
              }}
              title="シンボリックリンク"
            >
              symlink
            </span>
          )}

          {detectedSecrets.length > 0 && (
            <button
              type="button"
              onClick={() => setIsSecretMaskingActive((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                background: isSecretMaskingActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: '1px solid ' + (isSecretMaskingActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'),
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                color: isSecretMaskingActive ? '#f87171' : '#fbbf24',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title={isSecretMaskingActive ? t.editor.unmaskSecretsTooltip : t.editor.maskSecretsTooltip}
            >
              <ShieldAlert size={11} color={isSecretMaskingActive ? '#f87171' : '#fbbf24'} />
              <span>{detectedSecrets.length}</span>
              {isSecretMaskingActive ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {onRichPreview && activeTab && (
            <button
              className="action-btn"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={() => onRichPreview(activeTab.filePath, activeTab.fileName, activeTab.content)}
              title="リッチプレビュー (Markdown / CSV / JSON)"
            >
              <Eye size={13} color="#a6e3a1" />
              <span>プレビュー</span>
            </button>
          )}

          {/* AutoSave Restore Button & Popover */}
          {activeTab && autosaveHistory.length > 0 && (
            <div style={{ position: 'relative' }} ref={restorePopoverRef}>
              <button
                className="action-btn"
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: isRestorePopoverOpen ? '#38bdf8' : 'var(--fg-main)',
                  borderColor: isRestorePopoverOpen ? 'rgba(56, 189, 248, 0.5)' : undefined,
                  backgroundColor: isRestorePopoverOpen ? 'rgba(56, 189, 248, 0.1)' : undefined,
                }}
                onClick={() => setIsRestorePopoverOpen((prev) => !prev)}
                title={t.editor.restoreBtn(autosaveHistory.length)}
              >
                <RotateCcw size={12} color="#38bdf8" />
                <span>
                  {t.editor.restoreBtn(autosaveHistory.length)}
                </span>
              </button>

              {isRestorePopoverOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '320px',
                    backgroundColor: '#181e2e',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: '6px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                    zIndex: 60,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Popover Header */}
                  <div
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(56, 189, 248, 0.06)',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <RotateCcw size={12} color="#38bdf8" />
                        <span>{t.editor.backupHistoryTitle}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                        {t.editor.backupHistorySubtitle}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsRestorePopoverOpen(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                      }}
                      title={t.common?.close || '閉じる'}
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Popover List */}
                  <div style={{ maxHeight: '260px', overflowY: 'auto', padding: '4px 0' }}>
                    {autosaveHistory.map((entry, index) => {
                      const isLatest = index === 0;
                      return (
                        <div
                          key={entry.id}
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom:
                              index < autosaveHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                            backgroundColor: isLatest ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isLatest && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    padding: '1px 5px',
                                    background: 'rgba(56, 189, 248, 0.2)',
                                    color: '#38bdf8',
                                    borderRadius: '3px',
                                    fontWeight: 600,
                                  }}
                                >
                                  {t.editor.latestBadge}
                                </span>
                              )}
                              <span style={{ fontSize: '11px', color: '#e2e8f0', fontFamily: 'monospace' }}>
                                {formatDateTime(entry.timestamp)}
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '10px',
                                color: '#94a3b8',
                              }}
                            >
                              <span>{formatRelativeTime(entry.timestamp, language)}</span>
                              <span>•</span>
                              <span>{formatBytes(entry.size_bytes)}</span>
                            </div>
                          </div>

                          <button
                            className="btn-secondary"
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              height: '24px',
                              marginLeft: '8px',
                              flexShrink: 0,
                              cursor: activeTab.isReadOnly ? 'not-allowed' : 'pointer',
                              opacity: activeTab.isReadOnly ? 0.5 : 1,
                            }}
                            disabled={activeTab.isReadOnly}
                            onClick={() => handleRestoreSnapshot(entry)}
                          >
                            {t.editor.restoreAction}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            className="action-btn"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setIsAiModalOpen(true)}
            title={t.editor.aiEditTooltip}
          >
            <Sparkles size={13} color="#38bdf8" />
            <span>{t.editor.aiEdit}</span>
          </button>

          <button
            className="action-btn"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={handleRun}
            title={t.editor.runTooltip}
          >
            <Play size={13} color="#34d399" />
            <span>{t.common.run}</span>
          </button>

          <button
            className="btn-primary"
            style={{
              padding: '3px 10px',
              fontSize: '11px',
              opacity: activeTab?.isReadOnly ? 0.5 : 1,
              cursor: activeTab?.isReadOnly ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSaveActiveTab}
            disabled={activeTab?.isReadOnly}
            title={activeTab?.isReadOnly ? t.editor.readOnlyTooltip : t.editor.saveTooltip}
          >
            <Save size={13} />
            <span>{t.common.save}</span>
          </button>

          <button
            className="action-btn"
            onClick={handleAttemptCloseEditor}
            title={t.editor.closeTooltip}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* File Quick Open & Path Bar */}
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <FolderOpen size={14} color="#94a3b8" />
        <input
          type="text"
          placeholder={t.editor.pathPlaceholder}
          value={quickPathInput}
          onChange={(e) => setQuickPathInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && quickPathInput.trim()) {
              handleOpenFile(quickPathInput.trim());
            }
          }}
          style={{
            flex: 1,
            backgroundColor: '#181e2e',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '4px',
            padding: '4px 8px',
            color: '#f8fafc',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
          }}
        />

        <button
          className="action-btn"
          style={{ padding: '3px 6px' }}
          onClick={loadDirectoryFiles}
          title={t.editor.reloadFilesTooltip}
        >
          <RefreshCw size={11} className={isLoadingFile ? 'animate-spin' : ''} />
        </button>

        {dirFiles.length > 0 && (
          <select
            style={{
              backgroundColor: '#181e2e',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '4px',
              padding: '3px 6px',
              color: '#f8fafc',
              fontSize: '11px',
              maxWidth: '120px',
              outline: 'none',
            }}
            onChange={(e) => {
              if (e.target.value) {
                handleOpenFile(e.target.value);
              }
            }}
            defaultValue=""
          >
            <option value="" disabled style={{ background: '#181e2e', color: '#94a3b8' }}>
              {t.editor.selectPlaceholder}
            </option>
            {dirFiles.map((f) => (
              <option key={f} value={f} style={{ background: '#181e2e', color: '#f8fafc' }}>
                {f}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Secret Masking Security Banner & Toggle Switch */}
      {detectedSecrets.length > 0 && (
        <div
          style={{
            padding: '6px 12px',
            borderBottom: '1px solid ' + (isSecretMaskingActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.4)'),
            background: isSecretMaskingActive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            flexShrink: 0,
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <ShieldAlert
              size={13}
              color={isSecretMaskingActive ? '#f87171' : '#fbbf24'}
              style={{ flexShrink: 0 }}
            />
            <span
              style={{
                fontWeight: 600,
                color: isSecretMaskingActive ? '#f87171' : '#fbbf24',
                whiteSpace: 'nowrap',
              }}
            >
              {t.editor.secretsDetected(detectedSecrets.length)}
            </span>
            <span
              style={{
                fontSize: '10px',
                color: 'var(--fg-dim)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {isSecretMaskingActive ? `(${t.editor.secretMaskProtected})` : `(⚠️ ${t.editor.secretMaskExposed})`}
            </span>
          </div>

          {/* Toggle Switch Component */}
          <button
            type="button"
            role="switch"
            aria-checked={isSecretMaskingActive}
            onClick={() => setIsSecretMaskingActive((prev) => !prev)}
            title={isSecretMaskingActive ? t.editor.unmaskSecretsTooltip : t.editor.maskSecretsTooltip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid ' + (isSecretMaskingActive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.15)'),
              borderRadius: '14px',
              padding: '2px 8px',
              cursor: 'pointer',
              flexShrink: 0,
              userSelect: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isSecretMaskingActive ? '#f87171' : 'var(--fg-muted)',
              }}
            >
              {isSecretMaskingActive ? t.editor.secretMaskOn : t.editor.secretMaskOff}
            </span>

            {/* Toggle Track and Knob */}
            <div
              style={{
                width: '32px',
                height: '18px',
                borderRadius: '9px',
                background: isSecretMaskingActive ? '#ef4444' : '#475569',
                position: 'relative',
                transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
                boxShadow: isSecretMaskingActive ? '0 0 6px rgba(239, 68, 68, 0.4)' : 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: isSecretMaskingActive ? '16px' : '2px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
                }}
              />
            </div>
          </button>
        </div>
      )}

      {/* Find & Replace Mini Bar (Ctrl+F / Ctrl+H) */}
      {isSearchOpen && (
        <div
          style={{
            padding: '8px 10px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: 'var(--shadow-md)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={13} color="#38bdf8" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t.editor.findPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsSearchOpen(false);
                  textareaRef.current?.focus();
                }
              }}
              style={{
                flex: 1,
                backgroundColor: '#1e293b',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '4px',
                padding: '3px 6px',
                color: '#f8fafc',
                fontSize: '12px',
                outline: 'none',
              }}
            />

            <span style={{ fontSize: '11px', color: '#94a3b8', minWidth: '50px', textAlign: 'center' }}>
              {matches.length > 0 ? `${currentMatchIdx + 1}/${matches.length}` : t.editor.noMatches}
            </span>

            <button
              className="action-btn"
              style={{ padding: '2px 4px' }}
              onClick={handlePrevMatch}
              title={t.editor.previousMatch}
            >
              <ChevronUp size={13} />
            </button>
            <button
              className="action-btn"
              style={{ padding: '2px 4px' }}
              onClick={handleNextMatch}
              title={t.editor.nextMatch}
            >
              <ChevronDown size={13} />
            </button>

            <button
              className={`action-btn ${caseSensitive ? 'active' : ''}`}
              style={{
                padding: '2px 5px',
                fontSize: '11px',
                fontWeight: 700,
                background: caseSensitive ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              }}
              onClick={() => setCaseSensitive(!caseSensitive)}
              title={t.editor.matchCase}
            >
              Aa
            </button>

            <button
              className="action-btn"
              style={{ padding: '2px 5px' }}
              onClick={() => setIsReplaceOpen(!isReplaceOpen)}
              title={t.editor.replace}
            >
              <Replace size={13} color={isReplaceOpen ? '#38bdf8' : '#94a3b8'} />
            </button>

            <button
              className="action-btn"
              style={{ padding: '2px 4px' }}
              onClick={() => {
                setIsSearchOpen(false);
                textareaRef.current?.focus();
              }}
              title={t.editor.closeSearch}
            >
              <X size={13} />
            </button>
          </div>

          {isReplaceOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Replace size={13} color="#94a3b8" />
              <input
                ref={replaceInputRef}
                type="text"
                placeholder={t.editor.replacePlaceholder}
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleReplaceSingle();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsSearchOpen(false);
                    textareaRef.current?.focus();
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '4px',
                  padding: '3px 6px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                className="btn-secondary"
                style={{ padding: '3px 8px', fontSize: '11px' }}
                onClick={handleReplaceSingle}
                disabled={matches.length === 0 || activeTab?.isReadOnly}
              >
                {t.editor.replace}
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '3px 8px', fontSize: '11px' }}
                onClick={handleReplaceAll}
                disabled={matches.length === 0 || activeTab?.isReadOnly}
              >
                {t.editor.replaceAll}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Shell Configuration Caution Banner */}
      {activeTab?.warningMessage && (
        <EditorWarningBanner message={activeTab.warningMessage} />
      )}

      {/* Main Editor Text Area with Line Numbers (Lazy Rendered for Active Tab) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-main)',
        }}
      >
        {activeTab ? (
          <>
            {/* Line Numbers */}
            <div
              ref={lineNumbersRef}
              style={{
                width: '44px',
                minWidth: '44px',
                padding: '10px 6px',
                textAlign: 'right',
                color: 'var(--fg-dim)',
                fontFamily: 'var(--font-mono)',
                fontSize: `${config.terminal.font_size}px`,
                lineHeight: '1.5',
                userSelect: 'none',
                overflowY: 'hidden',
                background: 'rgba(0, 0, 0, 0.15)',
                borderRight: '1px solid var(--border)',
                boxSizing: 'border-box',
              }}
            >
              {lineNumbers.map((n) => (
                <div key={n}>{n}</div>
              ))}
            </div>

            {/* Code Viewport with perfectly synchronized overlay */}
            <div
              style={{
                flex: 1,
                position: 'relative',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              {/* Syntax Highlighted Overlay */}
              <pre
                ref={highlightRef}
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  margin: 0,
                  padding: '10px',
                  background: 'transparent',
                  color: 'var(--fg-main)',
                  fontFamily: config.terminal.font_family,
                  fontSize: `${config.terminal.font_size}px`,
                  lineHeight: '1.5',
                  whiteSpace: 'pre',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  boxSizing: 'border-box',
                  zIndex: 1,
                }}
              />

              {/* Search Match Highlights Overlay */}
              {isSearchOpen && searchQuery && matches.length > 0 && (
                <pre
                  ref={searchOverlayRef}
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: searchHighlightHtml + '\n' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    margin: 0,
                    padding: '10px',
                    background: 'transparent',
                    color: 'transparent',
                    fontFamily: config.terminal.font_family,
                    fontSize: `${config.terminal.font_size}px`,
                    lineHeight: '1.5',
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    zIndex: 2,
                  }}
                />
              )}

              {/* Secret Mask Overlay */}
              {detectedSecrets.length > 0 && isSecretMaskingActive && (
                <pre
                  ref={secretOverlayRef}
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: secretMaskHighlightHtml + '\n' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    margin: 0,
                    padding: '10px',
                    background: 'transparent',
                    fontFamily: config.terminal.font_family,
                    fontSize: `${config.terminal.font_size}px`,
                    lineHeight: '1.5',
                    whiteSpace: 'pre',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    zIndex: 3,
                  }}
                />
              )}

              {/* Text Area */}
              <textarea
                ref={textareaRef}
                className="editor-code-textarea"
                value={activeTab.content}
                readOnly={activeTab.isReadOnly}
                onChange={(e) => updateActiveTabContent(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                onCopy={(e) => {
                  const el = textareaRef.current;
                  if (el && el.selectionStart !== el.selectionEnd) {
                    const text = el.value.substring(el.selectionStart, el.selectionEnd);
                    try {
                      e.clipboardData.setData('text/plain', text);
                    } catch {}
                    writeClipboardText(text);
                    showToast(language === 'ja' ? '選択範囲をコピーしました' : 'Selection copied to clipboard', 'info');
                  }
                }}
                onCut={(e) => {
                  if (activeTab.isReadOnly) {
                    e.preventDefault();
                    return;
                  }
                  e.preventDefault();
                  handleCutSelection();
                }}
                onPaste={async (e) => {
                  if (activeTab.isReadOnly) {
                    e.preventDefault();
                    return;
                  }
                  e.preventDefault();
                  const eventText = e.clipboardData?.getData('text/plain');
                  const text = (eventText && eventText.length > 0) ? eventText : await readClipboardText();
                  if (text) {
                    handlePasteSelection(text);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setEditorContextMenu({ x: e.clientX, y: e.clientY });
                }}
                onScroll={handleScroll}
                spellCheck={false}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  margin: 0,
                  padding: '10px',
                  background: 'transparent',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                  caretColor: activeTab.isReadOnly ? 'transparent' : 'var(--fg-main)',
                  border: 'none',
                  outline: 'none',
                  fontFamily: config.terminal.font_family,
                  fontSize: `${config.terminal.font_size}px`,
                  lineHeight: '1.5',
                  resize: 'none',
                  whiteSpace: 'pre',
                  overflow: 'auto',
                  boxSizing: 'border-box',
                  zIndex: 4,
                  cursor: activeTab.isReadOnly ? 'default' : 'text',
                }}
                placeholder={t.editor.textareaPlaceholder}
              />
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              gap: '12px',
            }}
          >
            <FileCode size={40} strokeWidth={1.5} color="#475569" />
            <div style={{ fontSize: '13px' }}>タブが開かれていません</div>
            <button
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={handleNewTab}
            >
              新規ファイルを作成
            </button>
          </div>
        )}
      </div>

      {/* Floating Toasts */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            left: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: 1.4,
                boxShadow: 'var(--shadow-lg)',
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background:
                  toast.type === 'error'
                    ? 'rgba(239, 68, 68, 0.95)'
                    : toast.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.95)'
                    : toast.type === 'success'
                    ? 'rgba(16, 185, 129, 0.95)'
                    : 'rgba(30, 41, 59, 0.95)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {toast.type === 'warning' && <AlertTriangle size={15} style={{ flexShrink: 0 }} />}
              <span style={{ flex: 1 }}>{toast.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Max Tabs Limit Modal */}
      {showMaxTabsModal && (
        <div
          className="modal-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 70,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-active)',
              borderRadius: '8px',
              padding: '16px',
              maxWidth: '360px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 600, fontSize: '13px' }}>
              <AlertTriangle size={16} />
              <span>上限超過</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--fg-main)', lineHeight: 1.5 }}>
              {t.editor.maxTabsExceeded}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setShowMaxTabsModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Tab Close Confirm Modal */}
      {confirmCloseTabId && (
        <div
          className="modal-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 70,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-active)',
              borderRadius: '8px',
              padding: '16px',
              maxWidth: '380px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 600, fontSize: '13px' }}>
              <AlertTriangle size={16} />
              <span>{t.editor.unsavedTitle}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--fg-main)', lineHeight: 1.5 }}>
              {t.editor.unsavedMessage}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => setConfirmCloseTabId(null)}>
                {t.common.cancel}
              </button>
              <button
                className="btn-danger"
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px' }}
                onClick={() => executeCloseTab(confirmCloseTabId)}
              >
                {t.editor.discardAndClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved All Close Confirm Modal */}
      {confirmCloseAllDirty && (
        <div
          className="modal-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 70,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-active)',
              borderRadius: '8px',
              padding: '16px',
              maxWidth: '380px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontWeight: 600, fontSize: '13px' }}>
              <AlertTriangle size={16} />
              <span>{t.editor.unsavedTitle}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--fg-main)', lineHeight: 1.5 }}>
              保存されていない変更があるタブが存在します。破棄してエディタを閉じますか？
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => setConfirmCloseAllDirty(false)}>
                {t.common.cancel}
              </button>
              <button
                className="btn-danger"
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 12px', fontSize: '12px' }}
                onClick={handleConfirmCloseAll}
              >
                {t.editor.discardAndClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AutoSave Recovery Confirm Modal */}
      {recoveryData && (
        <div
          className="modal-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 70,
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '8px',
              padding: '16px',
              maxWidth: '380px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 600, fontSize: '13px' }}>
              <RefreshCw size={16} />
              <span>{t.editor.recoveryTitle}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--fg-main)', lineHeight: 1.5 }}>
              {t.editor.recoveryMessage}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn-secondary" onClick={handleDiscardRecovery}>
                {t.editor.discardBackup}
              </button>
              <button className="btn-primary" onClick={handleConfirmRecovery}>
                {t.editor.restoreBackup}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Edit Modal Popup */}
      {isAiModalOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 60,
          }}
        >
          <div
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-active)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 600, fontSize: '13px' }}>
                <Sparkles size={15} />
                <span>{t.editor.aiModalTitle}</span>
              </div>
              <button
                className="action-btn"
                style={{ padding: '2px 6px', border: 'none' }}
                onClick={() => setIsAiModalOpen(false)}
              >
                <X size={14} />
              </button>
            </div>

            <textarea
              style={{
                width: '100%',
                minHeight: '80px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px 10px',
                color: 'var(--fg-main)',
                fontSize: '13px',
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                resize: 'none',
              }}
              placeholder={t.editor.aiPromptPlaceholder}
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              onKeyDown={(e) => {
                const isEnter =
                  e.key === 'Enter' ||
                  e.key === '\n' ||
                  e.code === 'Enter' ||
                  e.code === 'NumpadEnter';
                if (isEnter && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAiEdit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAiModalOpen(false);
                }
              }}
            />

            {aiError && (
              <div style={{ color: '#fda4af', fontSize: '12px' }}>{aiError}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                className="btn-secondary"
                onClick={() => setIsAiModalOpen(false)}
              >
                {t.common.cancel}
              </button>
              <button
                className="btn-primary"
                onClick={handleAiEdit}
                disabled={isAiEditing || !aiInstruction.trim()}
              >
                {isAiEditing ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Sparkles size={13} />
                )}
                <span>{t.editor.applyAiEdit}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDangerousCmd && (
        <DangerousCommandModal
          isOpen={!!confirmDangerousCmd}
          command={confirmDangerousCmd}
          onConfirmExecute={() => {
            if (confirmDangerousCmd) onExecuteInTerminal(confirmDangerousCmd, true);
            setConfirmDangerousCmd(null);
          }}
          onSafeInsert={() => {
            if (confirmDangerousCmd) {
              if (onInsertInTerminal) {
                onInsertInTerminal(confirmDangerousCmd);
              } else {
                onExecuteInTerminal(confirmDangerousCmd);
              }
            }
            setConfirmDangerousCmd(null);
          }}
          onClose={() => setConfirmDangerousCmd(null)}
        />
      )}

      {/* Editor Context Menu */}
      {editorContextMenu && (
        <div
          ref={editorContextMenuRef}
          className="filetree-context-menu"
          style={{
            position: 'fixed',
            left: `${Math.min(editorContextMenu.x, window.innerWidth - 190)}px`,
            top: `${Math.min(editorContextMenu.y, window.innerHeight - 240)}px`,
            zIndex: 10000,
          }}
        >
          <div className="context-menu-header">
            {activeTab ? activeTab.fileName : 'Editor'}
          </div>
          <button
            className="context-menu-item"
            disabled={!textareaRef.current || textareaRef.current.selectionStart === textareaRef.current.selectionEnd || activeTab?.isReadOnly}
            onClick={() => {
              handleCutSelection();
              setEditorContextMenu(null);
            }}
          >
            <Scissors size={13} />
            <span>{language === 'ja' ? '切り取り' : 'Cut'}</span>
            <span className="context-menu-shortcut">Ctrl+X</span>
          </button>
          <button
            className="context-menu-item"
            disabled={!textareaRef.current || textareaRef.current.selectionStart === textareaRef.current.selectionEnd}
            onClick={() => {
              handleCopySelection();
              setEditorContextMenu(null);
            }}
          >
            <Copy size={13} />
            <span>{language === 'ja' ? 'コピー' : 'Copy'}</span>
            <span className="context-menu-shortcut">Ctrl+C</span>
          </button>
          <button
            className="context-menu-item"
            disabled={activeTab?.isReadOnly}
            onClick={() => {
              handlePasteSelection();
              setEditorContextMenu(null);
            }}
          >
            <Clipboard size={13} />
            <span>{language === 'ja' ? '貼り付け' : 'Paste'}</span>
            <span className="context-menu-shortcut">Ctrl+V</span>
          </button>
          <div className="context-menu-sep" />
          <button
            className="context-menu-item"
            onClick={() => {
              handleSelectAll();
              setEditorContextMenu(null);
            }}
          >
            <CheckSquare size={13} />
            <span>{language === 'ja' ? 'すべて選択' : 'Select All'}</span>
            <span className="context-menu-shortcut">Ctrl+A</span>
          </button>
          {activeTab && (
            <>
              <div className="context-menu-sep" />
              <button
                className="context-menu-item"
                onClick={() => {
                  handleRun();
                  setEditorContextMenu(null);
                }}
              >
                <Play size={13} color="#10b981" />
                <span>{language === 'ja' ? 'ターミナルで実行' : t.editor.runTooltip}</span>
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
};
