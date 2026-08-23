import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { THEMES } from '../theme';
import { AppConfig, TerminalTab } from '../types';
import { TauriApi } from '../services/tauriApi';

interface TerminalPaneProps {
  tab: TerminalTab;
  config: AppConfig;
  isActive: boolean;
  onUpdateTab: (tabId: string, updates: Partial<TerminalTab>) => void;
  onErrorDetected: (command: string, output: string, exitCode: number) => void;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  tab,
  config,
  isActive,
  onUpdateTab,
  onErrorDetected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const outputBufferRef = useRef<string>('');
  const lastCommandRef = useRef<string>('');

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous DOM elements if re-mounting (React 19 StrictMode safety)
    containerRef.current.innerHTML = '';

    const currentTheme = THEMES[config.terminal.theme] || THEMES.waddle_dark;

    const term = new Terminal({
      fontFamily: config.terminal.font_family,
      fontSize: config.terminal.font_size,
      cursorStyle: config.terminal.cursor_style,
      cursorBlink: config.terminal.cursor_blink,
      scrollback: config.terminal.scrollback,
      theme: currentTheme.terminal,
      allowTransparency: true,
      smoothScrollDuration: 100,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(containerRef.current);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Safely fit initial layout
    const timer = setTimeout(() => {
      if (containerRef.current && containerRef.current.clientWidth > 0) {
        try {
          fitAddon.fit();
          const { rows, cols } = term;
          if (rows > 2 && cols > 2) {
            TauriApi.resizePty(tab.sessionId, rows, cols);
          }
        } catch (e) {
          // ignore fit error
        }
      }
    }, 60);

    // Send user input to PTY
    let inputLine = '';
    const onDataDisposable = term.onData((data) => {
      TauriApi.writePty(tab.sessionId, data);

      // Track typed command for error context
      if (data === '\r' || data === '\n') {
        if (inputLine.trim().length > 0) {
          lastCommandRef.current = inputLine.trim();
          onUpdateTab(tab.id, { lastCommand: lastCommandRef.current });
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

    TauriApi.onPtyOutput(tab.sessionId, (output) => {
      term.write(output);
      outputBufferRef.current += output;
      // Keep last 10,000 characters for AI context
      if (outputBufferRef.current.length > 10000) {
        outputBufferRef.current = outputBufferRef.current.slice(-10000);
      }
      onUpdateTab(tab.id, { lastOutput: outputBufferRef.current });

      // Detect error signals
      detectErrorPatterns(output);
    }).then((unlisten) => {
      unlistenOutput = unlisten;
    });

    TauriApi.onPtyExit(tab.sessionId, () => {
      term.writeln('\r\n\x1b[90m[Process completed]\x1b[0m');
    }).then((unlisten) => {
      unlistenExit = unlisten;
    });

    // Poll CWD and Git status periodically
    const pollInterval = setInterval(async () => {
      try {
        const cwd = await TauriApi.getSessionCwd(tab.sessionId);
        if (cwd) {
          const gitStatus = await TauriApi.getGitStatus(cwd);
          const parts = cwd.split('/').filter(Boolean);
          const folderName = parts[parts.length - 1] || '/';
          onUpdateTab(tab.id, {
            cwd,
            title: folderName,
            gitStatus,
          });
        }
      } catch (err) {
        // ignore poll error
      }
    }, 2000);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 20 && entry.contentRect.height > 20) {
          if (fitAddonRef.current && termRef.current) {
            try {
              fitAddonRef.current.fit();
              const { rows, cols } = termRef.current;
              if (rows > 2 && cols > 2) {
                TauriApi.resizePty(tab.sessionId, rows, cols);
              }
            } catch (e) {
              // ignore resize errors
            }
          }
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      clearInterval(pollInterval);
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      if (unlistenOutput) unlistenOutput();
      if (unlistenExit) unlistenExit();
      try {
        term.dispose();
      } catch (e) {
        // ignore dispose error
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [tab.sessionId]);

  // Update theme & font when config changes
  useEffect(() => {
    if (!termRef.current) return;
    const currentTheme = THEMES[config.terminal.theme] || THEMES.waddle_dark;
    termRef.current.options.theme = currentTheme.terminal;
    termRef.current.options.fontSize = config.terminal.font_size;
    termRef.current.options.fontFamily = config.terminal.font_family;
    termRef.current.options.cursorStyle = config.terminal.cursor_style;
    termRef.current.options.cursorBlink = config.terminal.cursor_blink;
    try {
      fitAddonRef.current?.fit();
    } catch (e) {
      // ignore
    }
  }, [config]);

  // Re-fit when becoming active
  useEffect(() => {
    if (isActive && fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
          termRef.current?.focus();
        } catch (e) {
          // ignore
        }
      }, 50);
    }
  }, [isActive]);

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

  return (
    <div
      className="terminal-wrapper"
      style={{ display: isActive ? 'block' : 'none' }}
    >
      <div
        ref={containerRef}
        id={`terminal-${tab.id}`}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
