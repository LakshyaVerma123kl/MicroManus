import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Globe, Lightbulb, FileText, Key, Activity, ShieldCheck, ArrowRight, Bot } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="landing-page">
      <div className="aurora-bg" />
      
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '8px', 
            background: 'linear-gradient(135deg, var(--accent), var(--cyan))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}>
            <Bot size={20} />
          </div>
          <span className="landing-nav-logo">MicroManus</span>
        </div>
        <Link href="/login" className="btn btn-secondary" style={{ borderRadius: '100px' }}>
          Sign In
        </Link>
      </nav>

      <section className="landing-hero">
        <h1 style={{ animation: 'fadeIn 0.6s ease-out' }}>
          Your AI-Powered<br />
          <span className="gradient-accent">Deep Research Agent</span>
        </h1>
        <p style={{ animation: 'fadeIn 0.8s ease-out' }}>
          Think → Search → Synthesize. MicroManus searches the web in real-time,
          reasons through complex questions, and delivers research-grade answers
          with source citations.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeIn 1s ease-out' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem', borderRadius: '100px' }}>
            Start Researching <ArrowRight size={18} />
          </Link>
          <a href="#features" className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: '1.05rem', borderRadius: '100px' }}>
            View Features
          </a>
        </div>
      </section>

      <section id="features" className="landing-features">
        {[
          { icon: <Globe size={24} />, title: "Live Web Search", desc: "Powered by a multi-tier fallback chain. The agent searches the web in real-time and synthesizes findings." },
          { icon: <Lightbulb size={24} />, title: "Multi-Step Reasoning", desc: "Breaks down complex queries into sub-searches. Iterates to build a thorough, cited answer." },
          { icon: <FileText size={24} />, title: "PDF Report Export", desc: "Ask the agent to compile its research into a formatted PDF report. Downloaded and stored automatically." },
          { icon: <Key size={24} />, title: "Bring Your Own Key", desc: "Use GPT-4o, Claude Sonnet, or Gemini Pro. Add your own API key from any supported provider." },
          { icon: <Activity size={24} />, title: "Token Analytics", desc: "Track every request's cost down to micro-cents. See input vs output tokens and per-model breakdowns." },
          { icon: <ShieldCheck size={24} />, title: "Secure by Design", desc: "OAuth login, Row-Level Security, AES-256 encrypted API keys. Your data stays completely private." }
        ].map((feature, i) => (
          <div key={i} className="landing-feature" style={{ animation: `fadeIn ${1 + (i * 0.1)}s ease-out` }}>
            <div className="landing-feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
          </div>
        ))}
      </section>

      <footer style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.9rem', borderTop: '1px solid var(--border)' }}>
        Built with Next.js, Supabase, and Vercel AI SDK
      </footer>
    </div>
  );
}
