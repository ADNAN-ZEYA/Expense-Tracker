import React, { useState } from 'react';
import { supabase } from './supabase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      if (!name) { setError('Name is required'); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      });
      if (error) setError(error.message);
      else setMessage('Account created! You can now log in.');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#111827', border: '1px solid #1f2937',
        borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '420px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
          <h1 style={{ color: '#6366f1', fontSize: '1.8rem', fontWeight: '700' }}>FinTrack</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {!isLogin && (
          <input
            style={inputStyle}
            placeholder="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        )}
        <input
          style={inputStyle}
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {error && (
          <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '0.7rem', color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ background: '#0f2417', border: '1px solid #166534', borderRadius: '8px', padding: '0.7rem', color: '#4ade80', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '0.85rem', background: '#4f46e5',
            color: '#fff', border: 'none', borderRadius: '10px',
            fontSize: '1rem', fontWeight: '600', cursor: 'pointer',
            opacity: loading ? 0.7 : 1, marginBottom: '1.2rem'
          }}
        >
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
            style={{ color: '#6366f1', cursor: 'pointer', fontWeight: '600' }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '0.8rem 1rem', marginBottom: '1rem',
  background: '#0a0f1e', border: '1px solid #1f2937',
  borderRadius: '10px', color: '#e2e8f0', fontSize: '0.95rem',
  outline: 'none', display: 'block'
};