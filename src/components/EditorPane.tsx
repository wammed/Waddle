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
} from 'lucide-react';
import { AppConfig, TerminalContext } from '../types';
import { TauriApi } from '../services/tauriApi';

interface EditorPaneProps {
  isOpen: boolean;
  onClose: () => void;
  cwd: string;
  config: AppConfig;
  context: TerminalContext;
  onExecuteInTerminal: (command: string) => void;
  targetFilePath?: string | null;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  isOpen,
  onClose,
  cwd,
  config,
  context,
  onExecuteInTerminal,
  targetFilePath,
}) => {
  const [filePath, setFilePath] = useState('');
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirFiles, setDirFiles] = useState<string[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // AI Edit popup
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

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
      alert(`ファイルを開けませんでした: ${err}`);
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
    if (filePath.endsWith('.py')) {
      onExecuteInTerminal(`python3 "${filePath}"`);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
      onExecuteInTerminal(`node "${filePath}"`);
    } else if (filePath.endsWith('.sh') || filePath.endsWith('.bash')) {
      onExecuteInTerminal(`bash "${filePath}"`);
    } else if (filePath.endsWith('.rs')) {
      onExecuteInTerminal(`cargo run`);
    } else if (filePath) {
      onExecuteInTerminal(`cat "${filePath}"`);
    } else {
      // Execute buffer directly
      onExecuteInTerminal(content);
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

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

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
            Editor
          </span>
          {isDirty && (
            <span style={{ color: 'var(--warning)', fontWeight: 700 }}>*</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="action-btn"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setIsAiModalOpen(true)}
            title="AI Code Assistant (Ctrl+Shift+K)"
          >
            <Sparkles size={13} color="#38bdf8" />
            <span>AI Edit</span>
          </button>

          <button
            className="action-btn"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={handleRun}
            title="Run in Terminal"
          >
            <Play size={13} color="#34d399" />
            <span>Run</span>
          </button>

          <button
            className="btn-primary"
            style={{ padding: '3px 10px', fontSize: '11px' }}
            onClick={handleSave}
            title="Save file (Ctrl+S)"
          >
            {saveSuccess ? <Check size={13} /> : <Save size={13} />}
            <span>{saveSuccess ? 'Saved' : 'Save'}</span>
          </button>

          <button className="action-btn" onClick={onClose} title="Close Editor">
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
          placeholder="ファイルパス (例: script.sh または /path/to/file)"
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
          title="Reload directory files"
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
              ファイル選択...
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
            width: '40px',
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
          }}
        >
          {lineNumbers.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>

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
            flex: 1,
            height: '100%',
            padding: '10px',
            background: 'transparent',
            color: 'var(--fg-main)',
            border: 'none',
            outline: 'none',
            fontFamily: config.terminal.font_family,
            fontSize: `${config.terminal.font_size}px`,
            lineHeight: '1.5',
            resize: 'none',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
          }}
          placeholder="# スクリプトやコードをここに入力... (Ctrl+Sで保存, Ctrl+Shift+KでAI編集)"
        />
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
                <span>Ollama AI Code Assistant</span>
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
              placeholder="コードへの指示を入力 (例: エラーハンドリングを追加して, 非同期処理にリファクタリングして, コメントを追加して)"
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleAiEdit();
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
                キャンセル
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
                <span>AIで編集を適用</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
