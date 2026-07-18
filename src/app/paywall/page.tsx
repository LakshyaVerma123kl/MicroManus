'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PaywallPage() {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleCoupon = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`${data.credits} credits added! Redirecting...`);
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setError(data.error || 'Invalid coupon code');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Could not create checkout session. Please configure Stripe.');
      }
    } catch {
      setError('Payment service unavailable. Use a coupon code instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="paywall-page">
      <div className="glass-card paywall-card animate-fade">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '2.5rem' }}>🔒</span>
        </div>
        <h1 className="paywall-title" style={{ textAlign: 'center' }}>
          Unlock MicroManus
        </h1>
        <p className="paywall-desc" style={{ textAlign: 'center' }}>
          Get 5 research credits to start using the AI agent.
        </p>

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '16px',
            color: 'var(--red)',
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            marginBottom: '16px',
            color: 'var(--green)',
            fontSize: '0.85rem'
          }}>
            {success}
          </div>
        )}

        {/* Coupon Section */}
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            Have a coupon code?
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              style={{ flex: 1 }}
              id="coupon-input"
            />
            <button
              className="btn btn-primary"
              onClick={handleCoupon}
              disabled={loading || !couponCode}
              id="coupon-submit"
            >
              {loading ? <span className="spinner" /> : 'Apply'}
            </button>
          </div>
        </div>

        <div className="divider">or</div>

        {/* Stripe Section */}
        <button
          className="btn btn-secondary w-full"
          onClick={handleStripeCheckout}
          disabled={loading}
          id="stripe-checkout"
          style={{ padding: '14px', justifyContent: 'center' }}
        >
          💳 Pay $5 for 5 Credits
        </button>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            className="btn btn-ghost"
            onClick={handleLogout}
            style={{ fontSize: '0.8rem' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
