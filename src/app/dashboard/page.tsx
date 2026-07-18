'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MODELS } from '@/lib/models';
import { Bot, Search, FileText, BrainCircuit, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [input, setInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();

  const handleStart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      sessionStorage.setItem(`initial_prompt_${data.chat.id}`, input);
      router.push(`/dashboard/chat/${data.chat.id}`);
    } else {
      setIsStarting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  };

  const suggestions = [
    { text: "Find the latest news on AI models", icon: <Search size={14} /> },
    { text: "Write a research report on Quantum Computing", icon: <FileText size={14} /> },
    { text: "Analyze the economic impact of AGI", icon: <BrainCircuit size={14} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '840px', margin: '0 auto', position: 'relative' }}>
      
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state"
        >
          <div className="empty-icon-wrap">
            <Bot size={36} />
          </div>
          <h2>What would you like to research?</h2>
          <p>The agent will search the live web and synthesize a complete answer.</p>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '12px' }}>
            {suggestions.map((s, i) => (
              <motion.button 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 + 0.2 }}
                className="suggestion-pill"
                onClick={() => {
                  setInput(s.text);
                  // We need to wait a tick for state to update before submitting
                  setTimeout(() => {
                    const form = document.getElementById('start-chat-form');
                    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }, 10);
                }}
              >
                {s.icon} {s.text}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="chat-input-area"
      >
        <form id="start-chat-form" onSubmit={handleStart} className="chat-input-wrapper" style={{ paddingRight: '60px' }}>
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything... (Shift+Enter for new line)"
            rows={1}
            disabled={isStarting}
            style={{ paddingRight: '0' }}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={isStarting || !input.trim()}
          >
            {isStarting ? (
              <span className="spinner" />
            ) : (
              <ArrowUp size={20} strokeWidth={2.5} />
            )}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          MicroManus can make mistakes. Consider verifying critical information.
        </div>
      </motion.div>
    </div>
  );
}
