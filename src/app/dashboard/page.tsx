'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MODELS } from '@/lib/models';

export default function DashboardPage() {
  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStarting) return;
    setIsStarting(true);

    const defaultModel = MODELS[0];
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: defaultModel.id, provider: defaultModel.provider }),
    });
    const data = await res.json();
    
    if (data.chat) {
      // Use sessionStorage to pass the initial prompt to the chat page
      sessionStorage.setItem(`initial_prompt_${data.chat.id}`, input);
      router.push(`/dashboard/chat/${data.chat.id}`);
    } else {
      setIsStarting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStart(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div className="empty-state" style={{ flex: 1, display: 'flex', justifyContent: 'center', border: 'none' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="empty-state-icon">🔬</div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Welcome to MicroManus</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1.1rem' }}>
            What would you like to research today?
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className="badge badge-accent">🔍 Web Search</span>
            <span className="badge badge-green">📄 PDF Reports</span>
            <span className="badge badge-orange">🧠 Multi-step Reasoning</span>
          </div>
        </div>
      </div>

      <div className="chat-input-area" style={{ border: 'none', paddingBottom: '40px' }}>
        <form onSubmit={handleStart} className="chat-input-wrapper" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Shift+Enter for new line)"
            rows={1}
            disabled={isStarting}
            style={{ minHeight: '52px' }}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={isStarting || !input.trim()}
          >
            {isStarting ? (
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
    </div>
  );
}
