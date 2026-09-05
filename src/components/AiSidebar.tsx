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
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleRun = (cmd: string) => {
    if (isDangerousCommand(cmd)) {
      setConfirmCmd(cmd);
    } else {
      onExecuteCommand(cmd);
    }
  };
  const activeStreamCleanupRef = useRef<(() => void) | null>(null);

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
        <div style={{ display: 'flex', gap: '4px' }}>
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
