import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Auth from './Auth';
import Dashboard from './Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0f1e' }}>
      <div style={{ color: '#6366f1', fontSize: '1.2rem' }}>Loading...</div>
    </div>
  );

  return session ? <Dashboard session={session} /> : <Auth />;
}