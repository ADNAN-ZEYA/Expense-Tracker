import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth({ theme }) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const isDark = theme === 'dark'

  const handleSubmit = async () => {
    setError(''); setMessage(''); setLoading(true)
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      if (!name) { setError('Name is required'); setLoading(false); return }
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (error) setError(error.message)
      else setMessage('Account created! You can now log in.')
    }
    setLoading(false)
  }

  const bg = isDark ? '#0a0f1e' : '#f1f5f9'
  const cardBg = isDark ? '#111827' : '#ffffff'
  const border = isDark ? '#1f2937' : '#e2e8f0'
  const text = isDark ? '#e2e8f0' : '#0f172a'
  const muted = isDark ? '#64748b' : '#94a3b8'
  const inputBg = isDark ? '#0a0f1e' : '#f8fafc'

  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#6366f1', letterSpacing: '-1px' }}>FinTrack</h1>
          <p style={{ color: muted, fontSize: '0.88rem', marginTop: '0.3rem' }}>
            {isLogin ? 'Welcome back! Sign in to continue' : 'Create your account to get started'}
          </p>
        </div>

        {!isLogin && (
          <>
            <label style={{ fontSize: '0.78rem', fontWeight: '600', color: muted, display: 'block', marginBottom: '0.3rem' }}>Full Name</label>
            <input style={inputS(inputBg, border, text)} placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
          </>
        )}

        <label style={{ fontSize: '0.78rem', fontWeight: '600', color: muted, display: 'block', marginBottom: '0.3rem' }}>Email</label>
        <input style={inputS(inputBg, border, text)} placeholder="you@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />

        <label style={{ fontSize: '0.78rem', fontWeight: '600', color: muted, display: 'block', marginBottom: '0.3rem' }}>Password</label>
        <input style={inputS(inputBg, border, text)} placeholder="••••••••" type="password" value={password} onChange={e => setPassword(e.target.value)} />

        {error && <div style={{ background: isDark ? '#1c0a0a' : '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem', color: '#dc2626', fontSize: '0.83rem', marginBottom: '1rem' }}>{error}</div>}
        {message && <div style={{ background: isDark ? '#0f2417' : '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', color: '#16a34a', fontSize: '0.83rem', marginBottom: '1rem' }}>{message}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '0.9rem', background: '#6366f1', color: '#fff',
          border: 'none', borderRadius: '10px', fontSize: '1rem', fontWeight: '700',
          cursor: 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '1.2rem',
          letterSpacing: '-0.3px'
        }}>
          {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', color: muted, fontSize: '0.88rem' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={() => { setIsLogin(!isLogin); setError(''); setMessage('') }}
            style={{ color: '#6366f1', cursor: 'pointer', fontWeight: '700' }}>
            {isLogin ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>
    </div>
  )
}

const inputS = (bg, border, color) => ({
  width: '100%', padding: '0.75rem 1rem', marginBottom: '1rem',
  background: bg, border: `1px solid ${border}`, borderRadius: '10px',
  color, fontSize: '0.92rem', display: 'block'
})