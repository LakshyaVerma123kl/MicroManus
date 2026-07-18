'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatCost, formatTokens, formatDate } from '@/lib/utils';
import { UsageLog } from '@/types';
import { BarChart, Layers, Clock, Zap, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsData {
  logs: (UsageLog & { chats?: { title: string } })[];
  stats: {
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalChats: number;
    credits: number;
  };
}

export default function StatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/usage');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to load stats', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '24px', fontSize: '1.5rem', fontWeight: 700 }}>Cost & Analytics</h2>
        <div className="stats-grid">
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
          <div className="skeleton" style={{ height: '100px' }} />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ padding: '32px 40px', overflowY: 'auto', height: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>Cost & Analytics</h1>

      {/* Summary Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="stats-grid"
      >
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2"><Wallet size={16} /> Total Spend</div>
          <div className="stat-value accent">{formatCost(data.stats.totalCost)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2"><Layers size={16} /> Input Tokens</div>
          <div className="stat-value cyan">{formatTokens(data.stats.totalInputTokens)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2"><BarChart size={16} /> Output Tokens</div>
          <div className="stat-value green">{formatTokens(data.stats.totalOutputTokens)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label flex items-center gap-2"><Zap size={16} /> Credits Remaining</div>
          <div className="stat-value">{data.stats.credits}</div>
        </div>
      </motion.div>

      {/* Usage Table */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card" style={{ padding: 0, overflow: 'hidden' }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Activity</h2>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Chat</th>
                <th>Model</th>
                <th>Provider</th>
                <th>Tokens (In / Out)</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No usage recorded yet. Start chatting to see your stats.
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.created_at)}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {log.chats?.title || 'Unknown Chat'}
                    </td>
                    <td>
                      <span className="badge badge-accent" style={{ textTransform: 'none' }}>{log.model}</span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{log.provider}</td>
                    <td>
                      {log.input_tokens} / {log.output_tokens}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--green)' }}>
                      {formatCost(Number(log.cost_usd))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
