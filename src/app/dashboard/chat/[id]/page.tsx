'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from 'ai/react';
import type { Message } from 'ai';
import { useParams } from 'next/navigation';
import { MODELS } from '@/lib/models';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, User, Search, FileText, ArrowUp, ChevronDown, 
  ChevronRight, Copy, Check, Terminal 
} from 'lucide-react';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [chatTitle, setChatTitle] = useState('New Chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append } = useChat({
    api: '/api/chat',
    body: { modelId: selectedModel, chatId },
    onFinish: async (message: Message) => {
      if (message.content && message.content.trim()) {
        await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            role: 'assistant', 
            content: message.content,
            toolInvocations: message.toolInvocations 
          }),
        });

        if (messages.length <= 1) {
          const title = message.content.slice(0, 60).replace(/[#*_\n]/g, '').trim() || 'Chat';
          setChatTitle(title);
          await fetch('/api/chats', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, title }),
          });
        }
      }
    },
    onError: (error: any) => {
      let msg = error.message || String(error);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch (e) {}
      alert(`Chat Error: ${msg || 'An unknown error occurred. Please check your API keys.'}`);
    }
  });

  useEffect(() => {
    const initialPromptKey = `initial_prompt_${chatId}`;
    const initialPrompt = sessionStorage.getItem(initialPromptKey);
    
    if (initialPrompt) {
      sessionStorage.removeItem(initialPromptKey);
      setTimeout(() => {
        append({
          role: 'user',
          content: initialPrompt,
        });
        
        fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: initialPrompt }),
        });
      }, 100);
    }
  }, [chatId, append]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/chats/${chatId}/messages`);
    const data = await res.json();
    if (data.messages?.length) {
      setMessages(data.messages.map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        toolInvocations: m.tool_result || undefined,
      })));
    }
  }, [chatId, setMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]); // scroll on new message or loading state change

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    await fetch(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', content: input }),
    });

    handleSubmit(e);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <>
      <div className="chat-header">
        <span className="chat-header-title">{chatTitle}</span>
        <select
          className="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider})
            </option>
          ))}
        </select>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state" style={{ height: '100%' }}>
            <div className="empty-icon-wrap"><Bot size={36} /></div>
            <h2>Start your research</h2>
            <p>Ask me anything. I&apos;ll search the web and synthesize a thorough answer.</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message: Message) => (
            <motion.div 
              key={message.id} 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`message ${message.role}`}
            >
              <div className="message-avatar">
                {message.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
              </div>
              
              <div className="message-bubble">
                {/* Render Tool Invocations */}
                {message.toolInvocations?.map((tool: any, idx: number) => (
                  <ToolInvocationCard key={idx} tool={tool} />
                ))}

                {/* Render Content */}
                {message.content && (
                  <div className="markdown-prose">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const isInline = !match && !String(children).includes('\n');
                          return !isInline ? (
                            <CodeBlock language={match?.[1]} value={String(children).replace(/\n$/, '')} />
                          ) : (
                            <code className={className} {...props}>{children}</code>
                          );
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="message assistant"
            >
              <div className="message-avatar"><Bot size={20} /></div>
              <div className="message-bubble" style={{ padding: '8px 16px' }}>
                <div className="typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form onSubmit={onSubmit} className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Shift+Enter for new line)"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <span className="spinner" /> : <ArrowUp size={20} strokeWidth={2.5} />}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          MicroManus can make mistakes. Consider verifying critical information.
        </div>
      </div>
    </>
  );
}

// Collapsible Tool Invocation Component
function ToolInvocationCard({ tool }: { tool: any }) {
  const [expanded, setExpanded] = useState(false);
  const isSearch = tool.toolName === 'web_search';
  const isGenerating = !('result' in tool);
  
  return (
    <div className="tool-call-card">
      <div 
        className="tool-call-header" 
        onClick={() => setExpanded(!expanded)}
      >
        {isGenerating ? (
          <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', marginRight: '4px' }} />
        ) : (
          expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
        )}
        
        {isSearch ? <Search size={14} className="text-cyan" /> : <Terminal size={14} className="text-accent" />}
        <span>{isSearch ? 'Web Search' : tool.toolName}</span>
        
        {tool.args?.query && (
          <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
            "{tool.args.query}"
          </span>
        )}
      </div>

      <AnimatePresence>
        {expanded && 'result' in tool && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="tool-call-result"
          >
            {isSearch && tool.result?.summary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ lineHeight: 1.6, color: 'var(--text-primary)' }}>{tool.result.summary}</p>
                <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Sources:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                    {(tool.result.sources || []).map((r: any, ri: number) => (
                      <a key={ri} href={r.url} target="_blank" rel="noopener noreferrer" className="badge badge-accent" style={{ textDecoration: 'none', textTransform: 'none' }}>
                        {r.title.slice(0, 40)}{r.title.length > 40 ? '...' : ''}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : isSearch && tool.result?.results ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(tool.result.results as Array<{ title: string; url: string; snippet: string }>).map((r, ri) => (
                  <div key={ri}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="tool-link" style={{ fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                      {r.title}
                    </a>
                    <p style={{ lineHeight: 1.5 }}>{r.snippet}</p>
                  </div>
                ))}
              </div>
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'inherit' }}>
                {JSON.stringify(tool.result, null, 2)}
              </pre>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Code block with copy button
function CodeBlock({ language, value }: { language?: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <pre>
      <div className="code-block-header">
        <span>{language || 'text'}</span>
        <button onClick={onCopy} className="copy-btn">
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>
      <code>{value}</code>
    </pre>
  );
}
