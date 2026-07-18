
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from 'ai/react';
import type { Message } from 'ai';
import { useParams } from 'next/navigation';
import { MODELS } from '@/lib/models';

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
      // Save assistant message to DB
      await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'assistant', content: message.content }),
      });

      // Auto-title on first exchange
      if (messages.length <= 1 && message.content) {
        const title = message.content.slice(0, 60).replace(/[#*_\n]/g, '').trim() || 'Chat';
        setChatTitle(title);
        await fetch('/api/chats', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, title }),
        });
      }
    },
    onError: (error: any) => {
      // Show error in an alert or push a system message so the user sees it immediately
      let msg = error.message || String(error);
      try {
        const parsed = JSON.parse(msg);
        if (parsed.error) msg = parsed.error;
      } catch (e) {}
      alert(`Chat Error: ${msg || 'An unknown error occurred. Please check your API keys.'}`);
    }
  });

  // Handle initial prompt from Dashboard
  useEffect(() => {
    const initialPromptKey = `initial_prompt_${chatId}`;
    const initialPrompt = sessionStorage.getItem(initialPromptKey);
    
    if (initialPrompt) {
      sessionStorage.removeItem(initialPromptKey);
      // Give the UI a tiny tick to mount, then auto-submit the initial prompt
      setTimeout(() => {
        append({
          role: 'user',
          content: initialPrompt,
        });
        
        // Save user message to DB
        fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: initialPrompt }),
        });
      }, 100);
    }
  }, [chatId, append]);

  // Load existing messages
  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/chats/${chatId}/messages`);
    const data = await res.json();
    if (data.messages?.length) {
      setMessages(data.messages.map((m: { id: string; role: string; content: string }) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })));
    }
  }, [chatId, setMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Save user message to DB
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

  const renderContent = (content: string) => {
    // Simple markdown-like rendering
    return content.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} style={{ margin: '12px 0 6px', fontWeight: 600 }}>{line.slice(4)}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} style={{ margin: '14px 0 6px', fontWeight: 700 }}>{line.slice(3)}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} style={{ margin: '16px 0 8px', fontWeight: 700 }}>{line.slice(2)}</h2>;
      if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} style={{ marginLeft: '16px', marginBottom: '4px' }}>{formatInline(line.slice(2))}</li>;
      if (line.match(/^\d+\. /)) return <li key={i} style={{ marginLeft: '16px', marginBottom: '4px', listStyleType: 'decimal' }}>{formatInline(line.replace(/^\d+\. /, ''))}</li>;
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} style={{ marginBottom: '6px' }}>{formatInline(line)}</p>;
    });
  };

  const formatInline = (text: string) => {
    // Bold
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      // Links
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      const segments: (string | React.ReactNode)[] = [];
      let lastIndex = 0;
      let match;
      while ((match = linkRegex.exec(part)) !== null) {
        if (match.index > lastIndex) segments.push(part.slice(lastIndex, match.index));
        segments.push(<a key={`${i}-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < part.length) segments.push(part.slice(lastIndex));
      return segments.length > 0 ? <span key={i}>{segments}</span> : part;
    });
  };

  return (
    <>
      {/* Header */}
      <div className="chat-header">
        <span className="chat-header-title">{chatTitle}</span>
        <select
          className="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          id="model-selector"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider})
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔬</div>
            <h3>Start your research</h3>
            <p>Ask me anything. I&apos;ll search the web and synthesize a thorough answer.</p>
          </div>
        )}

        {messages.map((message: Message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-avatar">
              {message.role === 'assistant' ? 'M' : 'U'}
            </div>
            <div className="message-bubble">
              {/* Show tool invocations */}
              {message.toolInvocations?.map((tool: any, idx: number) => (
                <div key={idx} className="tool-call-card">
                  <div className="tool-call-header">
                    {tool.toolName === 'web_search' ? '🔍' : '📄'} {tool.toolName === 'web_search' ? 'Searching the web' : 'Generating report'}
                    {('args' in tool) && tool.args && typeof tool.args === 'object' && 'query' in tool.args ? `: "${(tool.args as { query: string }).query}"` : ''}
                  </div>
                  {'result' in tool && tool.result && (
                    <div className="tool-call-result">
                      {tool.toolName === 'web_search' && typeof tool.result === 'object' && tool.result !== null && 'results' in tool.result ? (
                        <div>
                          {(tool.result as { results: Array<{ title: string; url: string; snippet: string }> }).results.map((r, ri) => (
                            <div key={ri} style={{ marginBottom: '6px' }}>
                              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', fontSize: '0.8rem' }}>
                                {r.title}
                              </a>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{r.snippet}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre style={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(tool.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                  {!('result' in tool) && (
                    <div className="thinking">
                      <div className="thinking-dots">
                        <span /><span /><span />
                      </div>
                      Processing...
                    </div>
                  )}
                </div>
              ))}
              {message.content && renderContent(message.content)}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="message assistant">
            <div className="message-avatar">M</div>
            <div className="message-bubble">
              <div className="thinking">
                <div className="thinking-dots">
                  <span /><span /><span />
                </div>
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <form onSubmit={onSubmit} className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything... (Shift+Enter for new line)"
            rows={1}
            disabled={isLoading}
            id="chat-input"
          />
          <button
            type="submit"
            className="send-btn"
            disabled={isLoading || !input.trim()}
            id="send-btn"
          >
            {isLoading ? (
              <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
