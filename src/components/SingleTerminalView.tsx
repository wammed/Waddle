import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { CanvasAddon } from '@xterm/addon-canvas';
import { SearchAddon } from '@xterm/addon-search';
import { Maximize2, Minimize2, X, GitBranch, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { THEMES } from '../theme';
import { AppConfig, TerminalPaneInfo, GitStatus } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';
import { KittyGraphicsManager } from '../services/kittyGraphics';

interface SingleTerminalViewProps {
  pane: TerminalPaneInfo;
  paneIndex: number;
  totalPanes: number;
  isActivePane: boolean;
  isTabActive: boolean;
  isZoomed?: boolean;
  isResizing?: boolean;
  config: AppConfig;
  slotClassName?: string;
  onFocus: () => void;
  onClose: () => void;
  onToggleZoom: () => void;
  onUpdatePane: (updates: Partial<TerminalPaneInfo>) => void;
  onErrorDetected: (command: string, output: string, exitCode: number) => void;
}

export const SingleTerminalView: React.FC<SingleTerminalViewProps> = ({
  pane,
  paneIndex,
  totalPanes,
  isActivePane,
  isTabActive,
  isZoomed = false,
  isResizing = false,
  config,
  slotClassName = '',
  onFocus,
  onClose,
  onToggleZoom,
  onUpdatePane,
  onErrorDetected,
}) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const outputBufferRef = useRef<string>('');
  const lastCommandRef = useRef<string>('');
  const lastReportedCommandRef = useRef<string>('');

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const kittyManagerRef = useRef<KittyGraphicsManager | null>(null);

  // Refs for callbacks to prevent re-triggering terminal recreation
  const onUpdatePaneRef = useRef(onUpdatePane);
  onUpdatePaneRef.current = onUpdatePane;
  const onErrorDetectedRef = useRef(onErrorDetected);
  onErrorDetectedRef.current = onErrorDetected;
  const isTabActiveRef = useRef(isTabActive);
  isTabActiveRef.current = isTabActive;
  const isActivePaneRef = useRef(isActivePane);
  isActivePaneRef.current = isActivePane;
  const isResizingRef = useRef(isResizing);
  isResizingRef.current = isResizing;

  const focusTerminal = useCallback(() => {
    if (termRef.current) {
      termRef.current.focus();
      const textarea = containerRef.current?.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }
  }, []);

  const lastDimensionsRef = useRef<{ cols: number; rows: number }>({ cols: 0, rows: 0 });

  const fitTerminal = useCallback(() => {
    if (!containerRef.current || !fitAddonRef.current || !termRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    if (w < 50 || h < 40) return;
    try {
      fitAddonRef.current.fit();
      const { rows, cols } = termRef.current;
      if (rows > 2 && cols > 2) {
        if (
          lastDimensionsRef.current.rows !== rows ||
          lastDimensionsRef.current.cols !== cols
        ) {
          lastDimensionsRef.current = { rows, cols };
          TauriApi.resizePty(pane.sessionId, rows, cols);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [pane.sessionId]);

  const handleFindNext = useCallback(
    (query?: string) => {
      const q = query !== undefined ? query : searchQuery;
      if (searchAddonRef.current && q) {
        searchAddonRef.current.findNext(q, {
          caseSensitive,
          regex: useRegex,
          incremental: true,
        });
      }
    },
    [searchQuery, caseSensitive, useRegex]
  );

  const handleFindPrevious = useCallback(() => {
    if (searchAddonRef.current && searchQuery) {
      searchAddonRef.current.findPrevious(searchQuery, {
        caseSensitive,
        regex: useRegex,
      });
    }
  }, [searchQuery, caseSensitive, useRegex]);

  const handleToggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else {
        searchAddonRef.current?.clearDecorations();
        focusTerminal();
      }
      return next;
    });
  }, [focusTerminal]);

  const handleToggleSearchRef = useRef(handleToggleSearch);
  handleToggleSearchRef.current = handleToggleSearch;

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous DOM elements if re-mounting
    containerRef.current.innerHTML = '';

    const currentTheme = THEMES[config.terminal.theme] || THEMES.waddle_dark;
    const isBgImage = Boolean(
      config.terminal.background_image && config.terminal.background_image !== 'none'
    );

    // Transparent terminal background when wallpaper image is enabled
    const terminalTheme = isBgImage
      ? { ...currentTheme.terminal, background: '#00000000' }
      : currentTheme.terminal;

    const term = new Terminal({
      fontFamily: config.terminal.font_family,
      fontSize: config.terminal.font_size,
      cursorStyle: config.terminal.cursor_style,
      cursorBlink: config.terminal.cursor_blink,
      scrollback: config.terminal.scrollback,
      theme: terminalTheme,
      allowTransparency: true,
      convertEol: true,
      smoothScrollDuration: 0,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.loadAddon(searchAddon);

    searchAddonRef.current = searchAddon;
    term.open(containerRef.current);

    // Hardware accelerated Canvas rendering (instant 0ms init, full transparency support)
    try {
      const canvasAddon = new CanvasAddon();
      term.loadAddon(canvasAddon);
    } catch (e) {
      console.warn('CanvasAddon fallback:', e);
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Initialize Kitty Graphics Protocol Manager
    let kittyManager: KittyGraphicsManager | null = null;
    if (config.kitty_graphics?.enabled !== false && containerRef.current) {
      try {
        kittyManager = new KittyGraphicsManager(
          term,
          containerRef.current,
          pane.sessionId,
          config.kitty_graphics
        );
        kittyManagerRef.current = kittyManager;
      } catch (err) {
        console.warn('Failed to initialize KittyGraphicsManager:', err);
      }
    }

    // Instant focus on terminal immediately upon opening
    term.focus();

    // Initial immediate fit if container has dimensions
    if (
      containerRef.current &&
      containerRef.current.clientWidth > 50 &&
      containerRef.current.clientHeight > 40
    ) {
      try {
        fitAddon.fit();
        const { rows, cols } = term;
        if (rows > 2 && cols > 2) {
          TauriApi.resizePty(pane.sessionId, rows, cols);
        }
      } catch (e) {
        // ignore
      }
    }

    // Attach custom keyboard shortcut handler to terminal
    term.attachCustomKeyEventHandler((event) => {
      // Ctrl+Shift+F or Ctrl+F: Open search
      if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
        if (event.type === 'keydown') {
          handleToggleSearchRef.current();
        }
        return false;
      }
      return true;
    });

    // Frame 0 fit & focus
    const rafId = requestAnimationFrame(() => {
      if (
        containerRef.current &&
        containerRef.current.clientWidth > 50 &&
        containerRef.current.clientHeight > 40
      ) {
        try {
          fitAddon.fit();
          const { rows, cols } = term;
          if (rows > 2 && cols > 2) {
            TauriApi.resizePty(pane.sessionId, rows, cols);
          }
          if (isActivePaneRef.current && isTabActiveRef.current) {
            focusTerminal();
          }
        } catch (e) {
          // ignore
        }
      }
    });

    // Layout settle fit
    const settleTimeout = setTimeout(() => {
      fitTerminal();
      if (isActivePaneRef.current && isTabActiveRef.current) {
        focusTerminal();
      }
    }, 60);

    // CWD and Git status fetcher
    const fetchCwdAndGit = async () => {
      if (document.hidden || !isTabActiveRef.current) return;
      try {
        const cwd = await TauriApi.getSessionCwd(pane.sessionId);
        if (cwd) {
          let gitStatus: GitStatus = {
            is_repo: false,
            modified_count: 0,
            untracked_count: 0,
            staged_count: 0,
            conflicted_count: 0,
            ahead: 0,
            behind: 0,
            files: [],
          };
          if (config.git?.enabled !== false) {
            gitStatus = await TauriApi.getGitStatus(cwd);
          }
          const parts = cwd.split('/').filter(Boolean);
          const folderName = parts[parts.length - 1] || '/';
          onUpdatePaneRef.current({
            cwd,
            title: folderName,
            gitStatus,
          });
        }
      } catch (err) {
        // ignore
      }
    };

    // Defer initial CWD/Git check so startup rendering & input is 100% instantaneous
    const initialFetchTimer = setTimeout(fetchCwdAndGit, 1200);

    // Send user input to PTY
    let inputLine = '';
    const onDataDisposable = term.onData((data) => {
      TauriApi.writePty(pane.sessionId, data);

      if (data === '\r' || data === '\n') {
        if (inputLine.trim().length > 0) {
          lastCommandRef.current = inputLine.trim();
          onUpdatePaneRef.current({ lastCommand: lastCommandRef.current });
        }
        inputLine = '';
        setTimeout(fetchCwdAndGit, 400);
      } else if (data === '\u007f' || data === '\b') {
        inputLine = inputLine.slice(0, -1);
      } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
        inputLine += data;
      }
    });

    // Listen to PTY output
    let unlistenOutput: (() => void) | undefined;
    let unlistenExit: (() => void) | undefined;

    TauriApi.onPtyOutput(pane.sessionId, (output) => {
      // Intercept Kitty APC sequences before passing clean text to xterm
      const textToWrite = kittyManager ? kittyManager.filterPtyOutput(output) : output;
      if (textToWrite) {
        term.write(textToWrite);
        outputBufferRef.current += textToWrite;
        if (outputBufferRef.current.length > 10000) {
          outputBufferRef.current = outputBufferRef.current.slice(-10000);
        }
        onUpdatePaneRef.current({ lastOutput: outputBufferRef.current });
        detectErrorPatterns(textToWrite);
      }
    }).then((unlisten) => {
      unlistenOutput = unlisten;
      // Start streaming now that frontend listener is ready
      TauriApi.startPty(pane.sessionId);
    });

    TauriApi.onPtyExit(pane.sessionId, () => {
      if (totalPanes > 1) {
        onClose();
      } else {
        term.writeln('\r\n\x1b[90m[Process completed]\x1b[0m');
      }
    }).then((unlisten) => {
      unlistenExit = unlisten;
    });

    // Poll CWD and Git status periodically
    const pollInterval = setInterval(() => {
      if (!document.hidden && isTabActiveRef.current) {
        fetchCwdAndGit();
      }
    }, 4000);

    // Resize observer with requestAnimationFrame throttling
    let resizeRafId: number | null = null;
    const resizeObserver = new ResizeObserver((entries) => {
      // While dragging pane divider, do NOT wipe canvas or refit!
      // The CSS container smoothly clips/reveals without any flicker.
      if (isResizingRef.current) return;
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 40) {
          if (resizeRafId === null) {
            resizeRafId = requestAnimationFrame(() => {
              resizeRafId = null;
              fitTerminal();
            });
          }
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (resizeRafId !== null) {
        cancelAnimationFrame(resizeRafId);
      }
      cancelAnimationFrame(rafId);
      clearTimeout(settleTimeout);
      clearTimeout(initialFetchTimer);
      clearInterval(pollInterval);
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
      if (kittyManager) {
        kittyManager.dispose();
        kittyManagerRef.current = null;
      }
      try {
        term.dispose();
      } catch (e) {
        // ignore
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [pane.sessionId, fitTerminal, focusTerminal]);

  // Synchronize Kitty Graphics configuration updates
  useEffect(() => {
    kittyManagerRef.current?.updateConfig(config.kitty_graphics);
  }, [config.kitty_graphics]);

  // Force render graphics when tab or pane becomes active
  useEffect(() => {
    if (isTabActive && isActivePane) {
      kittyManagerRef.current?.render();
    }
  }, [isTabActive, isActivePane]);

  // Update theme & font & background when config changes
  useEffect(() => {
    if (!termRef.current) return;
    const currentTheme = THEMES[config.terminal.theme] || THEMES.waddle_dark;
    const isBgImage = Boolean(
      config.terminal.background_image && config.terminal.background_image !== 'none'
    );

    termRef.current.options.theme = isBgImage
      ? { ...currentTheme.terminal, background: '#00000000' }
      : currentTheme.terminal;

    termRef.current.options.fontSize = config.terminal.font_size;
    termRef.current.options.fontFamily = config.terminal.font_family;
    termRef.current.options.cursorStyle = config.terminal.cursor_style;
    termRef.current.options.cursorBlink = config.terminal.cursor_blink;
    fitTerminal();
  }, [config, fitTerminal]);

  // Re-fit and focus when becoming active or when layout changes
  useEffect(() => {
    if (termRef.current && containerRef.current && !containerRef.current.querySelector('.xterm')) {
      termRef.current.open(containerRef.current);
    }

    if (isTabActive && isActivePane) {
      const timer = setTimeout(() => {
        fitTerminal();
        focusTerminal();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isTabActive, isActivePane, totalPanes, isZoomed, fitTerminal, focusTerminal]);

  // Clean single refit when pane drag resizing completes
  const prevIsResizingRef = useRef(isResizing);
  useEffect(() => {
    if (prevIsResizingRef.current && !isResizing) {
      fitTerminal();
    }
    prevIsResizingRef.current = isResizing;
  }, [isResizing, fitTerminal]);

  const detectErrorPatterns = (chunk: string) => {
    const cmd = lastCommandRef.current;
    if (!cmd) return;

    // Ignore benign commands where error words are common and harmless
    const benignCommands = ['grep', 'find', 'cat', 'echo', 'diff', 'git log', 'less', 'more', 'rg', 'ag'];
    const cmdBase = cmd.split(' ')[0];
    if (benignCommands.includes(cmdBase)) {
      return;
    }

    // Do not trigger multiple times for the same command
    if (lastReportedCommandRef.current === cmd) {
      return;
    }

    // Specific error signatures that indicate real execution failure
    const errorSignatures = [
      'command not found',
      ': No such file or directory',
      ': Permission denied',
      'Segmentation fault (core dumped)',
      'fatal: not a git repository',
      'SyntaxError:',
      'ReferenceError:',
      'panic: runtime error:',
    ];

    const hasError = errorSignatures.some((sig) => chunk.includes(sig));
    if (hasError) {
      lastReportedCommandRef.current = cmd;
      onErrorDetectedRef.current(cmd, outputBufferRef.current, 1);
    }
  };

  const isSingle = totalPanes === 1 || isZoomed;

  return (
    <div
      className={`pane-item ${isSingle ? 'single' : ''} ${isActivePane ? 'active' : ''} ${slotClassName}`}
      onClick={() => {
        onFocus();
        focusTerminal();
      }}
    >
      {/* Pane Header Bar (Only visible in multi-pane mode) */}
      {!isSingle && (
        <div
          className="pane-header"
          onClick={() => {
            onFocus();
            focusTerminal();
          }}
        >
          <div className="pane-header-left">
            <span className="pane-badge">{paneIndex + 1}</span>
            <span className="pane-title-text" title={pane.cwd || pane.title}>
              {pane.title || 'bash'}
            </span>
            {pane.gitStatus?.is_repo && pane.gitStatus.branch && (
              <span className="pane-git-badge" title={`Git: ${pane.gitStatus.branch}`}>
                <GitBranch size={10} />
                <span>{pane.gitStatus.branch}</span>
              </span>
            )}
          </div>

          <div className="pane-header-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className={`pane-action-btn ${isSearchOpen ? 'active' : ''}`}
              onClick={handleToggleSearch}
              title={t.terminal.search}
            >
              <Search size={11} />
            </button>
            <button
              className="pane-action-btn"
              onClick={onToggleZoom}
              title={isZoomed ? t.panes.restorePane : t.panes.zoomPane}
            >
              {isZoomed ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>
            <button
              className="pane-action-btn close-btn"
              onClick={onClose}
              title={t.panes.closePane}
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Terminal Viewport (Always stable container for xterm) */}
      <div className="pane-terminal-viewport" style={{ position: 'relative' }}>
        {/* Floating Search Bar Widget */}
        {isSearchOpen && (
          <div
            className="terminal-search-bar"
            style={{
              position: 'absolute',
              top: '8px',
              right: '16px',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              backgroundColor: 'rgba(20, 24, 35, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Search size={13} color="var(--accent-blue)" />
            <input
              ref={searchInputRef}
              type="text"
              className="terminal-search-input"
              placeholder={t.terminal.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFindNext(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    handleFindPrevious();
                  } else {
                    handleFindNext();
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleToggleSearch();
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '12px',
                width: '180px',
              }}
            />
            <button
              className="pane-action-btn"
              onClick={handleFindPrevious}
              title={t.terminal.prevMatch}
              style={{ padding: '2px 4px' }}
            >
              <ChevronUp size={13} />
            </button>
            <button
              className="pane-action-btn"
              onClick={() => handleFindNext()}
              title={t.terminal.nextMatch}
              style={{ padding: '2px 4px' }}
            >
              <ChevronDown size={13} />
            </button>
            <button
              className={`pane-action-btn ${caseSensitive ? 'active-filter' : ''}`}
              onClick={() => {
                const next = !caseSensitive;
                setCaseSensitive(next);
                if (searchQuery && searchAddonRef.current) {
                  searchAddonRef.current.findNext(searchQuery, {
                    caseSensitive: next,
                    regex: useRegex,
                  });
                }
              }}
              title={t.terminal.matchCase}
              style={{
                padding: '2px 5px',
                fontSize: '10px',
                fontWeight: 'bold',
                color: caseSensitive ? 'var(--accent-blue)' : '#94a3b8',
              }}
            >
              Aa
            </button>
            <button
              className={`pane-action-btn ${useRegex ? 'active-filter' : ''}`}
              onClick={() => {
                const next = !useRegex;
                setUseRegex(next);
                if (searchQuery && searchAddonRef.current) {
                  searchAddonRef.current.findNext(searchQuery, {
                    caseSensitive,
                    regex: next,
                  });
                }
              }}
              title={t.terminal.useRegex}
              style={{
                padding: '2px 5px',
                fontSize: '10px',
                fontWeight: 'bold',
                color: useRegex ? 'var(--accent-blue)' : '#94a3b8',
              }}
            >
              .*
            </button>
            <button
              className="pane-action-btn close-btn"
              onClick={handleToggleSearch}
              title={t.terminal.closeSearch}
              style={{ padding: '2px 4px' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div
          ref={containerRef}
          id={`terminal-pane-${pane.id}`}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );
};
