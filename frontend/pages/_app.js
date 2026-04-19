import '../styles/globals.css'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function App({ Component, pageProps }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light'
    setTheme(saved)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0f1e' }}>
      <div style={{ color: '#6366f1', fontSize: '1.1rem', fontWeight: '600' }}>Loading FinTrack...</div>
    </div>
  )

  return (
    <Component
      {...pageProps}
      session={session}
      theme={theme}
      toggleTheme={toggleTheme}
    />
  )
}