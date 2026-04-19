import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CATEGORIES = ['Salary', 'Food', 'Rent', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Other'];
const EXPENSE_CATS = CATEGORIES.filter(c => c !== 'Salary');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentMonth = MONTHS[new Date().getMonth()];

export default function Dashboard({ session }) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [budgetInputs, setBudgetInputs] = useState({});
  const [totalBudget, setTotalBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
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

  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', filterMonth);
    if (data && data.length > 0) {
      const map = {};
      let total = 0;
      data.forEach(b => {
        map[b.category] = b.limit_amount;
        total += b.limit_amount;
      });
      setBudgets(map);
      setBudgetInputs(map);
      setTotalBudget(total.toString());
    } else {
      setBudgets({});
      setBudgetInputs({});
      setTotalBudget('');
    }
  }, [user.id, filterMonth]);

  useEffect(() => {
    fetchTransactions();
    fetchBudgets();
  }, [fetchTransactions, fetchBudgets]);

  const saveBudgets = async () => {
    setSavingBudget(true);
    for (const [cat, limit] of Object.entries(budgetInputs)) {
      if (limit && parseFloat(limit) > 0) {
        await supabase.from('budgets').upsert({
          user_id: user.id,
          month: filterMonth,
          category: cat,
          limit_amount: parseFloat(limit)
        }, { onConflict: 'user_id,month,category' });
      }
    }
    await fetchBudgets();
    setSavingBudget(false);
    alert('Budget saved successfully!');
  };

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
    setDescription('');
    setAmount('');
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
  const userTotalBudget = parseFloat(totalBudget) || totalIncome || 1;
  const budgetUsedPct = Math.round((totalExpense / userTotalBudget) * 100);

  const doughnutData = {
    labels: ['Income', 'Expense'],
    datasets: [{
      data: [totalIncome || 1, totalExpense || 0],
      backgroundColor: ['#22c55e', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const catExpenses = EXPENSE_CATS.map(c =>
    monthTx.filter(t => t.category === c && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );

  const barData = {
    labels: EXPENSE_CATS,
    datasets: [{
      label: 'Spent (₹)',
      data: catExpenses,
      backgroundColor: '#6366f1',
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'transactions', label: 'Transactions', icon: '↕' },
    { id: 'budget', label: 'Budget', icon: '◎' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: '240px', background: '#0f172a', color: '#e2e8f0', display: 'flex', flexDirection: 'column', padding: '2rem 1.2rem', flexShrink: 0 }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' }}>FinTrack</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>Personal Finance</div>
        </div>

        <div style={{ marginBottom: '0.5rem', fontSize: '0.7rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>Menu</div>
        {navItems.map(item => (
          <div key={item.id} onClick={() => setActiveTab(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '0.25rem',
            cursor: 'pointer', fontSize: '0.88rem', fontWeight: '500',
            background: activeTab === item.id ? '#1e293b' : 'transparent',
            color: activeTab === item.id ? '#fff' : '#94a3b8',
            borderLeft: activeTab === item.id ? '3px solid #6366f1' : '3px solid transparent',
            transition: 'all 0.15s'
          }}>
            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
            {item.label}
          </div>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <div style={{ background: '#1e293b', borderRadius: '10px', padding: '0.9rem 1rem', marginBottom: '1rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', color: '#fff', marginBottom: '0.5rem' }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>{userName}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem', wordBreak: 'break-all' }}>{user.email}</div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '0.65rem', background: 'transparent',
            border: '1px solid #334155', borderRadius: '8px',
            color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem',
            fontWeight: '500', transition: 'all 0.15s'
          }}>Sign Out</button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>

        {/* Top Bar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'transactions' ? 'Transactions' : 'Budget Planner'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.1rem' }}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {userName}
            </div>
          </div>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{
            padding: '0.5rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px',
            background: '#fff', color: '#0f172a', fontSize: '0.88rem', cursor: 'pointer', outline: 'none'
          }}>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ padding: '1.5rem 2rem' }}>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Net Balance', value: `₹${balance.toLocaleString('en-IN')}`, sub: balance >= 0 ? 'Positive balance' : 'Overspent', color: balance >= 0 ? '#16a34a' : '#dc2626', bg: '#fff', border: '#e2e8f0', dot: balance >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'Total Income', value: `₹${totalIncome.toLocaleString('en-IN')}`, sub: `${monthTx.filter(t => t.type === 'income').length} transactions`, color: '#16a34a', bg: '#fff', border: '#e2e8f0', dot: '#22c55e' },
              { label: 'Total Expense', value: `₹${totalExpense.toLocaleString('en-IN')}`, sub: `${monthTx.filter(t => t.type === 'expense').length} transactions`, color: '#dc2626', bg: '#fff', border: '#e2e8f0', dot: '#ef4444' },
              { label: 'Budget Used', value: `${budgetUsedPct}%`, sub: `of ₹${userTotalBudget.toLocaleString('en-IN')} budget`, color: budgetUsedPct > 80 ? '#dc2626' : '#6366f1', bg: '#fff', border: '#e2e8f0', dot: budgetUsedPct > 80 ? '#ef4444' : '#6366f1' },
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: card.dot, marginTop: '3px' }} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: '700', color: card.color, letterSpacing: '-0.5px' }}>{card.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.3rem' }}>{card.sub}</div>
                {card.label === 'Budget Used' && (
                  <div style={{ height: '3px', background: '#f1f5f9', borderRadius: '2px', marginTop: '0.75rem' }}>
                    <div style={{ height: '100%', width: `${Math.min(budgetUsedPct, 100)}%`, background: budgetUsedPct > 80 ? '#ef4444' : '#6366f1', borderRadius: '2px', transition: 'width 0.4s' }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={card}>
                <div style={sectionTitle}>Income vs Expense</div>
                <div style={{ maxWidth: '280px', margin: '0 auto' }}>
                  <Doughnut data={doughnutData} options={{ plugins: { legend: { labels: { color: '#64748b', font: { size: 12 } } } }, cutout: '70%' }} />
                </div>
              </div>
              <div style={card}>
                <div style={sectionTitle}>Spending by Category</div>
                <Bar data={barData} options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false } },
                    y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: '#f1f5f9' } }
                  }
                }} />
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem' }}>
              <div style={card}>
                <div style={sectionTitle}>Add Transaction</div>
                <div style={fieldLabel}>Description</div>
                <input style={inputStyle} placeholder="e.g. Monthly salary" value={description} onChange={e => setDescription(e.target.value)} />
                <div style={fieldLabel}>Amount (₹)</div>
                <input style={inputStyle} placeholder="0.00" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={fieldLabel}>Category</div>
                    <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={fieldLabel}>Month</div>
                    <select style={inputStyle} value={month} onChange={e => setMonth(e.target.value)}>
                      {MONTHS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={fieldLabel}>Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button onClick={() => setType('income')} style={{
                    padding: '0.65rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600',
                    background: type === 'income' ? '#f0fdf4' : '#fff',
                    border: `1.5px solid ${type === 'income' ? '#22c55e' : '#e2e8f0'}`,
                    color: type === 'income' ? '#16a34a' : '#94a3b8'
                  }}>+ Income</button>
                  <button onClick={() => setType('expense')} style={{
                    padding: '0.65rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600',
                    background: type === 'expense' ? '#fef2f2' : '#fff',
                    border: `1.5px solid ${type === 'expense' ? '#ef4444' : '#e2e8f0'}`,
                    color: type === 'expense' ? '#dc2626' : '#94a3b8'
                  }}>- Expense</button>
                </div>
                {budgetUsedPct > 80 && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem', color: '#dc2626', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <span>⚠</span> You have used {budgetUsedPct}% of your monthly budget!
                  </div>
                )}
                <button onClick={addTransaction} disabled={loading} style={{
                  width: '100%', padding: '0.85rem', background: '#0f172a',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1
                }}>
                  {loading ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>

              <div style={card}>
                <div style={sectionTitle}>Transaction History</div>
                <input style={{ ...inputStyle, marginBottom: '0.75rem' }} placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {['All', ...CATEGORIES].map(c => (
                    <span key={c} onClick={() => setFilterCategory(c)} style={{
                      padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem',
                      cursor: 'pointer', fontWeight: '500',
                      background: filterCategory === c ? '#0f172a' : '#f1f5f9',
                      color: filterCategory === c ? '#fff' : '#64748b',
                      border: `1px solid ${filterCategory === c ? '#0f172a' : '#e2e8f0'}`
                    }}>{c}</span>
                  ))}
                </div>
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  {filtered.length === 0
                    ? <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontSize: '0.9rem' }}>No transactions found</div>
                    : filtered.map(t => (
                      <div key={t.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.9rem 1rem', background: '#f8fafc', borderRadius: '10px',
                        marginBottom: '0.5rem', border: '1px solid #e2e8f0',
                        borderLeft: `3px solid ${t.type === 'income' ? '#22c55e' : '#ef4444'}`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: t.type === 'income' ? '#f0fdf4' : '#fef2f2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: '700',
                            color: t.type === 'income' ? '#16a34a' : '#dc2626'
                          }}>
                            {t.category.substring(0, 3).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#0f172a' }}>{t.description}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>{t.category} · {t.date}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem', color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                          </span>
                          <button onClick={() => deleteTransaction(t.id)} style={{
                            background: 'none', border: 'none', color: '#cbd5e1',
                            cursor: 'pointer', fontSize: '1rem', padding: '0.2rem',
                            borderRadius: '4px'
                          }}>✕</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* Budget Tab */}
          {activeTab === 'budget' && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem' }}>
              <div style={card}>
                <div style={sectionTitle}>Set Your Budget — {filterMonth}</div>
                <div style={fieldLabel}>Total Monthly Budget (₹)</div>
                <input
                  style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: '600' }}
                  placeholder="e.g. 20000"
                  type="number"
                  value={totalBudget}
                  onChange={e => setTotalBudget(e.target.value)}
                />
                <div style={{ height: '1px', background: '#e2e8f0', margin: '1rem 0' }} />
                <div style={fieldLabel}>Category Limits (₹)</div>
                {EXPENSE_CATS.map(cat => (
                  <div key={cat} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: '500' }}>{cat}</div>
                    <input
                      style={{ ...inputStyle, marginBottom: 0 }}
                      placeholder={`Budget for ${cat}`}
                      type="number"
                      value={budgetInputs[cat] || ''}
                      onChange={e => setBudgetInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                    />
                  </div>
                ))}
                <button onClick={saveBudgets} disabled={savingBudget} style={{
                  width: '100%', padding: '0.85rem', background: '#0f172a',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
                  marginTop: '0.5rem', opacity: savingBudget ? 0.7 : 1
                }}>
                  {savingBudget ? 'Saving...' : 'Save Budget'}
                </button>
              </div>

              <div style={card}>
                <div style={sectionTitle}>Budget Overview — {filterMonth}</div>
                {Object.keys(budgets).length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontSize: '0.9rem' }}>
                    No budget set for {filterMonth}. Set your budget on the left.
                  </div>
                ) : (
                  EXPENSE_CATS.map(cat => {
                    const limit = budgets[cat] || 0;
                    const spent = monthTx.filter(t => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                    const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
                    if (limit === 0) return null;
                    return (
                      <div key={cat} style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: '600', color: '#0f172a' }}>{cat}</div>
                          <div style={{ fontSize: '0.82rem', color: pct > 80 ? '#dc2626' : '#64748b' }}>
                            ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                            <span style={{ marginLeft: '0.5rem', fontWeight: '700' }}>({pct}%)</span>
                          </div>
                        </div>
                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e',
                            borderRadius: '3px', transition: 'width 0.4s'
                          }} />
                        </div>
                        {pct > 80 && (
                          <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.25rem' }}>
                            ⚠ Budget almost exceeded for {cat}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {Object.keys(budgets).length > 0 && totalBudget && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#0f172a' }}>Overall Budget</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: budgetUsedPct > 80 ? '#dc2626' : '#16a34a' }}>{budgetUsedPct}% used</span>
                    </div>
                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px' }}>
                      <div style={{
                        height: '100%', width: `${Math.min(budgetUsedPct, 100)}%`,
                        background: budgetUsedPct > 80 ? '#ef4444' : '#6366f1',
                        borderRadius: '4px', transition: 'width 0.4s'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <span>₹{totalExpense.toLocaleString('en-IN')} spent</span>
                      <span>₹{parseFloat(totalBudget).toLocaleString('en-IN')} total</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const card = { background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const sectionTitle = { fontSize: '0.82rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.25rem' };
const inputStyle = { width: '100%', padding: '0.7rem 0.9rem', marginBottom: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '0.9rem', display: 'block', outline: 'none' };
const fieldLabel = { fontSize: '0.78rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' };