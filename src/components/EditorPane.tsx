import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode,
  Save,
  Play,
  Sparkles,
  FolderOpen,
  X,
  Check,
  Loader2,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { AppConfig, TerminalContext } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';
import { DangerousCommandModal, isDangerousCommand } from './DangerousCommandModal';

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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

interface EditorPaneProps {
  isOpen: boolean;
  onClose: () => void;
  cwd: string;
  config: AppConfig;
  context: TerminalContext;
  onExecuteInTerminal: (command: string) => void;
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
  const { t } = useI18n();
  const [filePath, setFilePath] = useState('');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirFiles, setDirFiles] = useState<string[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [confirmDangerousCmd, setConfirmDangerousCmd] = useState<string | null>(null);

  // AI Edit popup
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Refresh directory files
  const loadDirectoryFiles = async () => {
    if (cwd) {
      try {
        const files = await TauriApi.listDirectoryFiles(cwd);
        setDirFiles(files);
      } catch (err) {
        console.warn('Failed to list files:', err);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDirectoryFiles();
    }
  }, [isOpen, cwd]);

  useEffect(() => {
    if (targetFilePath) {
      handleOpenFile(targetFilePath);
    }
  }, [targetFilePath]);

  useEffect(() => {
    if (!isAiModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsAiModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAiModalOpen]);

  // Open a file
  const handleOpenFile = async (name: string) => {
    const fullPath = name.startsWith('/') ? name : `${cwd.replace(/\/$/, '')}/${name}`;
    setIsLoadingFile(true);
    try {
      const text = await TauriApi.readFile(fullPath);
      setFilePath(fullPath);
      setContent(text);
      setIsDirty(false);
    } catch (err) {
      alert(`${t.editor.openFailed}: ${err}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Save file
  const handleSave = async () => {
    if (!filePath.trim()) {
      const defaultName = `${cwd.replace(/\/$/, '')}/script.sh`;
      setFilePath(defaultName);
      await TauriApi.writeFile(defaultName, content);
    } else {
      await TauriApi.writeFile(filePath, content);
    }

    setIsDirty(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
    loadDirectoryFiles();
  };

  // Run in terminal
  const handleRun = () => {
    let cmd = '';
    if (filePath.endsWith('.py')) {
      cmd = `python3 "${filePath}"`;
    } else if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
      cmd = `node "${filePath}"`;
    } else if (filePath.endsWith('.sh') || filePath.endsWith('.bash')) {
      cmd = `bash "${filePath}"`;
    } else if (filePath.endsWith('.rs')) {
      cmd = `cargo run`;
    } else if (filePath) {
      cmd = `cat "${filePath}"`;
    } else {
      // Execute buffer directly
      cmd = content;
    }

    if (!cmd.trim()) return;

    if (isDangerousCommand(cmd) || (!filePath && isDangerousCommand(content))) {
      setConfirmDangerousCmd(cmd);
    } else {
      onExecuteInTerminal(cmd);
    }
  };

  // AI Edit with Ollama
  const handleAiEdit = async () => {
    if (!aiInstruction.trim() || isAiEditing) return;
    setIsAiEditing(true);
    setAiError(null);

    try {
      const fileName = filePath ? filePath.split('/').pop() : 'script.sh';
      const updatedCode = await TauriApi.aiEditCode(
        aiInstruction.trim(),
        content,
        fileName,
        context
      );
      setContent(updatedCode);
      setIsDirty(true);
      setIsAiModalOpen(false);
      setAiInstruction('');
    } catch (err: any) {
      setAiError(String(err));
    } finally {
      setIsAiEditing(false);
    }
  };

  // Handle Tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      e.stopPropagation();
      setIsAiModalOpen(true);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newContent =
        content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setIsDirty(true);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

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
    }
  };

  const highlightedHtml = React.useMemo(() => {
    return highlightSyntax(content, filePath);
  }, [content, filePath]);

  const lineCount = Math.max(1, content.split('\n').length);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  if (!isOpen) return null;

  return (
    <aside
      className="editor-container"
      style={{
        width: '460px',
        height: '100%',
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 24,
      }}
    >
      {/* Editor Header */}
      <div
        style={{
          height: '42px',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <FileCode size={16} color="#38bdf8" />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg-main)' }}>
            {t.editor.title}
          </span>
          {isDirty && (
            <span style={{ color: 'var(--warning)', fontWeight: 700 }}>*</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {onRichPreview && filePath && (
            <button
              className="action-btn"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={() => {
                const name = filePath.split('/').pop() || 'file';
                onRichPreview(filePath, name, content);
              }}
              title="リッチプレビュー (Markdown / CSV / JSON)"
            >
              <Eye size={13} color="#a6e3a1" />
              <span>プレビュー</span>
            </button>
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
            style={{ padding: '3px 10px', fontSize: '11px' }}
            onClick={handleSave}
            title={t.editor.saveTooltip}
          >
            {saveSuccess ? <Check size={13} /> : <Save size={13} />}
            <span>{saveSuccess ? t.common.saved : t.common.save}</span>
          </button>

          <button className="action-btn" onClick={onClose} title={t.editor.closeTooltip}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* File Path & Quick Open Bar */}
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
          value={filePath}
          onChange={(e) => {
            setFilePath(e.target.value);
            setIsDirty(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filePath.trim()) {
              handleOpenFile(filePath.trim());
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

      {/* Editor Main Text Area with Line Numbers */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-main)',
        }}
      >
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
            }}
          />

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setIsDirty(true);
            }}
            onKeyDown={handleKeyDown}
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
              caretColor: 'var(--fg-main)',
              border: 'none',
              outline: 'none',
              fontFamily: config.terminal.font_family,
              fontSize: `${config.terminal.font_size}px`,
              lineHeight: '1.5',
              resize: 'none',
              whiteSpace: 'pre',
              overflow: 'auto',
              boxSizing: 'border-box',
              zIndex: 1,
            }}
            placeholder={t.editor.textareaPlaceholder}
          />
        </div>
      </div>

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
            if (confirmDangerousCmd) onExecuteInTerminal(confirmDangerousCmd);
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
    </aside>
  );
};
