import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { CanvasAddon } from '@xterm/addon-canvas';
import { Maximize2, Minimize2, X, GitBranch } from 'lucide-react';
import { THEMES } from '../theme';
import { AppConfig, TerminalPaneInfo } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';

interface SingleTerminalViewProps {
  pane: TerminalPaneInfo;
  paneIndex: number;
  totalPanes: number;
  isActivePane: boolean;
  isTabActive: boolean;
  isZoomed?: boolean;
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
  const outputBufferRef = useRef<string>('');
  const lastCommandRef = useRef<string>('');

  const focusTerminal = useCallback(() => {
    if (termRef.current) {
      termRef.current.focus();
      const textarea = containerRef.current?.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }
  }, []);

  const fitTerminal = useCallback(() => {
    if (!containerRef.current || !fitAddonRef.current || !termRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    // Don't fit when element is hidden or not laid out
    if (w < 50 || h < 40) return;
    try {
      fitAddonRef.current.fit();
      const { rows, cols } = termRef.current;
      if (rows > 2 && cols > 2) {
        TauriApi.resizePty(pane.sessionId, rows, cols);
      }
    } catch (e) {
      // ignore
    }
  }, [pane.sessionId]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous DOM elements if re-mounting
    containerRef.current.innerHTML = '';

    const currentTheme = THEMES[config.terminal.theme] || THEMES.waddle_dark;
    const isBgImage = Boolean(config.terminal.background_image && config.terminal.background_image !== 'none');

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
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);

    // Initial immediate fit if container already has dimensions
    if (containerRef.current && containerRef.current.clientWidth > 50 && containerRef.current.clientHeight > 40) {
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

    // Hardware accelerated Canvas rendering
    try {
      const canvasAddon = new CanvasAddon();
      term.loadAddon(canvasAddon);
    } catch (e) {
      console.warn('CanvasAddon fallback:', e);
    }

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Frame 0 fit & focus
    const rafId = requestAnimationFrame(() => {
      if (containerRef.current && containerRef.current.clientWidth > 50 && containerRef.current.clientHeight > 40) {
        try {
          fitAddon.fit();
          const { rows, cols } = term;
          if (rows > 2 && cols > 2) {
            TauriApi.resizePty(pane.sessionId, rows, cols);
          }
          if (isActivePane && isTabActive) {
            focusTerminal();
          }
        } catch (e) {
          // ignore
        }
      }
    });

    // Ensure layout settles (e.g. after CSS transitions, fonts, or window initialization)
    const settleTimeout = setTimeout(() => {
      fitTerminal();
      if (isActivePane && isTabActive) {
        focusTerminal();
      }
    }, 60);

    // Send user input to PTY
    let inputLine = '';
    const onDataDisposable = term.onData((data) => {
      TauriApi.writePty(pane.sessionId, data);

      // Track typed command for AI / Error context
      if (data === '\r' || data === '\n') {
        if (inputLine.trim().length > 0) {
          lastCommandRef.current = inputLine.trim();
          onUpdatePane({ lastCommand: lastCommandRef.current });
        }
        inputLine = '';
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
      term.write(output);
      outputBufferRef.current += output;
      if (outputBufferRef.current.length > 10000) {
        outputBufferRef.current = outputBufferRef.current.slice(-10000);
      }
      onUpdatePane({ lastOutput: outputBufferRef.current });
      detectErrorPatterns(output);
    }).then((unlisten) => {
      unlistenOutput = unlisten;
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
    const pollInterval = setInterval(async () => {
      try {
        const cwd = await TauriApi.getSessionCwd(pane.sessionId);
        if (cwd) {
          const gitStatus = await TauriApi.getGitStatus(cwd);
          const parts = cwd.split('/').filter(Boolean);
          const folderName = parts[parts.length - 1] || '/';
          onUpdatePane({
            cwd,
            title: folderName,
            gitStatus,
          });
        }
      } catch (err) {
        // ignore
      }
    }, 2000);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50 && entry.contentRect.height > 40) {
          fitTerminal();
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(settleTimeout);
      clearInterval(pollInterval);
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
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

  // Update theme & font & background when config changes
  useEffect(() => {
    if (!termRef.current) return;
    const currentTheme = THEMES[config.terminal.theme] || THEMES.waddle_dark;
    const isBgImage = Boolean(config.terminal.background_image && config.terminal.background_image !== 'none');

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
    // If container DOM was ever cleared without term, re-open
    if (termRef.current && containerRef.current && !containerRef.current.querySelector('.xterm')) {
      termRef.current.open(containerRef.current);
    }

    if (isTabActive && isActivePane) {
      const timer = setTimeout(() => {
        fitTerminal();
        focusTerminal();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isTabActive, isActivePane, totalPanes, isZoomed, fitTerminal, focusTerminal]);

  const detectErrorPatterns = (chunk: string) => {
    const errorIndicators = [
      'command not found',
      'No such file or directory',
      'Permission denied',
      'fatal:',
      'Error:',
      'SyntaxError',
      'TypeError',
      'failed to',
      'Segmentation fault',
    ];

    for (const pattern of errorIndicators) {
      if (chunk.includes(pattern)) {
        if (lastCommandRef.current) {
          onErrorDetected(lastCommandRef.current, outputBufferRef.current, 1);
          break;
        }
      }
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
      <div className="pane-terminal-viewport">
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
