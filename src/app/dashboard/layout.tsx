'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MODELS } from '@/lib/models';
import { Chat } from '@/types';
import { truncate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Plus, Trash2, BarChart2, Key, LogOut, 
  Menu, Bot, Zap, X
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [credits, setCredits] = useState(0);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [keys, setKeys] = useState<{ provider: string; model: string }[]>([]);
  const [newKey, setNewKey] = useState({ provider: 'openai', apiKey: '' });
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const loadChats = useCallback(async () => {
    const res = await fetch('/api/chats');
    const data = await res.json();
    setChats(data.chats || []);
  }, []);

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      setCredits(data?.credits || 0);
    }
  }, [supabase]);

  const loadKeys = useCallback(async () => {
    const res = await fetch('/api/keys');
    const data = await res.json();
    setKeys(data.keys || []);
  }, []);

  useEffect(() => {
    loadChats();
    loadProfile();
    loadKeys();
  }, [loadChats, loadProfile, loadKeys]);

  useEffect(() => {
    loadChats();
    loadProfile();
  }, [pathname, loadChats, loadProfile]);

  const createNewChat = async () => {
    const defaultModel = MODELS[0];
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: defaultModel.id, provider: defaultModel.provider }),
    });
    const data = await res.json();
    if (data.chat) {
      setChats(prev => [data.chat, ...prev]);
      setSidebarOpen(false);
      router.push(`/dashboard/chat/${data.chat.id}`);
    }
  };

  const saveApiKey = async () => {
    if (!newKey.apiKey) return;
    setSaving(true);
    await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newKey),
    });
    setNewKey({ provider: 'openai', apiKey: '' });
    await loadKeys();
    setSaving(false);
  };

  const deleteKey = async (provider: string) => {
    await fetch('/api/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    await loadKeys();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const activeChatId = pathname.split('/dashboard/chat/')[1];

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;
    
    await fetch('/api/chats', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId }),
    });
    
    setChats(prev => prev.filter(c => c.id !== chatId));
    
    if (activeChatId === chatId) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="dashboard">
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ color: 'var(--accent)' }}><Bot size={24} /></div>
            <span className="sidebar-logo">MicroManus</span>
          </div>
          <div className="credit-badge">
            <Zap size={14} /> {credits}
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <button className="btn btn-primary w-full" onClick={createNewChat} style={{ gap: '6px' }}>
            <Plus size={18} /> New Research
          </button>
        </div>

        <div className="sidebar-chats">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`sidebar-chat-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => {
                router.push(`/dashboard/chat/${chat.id}`);
                setSidebarOpen(false);
              }}
            >
              <MessageSquare size={16} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {truncate(chat.title, 24)}
              </span>
              <button
                onClick={(e) => deleteChat(chat.id, e)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px'
                }}
                title="Delete chat"
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {chats.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 16px' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.85rem' }}>No research chats yet.<br/>Start a new one!</p>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-nav-btn" onClick={() => { router.push('/dashboard/stats'); setSidebarOpen(false); }}>
            <BarChart2 size={18} /> Cost & Stats
          </button>
          <button className="sidebar-nav-btn" onClick={() => setShowKeyModal(true)}>
            <Key size={18} /> API Keys
          </button>
          <button className="sidebar-nav-btn" onClick={handleLogout} style={{ color: 'var(--red)' }}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      <AnimatePresence>
        {showKeyModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay" 
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowKeyModal(false);
            }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="modal glass-card"
            >
              <h2 className="modal-title flex items-center gap-2"><Key size={20} className="text-accent" /> API Keys</h2>
              <p className="modal-desc">Add your provider API keys. Keys are AES-256 encrypted before storage.</p>

              {keys.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  {keys.map((k) => (
                    <div key={k.provider} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', marginBottom: '12px'
                    }}>
                      <div className="flex items-center gap-3">
                        <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{k.provider}</span>
                        <span style={{ color: 'var(--green)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)' }} /> Connected
                        </span>
                      </div>
                      <button className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                        onClick={() => deleteKey(k.provider)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <select
                  value={newKey.provider}
                  onChange={(e) => setNewKey(prev => ({ ...prev, provider: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="google">Google (Gemini)</option>
                </select>
                <input
                  type="password"
                  placeholder={`Enter ${newKey.provider} API key`}
                  value={newKey.apiKey}
                  onChange={(e) => setNewKey(prev => ({ ...prev, apiKey: e.target.value }))}
                  style={{ width: '100%' }}
                />
                <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => setShowKeyModal(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={saveApiKey} disabled={saving || !newKey.apiKey}>
                    {saving ? <span className="spinner" /> : 'Securely Save Key'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
