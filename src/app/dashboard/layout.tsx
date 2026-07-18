'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { MODELS } from '@/lib/models';
import { Chat } from '@/types';
import { truncate } from '@/lib/utils';

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

  // Refresh sidebar when pathname changes (e.g. after creating a new chat)
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

  return (
    <div className="dashboard">
      {/* Mobile hamburger */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">MicroManus</span>
          <span className="credit-badge">⚡ {credits}</span>
        </div>

        <div style={{ padding: '12px' }}>
          <button className="btn btn-primary w-full" onClick={createNewChat} id="new-chat-btn">
            + New Research
          </button>
        </div>

        <div className="sidebar-chats">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className={`sidebar-chat-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => {
                router.push(`/dashboard/chat/${chat.id}`);
                setSidebarOpen(false);
              }}
            >
              <span>💬</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {truncate(chat.title, 28)}
              </span>
            </button>
          ))}
          {chats.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '20px' }}>
              No chats yet. Start a new one!
            </p>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-nav-btn" onClick={() => { router.push('/dashboard/stats'); setSidebarOpen(false); }}>
            📊 Cost & Stats
          </button>
          <button className="sidebar-nav-btn" onClick={() => setShowKeyModal(true)}>
            🔑 API Keys
          </button>
          <button className="sidebar-nav-btn" onClick={handleLogout}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {children}
      </main>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setShowKeyModal(false);
        }}>
          <div className="modal animate-fade">
            <h2 className="modal-title">API Keys</h2>
            <p className="modal-desc">Add your provider API keys. Keys are encrypted before storage.</p>

            {/* Existing keys */}
            {keys.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                {keys.map((k) => (
                  <div key={k.provider} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>{k.provider}</span>
                      <span style={{ marginLeft: '8px', color: 'var(--green)', fontSize: '0.75rem' }}>●  Connected</span>
                    </div>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => deleteKey(k.provider)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new key */}
            <div className="flex flex-col gap-md">
              <select
                value={newKey.provider}
                onChange={(e) => setNewKey(prev => ({ ...prev, provider: e.target.value }))}
                className="model-select"
                style={{ width: '100%', padding: '10px 14px' }}
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
              <div className="flex gap-sm" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowKeyModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={saveApiKey} disabled={saving || !newKey.apiKey}>
                  {saving ? <span className="spinner" /> : 'Save Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
