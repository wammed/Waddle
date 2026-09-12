import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Trash2,
  Play,
  CornerDownLeft,
  Copy,
  Check,
  Loader2,
  Download,
  FileText,
  FileJson,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, TerminalContext } from '../types';
import { TauriApi } from '../services/tauriApi';
import { useI18n } from '../i18n';
import { DangerousCommandModal, isDangerousCommand } from './DangerousCommandModal';

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  context: TerminalContext;
  onInsertCommand: (command: string) => void;
  onExecuteCommand: (command: string) => void;
}

export const AiSidebar: React.FC<AiSidebarProps> = ({
  isOpen,
  onClose,
  context,
  onInsertCommand,
  onExecuteCommand,
}) => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t.copilot.welcomeMessage,
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirmCmd, setConfirmCmd] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const downloadFile = (filename: string, mimeType: string, content: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const header = `# Waddle AI Chat Export\n\n- Date: ${now.toLocaleString()}\n- Working Directory: \`${context.cwd}\`\n- Shell: \`${context.shell}\`\n\n---\n\n`;
    const body = messages
      .map((msg) => {
        const roleName = msg.role === 'user' ? 'User' : 'Assistant';
        return `### ${roleName}\n\n${msg.content}\n`;
      })
      .join('\n---\n\n');
    downloadFile(`waddle-ai-chat-${timestamp}.md`, 'text/markdown;charset=utf-8', header + body);
    setIsExportMenuOpen(false);
  };

  const handleExportJson = () => {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const exportData = {
      exportedAt: now.toISOString(),
      context,
      messages,
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    downloadFile(`waddle-ai-chat-${timestamp}.json`, 'application/json;charset=utf-8', jsonStr);
    setIsExportMenuOpen(false);
  };

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExportMenuOpen]);

  const handleRun = (cmd: string) => {
    if (isDangerousCommand(cmd)) {
      setConfirmCmd(cmd);
    } else {
      onExecuteCommand(cmd);
    }
  };
  const activeStreamCleanupRef = useRef<(() => void) | null>(null);

  const hasErrorInRecentOutput = React.useMemo(() => {
    if (!context.recent_output) return false;
    const lower = context.recent_output.toLowerCase();
    return (
      lower.includes('error') ||
      lower.includes('fatal') ||
      lower.includes('failed') ||
      lower.includes('command not found') ||
      lower.includes('permission denied') ||
      lower.includes('no such file') ||
      lower.includes('traceback')
    );
  }, [context.recent_output]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: input.trim(),
    };

    const assistantMsgId = 'assistant-' + Date.now();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    };

    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    const chatId = 'chat-' + Date.now();

    const cleanup = await TauriApi.streamAiChat(
      chatId,
      newMessages,
      context,
      (chunk) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      },
      () => {
        setIsStreaming(false);
      }
    );

    activeStreamCleanupRef.current = cleanup;
  };

  const handleClearHistory = () => {
    if (activeStreamCleanupRef.current) {
      activeStreamCleanupRef.current();
    }
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t.copilot.welcomeMessage,
      },
    ]);
    setIsStreaming(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <aside className="ai-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Bot size={16} />
          <span>{t.copilot.title}</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', position: 'relative' }}>
          <div ref={exportMenuRef} style={{ position: 'relative' }}>
            <button
              className={`action-btn ${isExportMenuOpen ? 'active' : ''}`}
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              title={t.copilot.exportChat}
              disabled={messages.length <= 1}
            >
              <Download size={13} />
            </button>
            {isExportMenuOpen && (
              <div
                className="ai-export-dropdown"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  backgroundColor: '#1e2330',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  minWidth: '180px',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <button
                  className="export-item-btn"
                  onClick={handleExportMarkdown}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileText size={13} color="#38bdf8" />
                  <span>{t.copilot.exportMarkdown}</span>
                </button>
                <button
                  className="export-item-btn"
                  onClick={handleExportJson}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <FileJson size={13} color="#f59e0b" />
                  <span>{t.copilot.exportJson}</span>
                </button>
              </div>
            )}
          </div>
          <button
            className="action-btn"
            onClick={handleClearHistory}
            title={t.common.clear}
          >
            <Trash2 size={13} />
          </button>
          <button className="action-btn" onClick={onClose} title={t.common.close}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="chat-history">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className={`chat-bubble ${msg.role}`}>
            {msg.role === 'assistant' ? (
              <div className="chat-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeContent = String(children).replace(/\n$/, '');
                      const isInline = !match && !codeContent.includes('\n');

                      if (isInline) {
                        return <code {...props}>{children}</code>;
                      }

                      return (
                        <div style={{ position: 'relative', margin: '8px 0' }}>
                          <pre>
                            <code>{children}</code>
                          </pre>
                          <div className="chat-code-block-actions">
                            <button
                              className="action-btn"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => handleCopy(codeContent)}
                              title={t.common.copy}
                            >
                              {copiedCode === codeContent ? (
                                <Check size={12} color="#10b981" />
                              ) : (
                                <Copy size={12} />
                              )}
                              <span>{copiedCode === codeContent ? t.common.copied : t.common.copy}</span>
                            </button>
                            <button
                              className="action-btn"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => onInsertCommand(codeContent)}
                              title={t.common.insert}
                            >
                              <CornerDownLeft size={12} />
                              <span>{t.common.insert}</span>
                            </button>
                            <button
                              className="btn-primary"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => handleRun(codeContent)}
                              title={t.common.run}
                            >
                              <Play size={12} />
                              <span>{t.common.run}</span>
                            </button>
                          </div>
                        </div>
                      );
                    },
                  }}
                >
                  {msg.content || (isStreaming ? `${t.common.loading}...` : '')}
                </ReactMarkdown>
              </div>
            ) : (
              <div>{msg.content}</div>
            )}
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      <div className="chat-input-area">
        {/* Quick Error Diagnostic Chip */}
        {hasErrorInRecentOutput && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              padding: '6px 10px',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#fda4af',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <AlertCircle size={12} color="#f43f5e" />
              <span>直前のエラー: <code>{context.recent_command || 'Command'}</code></span>
            </div>
            <button
              type="button"
              className="action-btn"
              style={{
                fontSize: '10px',
                padding: '2px 8px',
                background: 'rgba(244, 63, 94, 0.2)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#f8fafc',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                const errSnippet = context.recent_output ? context.recent_output.slice(-1000).trim() : '';
                setInput(`直前のコマンド \`${context.recent_command || ''}\` で以下のエラーが発生しました。原因と具体的な修正コマンドを教えてください:\n\n\`\`\`\n${errSnippet}\n\`\`\``);
              }}
            >
              <Sparkles size={10} color="#38bdf8" style={{ marginRight: 3 }} />
              エラー修正を質問
            </button>
          </div>
        )}

        <div className="chat-input-box">
          <textarea
            className="chat-textarea"
            placeholder={t.copilot.promptPlaceholder}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            id="btn-send-chat"
            className="btn-primary"
            style={{ padding: '6px 10px', borderRadius: '6px' }}
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
          >
            {isStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </button>
        </div>
      </div>

      {confirmCmd && (
        <DangerousCommandModal
          isOpen={true}
          command={confirmCmd}
          onConfirmExecute={() => {
            onExecuteCommand(confirmCmd);
            setConfirmCmd(null);
          }}
          onSafeInsert={() => {
            onInsertCommand(confirmCmd);
            setConfirmCmd(null);
          }}
          onClose={() => setConfirmCmd(null)}
        />
      )}
    </aside>
  );
};
