import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <span className="landing-nav-logo">MicroManus</span>
        <Link href="/login" className="btn btn-primary" id="nav-login">
          Get Started
        </Link>
      </nav>

      <section className="landing-hero animate-fade">
        <h1>
          Your AI-Powered<br />
          <span className="gradient-text">Deep Research Agent</span>
        </h1>
        <p>
          Think → Search → Synthesize. MicroManus searches the web in real-time,
          reasons through complex questions, and delivers research-grade answers
          with source citations.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
            Start Researching →
          </Link>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-feature animate-fade">
          <div className="landing-feature-icon">🔍</div>
          <h3>Live Web Search</h3>
          <p>
            Powered by Brave Search API. The agent searches the web in real-time
            and synthesizes findings — no stale training data.
          </p>
        </div>

        <div className="landing-feature animate-fade">
          <div className="landing-feature-icon">🧠</div>
          <h3>Multi-Step Reasoning</h3>
          <p>
            Breaks down complex queries into sub-searches. Iterates up to 8 times
            to build a thorough, cited answer.
          </p>
        </div>

        <div className="landing-feature animate-fade">
          <div className="landing-feature-icon">📄</div>
          <h3>PDF Report Export</h3>
          <p>
            Ask the agent to compile its research into a formatted PDF report.
            Downloaded and stored automatically.
          </p>
        </div>

        <div className="landing-feature animate-fade">
          <div className="landing-feature-icon">🔑</div>
          <h3>Bring Your Own Key</h3>
          <p>
            Use GPT-4o, Claude Sonnet, or Gemini Pro. Add your own API key from
            any supported provider — encrypted at rest.
          </p>
        </div>

        <div className="landing-feature animate-fade">
          <div className="landing-feature-icon">📊</div>
          <h3>Token-Level Analytics</h3>
          <p>
            Track every request&apos;s cost down to micro-cents. See input vs output
            tokens, per-model breakdowns, and running totals.
          </p>
        </div>

        <div className="landing-feature animate-fade">
          <div className="landing-feature-icon">🔒</div>
          <h3>Secure by Design</h3>
          <p>
            OAuth login, Row-Level Security, AES-256 encrypted API keys.
            Your data stays yours.
          </p>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Built with Next.js, Supabase, and Vercel AI SDK
      </footer>
    </div>
  );
}
