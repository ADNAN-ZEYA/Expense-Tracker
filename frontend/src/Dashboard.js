import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CATEGORIES = ['Salary', 'Food', 'Rent', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Other'];
const BUDGETS = { Food: 10000, Rent: 20000, Transport: 5000, Entertainment: 5000, Health: 5000, Shopping: 8000 };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const currentMonth = MONTHS[new Date().getMonth()];

export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');
  const [category, setCategory] = useState('Salary');
  const [month, setMonth] = useState(currentMonth);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterCategory, setFilterCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const user = session.user;
  const userName = user.user_metadata?.full_name || user.email.split('@')[0];

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTransactions(data || []);
  }, [user.id]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const addTransaction = async () => {
    if (!description || !amount) return alert('Fill all fields');
    setLoading(true);
    await supabase.from('transactions').insert({
      user_id: user.id,
      description,
      amount: parseFloat(amount),
      type,
      category,
      month,
      date: new Date().toLocaleDateString('en-IN')
    });
    setDescription(''); setAmount('');
    await fetchTransactions();
    setLoading(false);
  };

  const deleteTransaction = async (id) => {
    await supabase.from('transactions').delete().eq('id', id);
    fetchTransactions();
  };

  const handleLogout = () => supabase.auth.signOut();

  const monthTx = transactions.filter(t => t.month === filterMonth);
  const filtered = monthTx.filter(t => {
    const matchCat = filterCategory === 'All' || t.category === filterCategory;
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const budgetUsed = totalExpense > 0 ? Math.round((totalExpense / (Object.values(BUDGETS).reduce((a, b) => a + b, 0))) * 100) : 0;

  const doughnutData = {
    labels: ['Income', 'Expense'],
    datasets: [{ data: [totalIncome || 1, totalExpense || 0], backgroundColor: ['#4ade80', '#f87171'], borderWidth: 0 }]
  };

  const catExpenses = CATEGORIES.filter(c => c !== 'Salary').map(c =>
    monthTx.filter(t => t.category === c && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );

  const barData = {
    labels: CATEGORIES.filter(c => c !== 'Salary'),
    datasets: [{
      label: 'Spent (₹)',
      data: catExpenses,
      backgroundColor: '#6366f1',
      borderRadius: 6
    }]
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0f1e', color: '#e2e8f0' }}>
      <div style={{ width: '220px', background: '#111827', borderRight: '1px solid #1f2937', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#6366f1', marginBottom: '0.5rem' }}>💰 FinTrack</div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '2rem' }}>Welcome, {userName}</div>

        {['dashboard', 'transactions', 'budget'].map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '0.7rem 0.9rem', borderRadius: '8px', marginBottom: '0.3rem',
            cursor: 'pointer', fontSize: '0.88rem', textTransform: 'capitalize',
            background: activeTab === tab ? '#1e1b4b' : 'transparent',
            color: activeTab === tab ? '#818cf8' : '#94a3b8'
          }}>{tab === 'dashboard' ? '📊 Dashboard' : tab === 'transactions' ? '📋 Transactions' : '🎯 Budget'}</div>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{user.email}</div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '0.6rem', background: '#1c0a0a',
            border: '1px solid #7f1d1d', borderRadius: '8px',
            color: '#f87171', cursor: 'pointer', fontSize: '0.85rem'
          }}>Logout</button>
        </div>
      </div>

      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '600' }}>
            {activeTab === 'dashboard' ? '📊 Dashboard' : activeTab === 'transactions' ? '📋 Transactions' : '🎯 Budget'}
          </h2>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={selectStyle}>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Net Balance', value: `₹${balance.toLocaleString('en-IN')}`, color: '#818cf8', bg: '#1e1b4b', border: '#3730a3' },
            { label: 'Total Income', value: `₹${totalIncome.toLocaleString('en-IN')}`, color: '#4ade80', bg: '#0f2417', border: '#166534' },
            { label: 'Total Expense', value: `₹${totalExpense.toLocaleString('en-IN')}`, color: '#f87171', bg: '#1c0a0a', border: '#7f1d1d' },
            { label: 'Budget Used', value: `${budgetUsed}%`, color: '#60a5fa', bg: '#0f1c2e', border: '#1e40af' },
          ].map(card => (
            <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '1.2rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{card.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: card.color }}>{card.value}</div>
              {card.label === 'Budget Used' && (
                <div style={{ height: '4px', background: '#1f2937', borderRadius: '4px', marginTop: '0.5rem' }}>
                  <div style={{ height: '100%', width: `${Math.min(budgetUsed, 100)}%`, background: budgetUsed > 80 ? '#f87171' : '#4ade80', borderRadius: '4px' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={panelStyle}>
              <div style={panelTitle}>Income vs Expense</div>
              <Doughnut data={doughnutData} options={{ plugins: { legend: { labels: { color: '#94a3b8' } } } }} />
            </div>
            <div style={panelStyle}>
              <div style={panelTitle}>Spending by Category</div>
              <Bar data={barData} options={{
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { color: '#64748b' }, grid: { color: '#1f2937' } }, y: { ticks: { color: '#64748b' }, grid: { color: '#1f2937' } } }
              }} />
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={panelStyle}>
              <div style={panelTitle}>Add Transaction</div>
              <input style={inputStyle} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
              <input style={inputStyle} placeholder="Amount (₹)" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select style={selectStyle} value={month} onChange={e => setMonth(e.target.value)}>
                  {MONTHS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <button onClick={() => setType('income')} style={{ ...typeBtn, background: type === 'income' ? '#166534' : '#0f172a', border: `1px solid ${type === 'income' ? '#4ade80' : '#1f2937'}`, color: type === 'income' ? '#4ade80' : '#64748b' }}>Income</button>
                <button onClick={() => setType('expense')} style={{ ...typeBtn, background: type === 'expense' ? '#7f1d1d' : '#0f172a', border: `1px solid ${type === 'expense' ? '#f87171' : '#1f2937'}`, color: type === 'expense' ? '#f87171' : '#64748b' }}>Expense</button>
              </div>
              {budgetUsed > 80 && (
                <div style={{ background: '#1c0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '0.6rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '0.8rem' }}>
                  Warning: You have used {budgetUsed}% of your monthly budget!
                </div>
              )}
              <button onClick={addTransaction} disabled={loading} style={{ width: '100%', padding: '0.8rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer' }}>
                {loading ? 'Adding...' : 'Add Transaction'}
              </button>
            </div>

            <div style={panelStyle}>
              <div style={panelTitle}>Transaction History</div>
              <input style={{ ...inputStyle, marginBottom: '0.8rem' }} placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                {['All', ...CATEGORIES].map(c => (
                  <span key={c} onClick={() => setFilterCategory(c)} style={{
                    padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem', cursor: 'pointer',
                    background: filterCategory === c ? '#1e1b4b' : '#0a0f1e',
                    border: `1px solid ${filterCategory === c ? '#6366f1' : '#1f2937'}`,
                    color: filterCategory === c ? '#818cf8' : '#64748b'
                  }}>{c}</span>
                ))}
              </div>
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {filtered.length === 0
                  ? <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>No transactions found</div>
                  : filtered.map(t => (
                    <div key={t.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.7rem 0.9rem', background: '#0a0f1e', borderRadius: '8px',
                      marginBottom: '0.5rem', borderLeft: `3px solid ${t.type === 'income' ? '#4ade80' : '#f87171'}`
                    }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{t.description}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.category} · {t.date}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ fontWeight: '700', color: t.type === 'income' ? '#4ade80' : '#f87171' }}>
                          {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                        </span>
                        <button onClick={() => deleteTransaction(t.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div style={panelStyle}>
            <div style={panelTitle}>Budget Overview — {filterMonth}</div>
            {Object.entries(BUDGETS).map(([cat, limit]) => {
              const spent = monthTx.filter(t => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
              const pct = Math.min(Math.round((spent / limit) * 100), 100);
              return (
                <div key={cat} style={{ marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                    <span>{cat}</span>
                    <span style={{ color: pct > 80 ? '#f87171' : '#4ade80' }}>₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', background: '#1f2937', borderRadius: '4px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#f87171' : pct > 60 ? '#fbbf24' : '#4ade80', borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                  {pct > 80 && <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '0.2rem' }}>Budget limit almost reached!</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const panelStyle = { background: '#111827', borderRadius: '12px', padding: '1.5rem', border: '1px solid #1f2937' };
const panelTitle = { fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' };
const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', marginBottom: '0.8rem', background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', display: 'block', outline: 'none' };
const selectStyle = { width: '100%', padding: '0.7rem 0.9rem', background: '#0a0f1e', border: '1px solid #1f2937', borderRadius: '8px', color: '#e2e8f0', fontSize: '0.9rem', outline: 'none' };
const typeBtn = { padding: '0.7rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '500' };