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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'こんにちは！Waddle AI アシスタントです。\nターミナルでの作業やトラブルシューティング、コマンドの生成など何でもご相談ください。\n\n例:\n- `カレントディレクトリ内の重複ファイルを探すコマンドは？`\n- `直前のエラー出力を解説して`\n- `このプロジェクトのビルド手順を教えて`',
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
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
        content: 'チャット履歴をクリアしました。何かお手伝いできることはありますか？',
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
          <span>Waddle Copilot</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="action-btn"
            onClick={handleClearHistory}
            title="Clear Chat History"
          >
            <Trash2 size={13} />
          </button>
          <button className="action-btn" onClick={onClose} title="Close Sidebar">
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
                              title="Copy code"
                            >
                              {copiedCode === codeContent ? (
                                <Check size={12} color="#10b981" />
                              ) : (
                                <Copy size={12} />
                              )}
                              <span>Copy</span>
                            </button>
                            <button
                              className="action-btn"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => onInsertCommand(codeContent)}
                              title="Insert to terminal"
                            >
                              <CornerDownLeft size={12} />
                              <span>Insert</span>
                            </button>
                            <button
                              className="btn-primary"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => onExecuteCommand(codeContent)}
                              title="Run immediately"
                            >
                              <Play size={12} />
                              <span>Run</span>
                            </button>
                          </div>
                        </div>
                      );
                    },
                  }}
                >
                  {msg.content || (isStreaming ? 'Thinking...' : '')}
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
            placeholder="AIに質問する (Shift+Enterで改行)"
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
    </aside>
  );
};
