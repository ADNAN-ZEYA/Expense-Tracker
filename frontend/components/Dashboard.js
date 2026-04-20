import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const CATEGORIES = ['Salary', 'Food', 'Rent', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Other']
const EXPENSE_CATS = CATEGORIES.filter(c => c !== 'Salary')
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const currentMonth = MONTHS[new Date().getMonth()]

export default function Dashboard({ session, theme, toggleTheme }) {
  const router = useRouter()
  const [transactions, setTransactions] = useState([])
  const [budgets, setBudgets] = useState({})
  const [budgetInputs, setBudgetInputs] = useState({})
  const [totalBudget, setTotalBudget] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('income')
  const [category, setCategory] = useState('Salary')
  const [month, setMonth] = useState(currentMonth)
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0])
  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [filterCategory, setFilterCategory] = useState('All')
  const [search, setSearch] = useState('') 
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const isDark = theme === 'dark'
  const user = session.user
  const userName = user.user_metadata?.full_name || user.email.split('@')[0]

  const bg = isDark ? '#0a0f1e' : '#f1f5f9'
  const sidebarBg = isDark ? '#0f172a' : '#0f172a'
  const cardBg = isDark ? '#111827' : '#ffffff'
  const topbarBg = isDark ? '#111827' : '#ffffff'
  const border = isDark ? '#1f2937' : '#e2e8f0'
  const text = isDark ? '#e2e8f0' : '#0f172a'
  const muted = isDark ? '#64748b' : '#94a3b8'
  const inputBg = isDark ? '#0a0f1e' : '#f8fafc'
  const rowBg = isDark ? '#0a0f1e' : '#f8fafc'

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setTransactions(data || [])
  }, [user.id])

  const fetchBudgets = useCallback(async () => {
    const { data } = await supabase.from('budgets').select('*').eq('user_id', user.id).eq('month', filterMonth)
    if (data && data.length > 0) {
      const map = {}; let total = 0
      data.forEach(b => { map[b.category] = b.limit_amount; total += b.limit_amount })
      setBudgets(map); setBudgetInputs(map); setTotalBudget(total.toString())
    } else {
      setBudgets({}); setBudgetInputs({}); setTotalBudget('')
    }
  }, [user.id, filterMonth])

  useEffect(() => { fetchTransactions(); fetchBudgets() }, [fetchTransactions, fetchBudgets])

  const saveBudgets = async () => {
    setSavingBudget(true)
    for (const [cat, limit] of Object.entries(budgetInputs)) {
      if (limit && parseFloat(limit) > 0) {
        await supabase.from('budgets').upsert({
          user_id: user.id, month: filterMonth,
          category: cat, limit_amount: parseFloat(limit)
        }, { onConflict: 'user_id,month,category' })
      }
    }
    await fetchBudgets()
    setSavingBudget(false)
    alert('Budget saved!')
  }

  const saveProfile = async () => {
    if (!newName.trim()) return
    setSavingProfile(true)
    await supabase.auth.updateUser({ data: { full_name: newName } })
    setSavingProfile(false)
    setShowEditProfile(false)
    alert('Profile updated! Please refresh.')
  }

  const addTransaction = async () => {
    if (!description || !amount) return alert('Fill all fields')
    setLoading(true)
    await supabase.from('transactions').insert({
      user_id: user.id, description,
      amount: parseFloat(amount), type, category, month,
      date: new Date(customDate).toLocaleDateString('en-IN')
    })
    setDescription(''); setAmount('')
    await fetchTransactions()
    setLoading(false)
  }

  const deleteTransaction = async (id) => {
    await supabase.from('transactions').delete().eq('id', id)
    fetchTransactions()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const monthTx = transactions.filter(t => t.month === filterMonth)
  const filtered = monthTx.filter(t => {
    const matchCat = filterCategory === 'All' || t.category === filterCategory
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense
  const userTotalBudget = parseFloat(totalBudget) || totalIncome || 1
  const budgetUsedPct = Math.round((totalExpense / userTotalBudget) * 100)

  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - today.getDate() + 1
  const dailyLimit = balance > 0 ? Math.round(balance / daysLeft) : 0

  const recentTx = transactions.slice(0, 3)

  const todayStr = new Date().toLocaleDateString('en-IN')
  const todayExpense = transactions.filter(t => t.date === todayStr && t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const doughnutData = {
    labels: ['Income', 'Expense'],
    datasets: [{ data: [totalIncome || 1, totalExpense || 0], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0, hoverOffset: 4 }]
  }

  const catExpenses = EXPENSE_CATS.map(c => monthTx.filter(t => t.category === c && t.type === 'expense').reduce((s, t) => s + t.amount, 0))
  const barData = {
    labels: EXPENSE_CATS,
    datasets: [{ label: 'Spent (₹)', data: catExpenses, backgroundColor: '#6366f1', borderRadius: 6, borderSkipped: false }]
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'transactions', label: 'Transactions', icon: '↕' },
    { id: 'budget', label: 'Budget', icon: '◎' },
  ]

  const cardStyle = { background: cardBg, borderRadius: '12px', padding: '1.5rem', border: `1px solid ${border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const secTitle = { fontSize: '0.78rem', fontWeight: '700', color: muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1.25rem' }
  const inpStyle = { width: '100%', padding: '0.7rem 0.9rem', marginBottom: '1rem', background: inputBg, border: `1px solid ${border}`, borderRadius: '8px', color: text, fontSize: '0.9rem', display: 'block' }
  const fldLabel = { fontSize: '0.75rem', fontWeight: '600', color: muted, marginBottom: '0.4rem' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: bg }}>

      {/* Sidebar */}
      <div style={{ width: '260px', background: sidebarBg, color: '#e2e8f0', display: 'flex', flexDirection: 'column', padding: '1.5rem 1rem', flexShrink: 0 }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', letterSpacing: '-1px' }}>💰 FinTrack</div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>Personal Finance Manager</div>
        </div>

        {/* Daily Limit Card */}
        <div style={{ background: '#1e293b', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>Daily Spending Limit</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: dailyLimit > 0 ? '#4ade80' : '#f87171' }}>₹{dailyLimit.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>{daysLeft} days left in {filterMonth}</div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.5rem' }}>Today spent: <span style={{ color: '#f87171' }}>₹{todayExpense.toLocaleString('en-IN')}</span></div>
        </div>

        {/* Navigation */}
        <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>Menu</div>
        {navItems.map(item => (
          <div key={item.id} className="nav-item" onClick={() => setActiveTab(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.7rem 0.9rem', borderRadius: '8px', marginBottom: '0.25rem',
            cursor: 'pointer', fontSize: '0.88rem', fontWeight: '500',
            background: activeTab === item.id ? '#1e293b' : 'transparent',
            color: activeTab === item.id ? '#fff' : '#94a3b8',
            borderLeft: `3px solid ${activeTab === item.id ? '#6366f1' : 'transparent'}`
          }}>
            <span>{item.icon}</span>{item.label}
          </div>
        ))}

        {/* Recent Transactions */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.6rem', paddingLeft: '0.5rem' }}>Recent</div>
          {recentTx.length === 0
            ? <div style={{ fontSize: '0.78rem', color: '#475569', paddingLeft: '0.5rem' }}>No transactions yet</div>
            : recentTx.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.5rem', borderRadius: '6px', marginBottom: '0.25rem', background: '#1e293b' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: '500' }}>{t.description.length > 12 ? t.description.substring(0, 12) + '...' : t.description}</div>
                  <div style={{ fontSize: '0.65rem', color: '#475569' }}>{t.category}</div>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: '700', color: t.type === 'income' ? '#4ade80' : '#f87171' }}>
                  {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                </div>
              </div>
            ))
          }
        </div>

        {/* Bottom: Profile */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ background: '#1e293b', borderRadius: '10px', padding: '0.9rem', marginBottom: '0.75rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', color: '#fff', flexShrink: 0 }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
                <div style={{ fontSize: '0.68rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
            </div>
            <button onClick={() => { setShowEditProfile(true); setNewName(userName) }} style={{
              width: '100%', padding: '0.5rem', background: 'transparent',
              border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: '500', marginBottom: '0.5rem'
            }}>Edit Profile</button>
            <button onClick={handleLogout} style={{
              width: '100%', padding: '0.5rem', background: 'transparent',
              border: '1px solid #7f1d1d', borderRadius: '6px', color: '#f87171',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: '500'
            }}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Topbar */}
        <div style={{ background: topbarBg, borderBottom: `1px solid ${border}`, padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: text }}>
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'transactions' ? 'Transactions' : 'Budget Planner'}
            </div>
            <div style={{ fontSize: '0.75rem', color: muted, marginTop: '0.1rem' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ padding: '0.5rem 0.9rem', border: `1px solid ${border}`, borderRadius: '8px', background: cardBg, color: text, fontSize: '0.85rem', cursor: 'pointer' }}>
              {MONTHS.map(m => <option key={m}>{m}</option>)}
            </select>
            <button onClick={toggleTheme} style={{
              padding: '0.5rem 1rem', border: `1px solid ${border}`, borderRadius: '8px',
              background: cardBg, color: text, cursor: 'pointer', fontSize: '0.85rem',
              fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem'
            }}>
              {isDark ? '☀ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem', flex: 1 }}>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Net Balance', value: `₹${balance.toLocaleString('en-IN')}`, sub: balance >= 0 ? 'Positive balance' : 'Overspent', color: balance >= 0 ? '#16a34a' : '#dc2626', dot: balance >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'Total Income', value: `₹${totalIncome.toLocaleString('en-IN')}`, sub: `${monthTx.filter(t => t.type === 'income').length} transactions`, color: '#16a34a', dot: '#22c55e' },
              { label: 'Total Expense', value: `₹${totalExpense.toLocaleString('en-IN')}`, sub: `${monthTx.filter(t => t.type === 'expense').length} transactions`, color: '#dc2626', dot: '#ef4444' },
              { label: 'Budget Used', value: `${budgetUsedPct}%`, sub: `of ₹${userTotalBudget.toLocaleString('en-IN')} budget`, color: budgetUsedPct > 80 ? '#dc2626' : '#6366f1', dot: budgetUsedPct > 80 ? '#ef4444' : '#6366f1' },
            ].map(c => (
              <div key={c.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.72rem', color: muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.dot, marginTop: '3px' }} />
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: c.color, letterSpacing: '-0.5px' }}>{c.value}</div>
                <div style={{ fontSize: '0.72rem', color: muted, marginTop: '0.3rem' }}>{c.sub}</div>
                {c.label === 'Budget Used' && (
                  <div style={{ height: '3px', background: isDark ? '#1f2937' : '#f1f5f9', borderRadius: '2px', marginTop: '0.75rem' }}>
                    <div style={{ height: '100%', width: `${Math.min(budgetUsedPct, 100)}%`, background: budgetUsedPct > 80 ? '#ef4444' : '#6366f1', borderRadius: '2px' }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={cardStyle}>
                <div style={secTitle}>Income vs Expense</div>
                <div style={{ maxWidth: '260px', margin: '0 auto' }}>
                  <Doughnut data={doughnutData} options={{ plugins: { legend: { labels: { color: muted, font: { size: 12 } } } }, cutout: '70%' }} />
                </div>
              </div>
              <div style={cardStyle}>
                <div style={secTitle}>Spending by Category</div>
                <Bar data={barData} options={{
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { color: muted, font: { size: 11 } }, grid: { display: false } },
                    y: { ticks: { color: muted, font: { size: 11 } }, grid: { color: isDark ? '#1f2937' : '#f1f5f9' } }
                  }
                }} />
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem' }}>
              <div style={cardStyle}>
                <div style={secTitle}>Add Transaction</div>
                <div style={fldLabel}>Description</div>
                <input style={inpStyle} placeholder="e.g. Monthly salary" value={description} onChange={e => setDescription(e.target.value)} />
                <div style={fldLabel}>Amount (₹)</div>
                <input style={inpStyle} placeholder="0.00" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={fldLabel}>Category</div>
                    <select style={inpStyle} value={category} onChange={e => setCategory(e.target.value)}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={fldLabel}>Month</div>
                    <select style={inpStyle} value={month} onChange={e => setMonth(e.target.value)}>
                     {MONTHS.map(m => <option key={m}>{m}</option>)}
                   </select>
                   <div style={fldLabel}>Date</div>
                   <input
                    style={inpStyle}
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    />
                  </div>
                </div>
                <div style={fldLabel}>Type</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button onClick={() => setType('income')} style={{ padding: '0.65rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600', background: type === 'income' ? '#f0fdf4' : cardBg, border: `1.5px solid ${type === 'income' ? '#22c55e' : border}`, color: type === 'income' ? '#16a34a' : muted }}>+ Income</button>
                  <button onClick={() => setType('expense')} style={{ padding: '0.65rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600', background: type === 'expense' ? (isDark ? '#1c0a0a' : '#fef2f2') : cardBg, border: `1.5px solid ${type === 'expense' ? '#ef4444' : border}`, color: type === 'expense' ? '#dc2626' : muted }}>- Expense</button>
                </div>
                {budgetUsedPct > 80 && (
                  <div style={{ background: isDark ? '#1c0a0a' : '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem', color: '#dc2626', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    ⚠ You have used {budgetUsedPct}% of your monthly budget!
                  </div>
                )}
                <button onClick={addTransaction} disabled={loading} style={{ width: '100%', padding: '0.85rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>

              <div style={cardStyle}>
                <div style={secTitle}>Transaction History</div>
                <input style={{ ...inpStyle, marginBottom: '0.75rem' }} placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {['All', ...CATEGORIES].map(c => (
                    <span key={c} onClick={() => setFilterCategory(c)} style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600', background: filterCategory === c ? '#6366f1' : (isDark ? '#1e293b' : '#f1f5f9'), color: filterCategory === c ? '#fff' : muted, border: `1px solid ${filterCategory === c ? '#6366f1' : border}` }}>
                      {c}
                    </span>
                  ))}
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {filtered.length === 0
                    ? <div style={{ textAlign: 'center', color: muted, padding: '3rem', fontSize: '0.9rem' }}>No transactions found</div>
                    : filtered.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: rowBg, borderRadius: '10px', marginBottom: '0.5rem', border: `1px solid ${border}`, borderLeft: `3px solid ${t.type === 'income' ? '#22c55e' : '#ef4444'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: t.type === 'income' ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: '800', color: t.type === 'income' ? '#16a34a' : '#dc2626', flexShrink: 0 }}>
                            {t.category.substring(0, 3).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: text }}>{t.description}</div>
                            <div style={{ fontSize: '0.72rem', color: muted, marginTop: '0.1rem' }}>{t.category} · {t.date}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem', color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                          </span>
                          <button onClick={() => deleteTransaction(t.id)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1rem' }}>✕</button>
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
              <div style={cardStyle}>
                <div style={secTitle}>Set Budget — {filterMonth}</div>
                <div style={fldLabel}>Total Monthly Budget (₹)</div>
                <input style={{ ...inpStyle, fontSize: '1.1rem', fontWeight: '700' }} placeholder="e.g. 20000" type="number" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} />
                <div style={{ height: '1px', background: border, margin: '0.75rem 0 1rem' }} />
                <div style={fldLabel}>Category Limits</div>
                {EXPENSE_CATS.map(cat => (
                  <div key={cat} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: muted, marginBottom: '0.3rem', fontWeight: '600' }}>{cat}</div>
                    <input style={{ ...inpStyle, marginBottom: 0 }} placeholder={`Limit for ${cat}`} type="number" value={budgetInputs[cat] || ''} onChange={e => setBudgetInputs(prev => ({ ...prev, [cat]: e.target.value }))} />
                  </div>
                ))}
                <button onClick={saveBudgets} disabled={savingBudget} style={{ width: '100%', padding: '0.85rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: '700', cursor: 'pointer', marginTop: '0.5rem', opacity: savingBudget ? 0.7 : 1 }}>
                  {savingBudget ? 'Saving...' : 'Save Budget'}
                </button>
              </div>

              <div style={cardStyle}>
                <div style={secTitle}>Budget Overview — {filterMonth}</div>
                {Object.keys(budgets).length === 0
                  ? <div style={{ textAlign: 'center', color: muted, padding: '3rem', fontSize: '0.9rem' }}>No budget set. Add limits on the left.</div>
                  : EXPENSE_CATS.map(cat => {
                    const limit = budgets[cat] || 0
                    const spent = monthTx.filter(t => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                    const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0
                    if (limit === 0) return null
                    return (
                      <div key={cat} style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: '600', color: text }}>{cat}</div>
                          <div style={{ fontSize: '0.82rem', color: pct > 80 ? '#dc2626' : muted }}>
                            ₹{spent.toLocaleString('en-IN')} / ₹{limit.toLocaleString('en-IN')}
                            <span style={{ marginLeft: '0.5rem', fontWeight: '800' }}>({pct}%)</span>
                          </div>
                        </div>
                        <div style={{ height: '6px', background: isDark ? '#1f2937' : '#f1f5f9', borderRadius: '3px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e', borderRadius: '3px', transition: 'width 0.4s' }} />
                        </div>
                        {pct > 80 && <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.25rem' }}>⚠ Almost exceeded!</div>}
                      </div>
                    )
                  })
                }
                {Object.keys(budgets).length > 0 && totalBudget && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', background: isDark ? '#0a0f1e' : '#f8fafc', borderRadius: '10px', border: `1px solid ${border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: text }}>Overall Budget</span>
                      <span style={{ fontSize: '0.88rem', fontWeight: '800', color: budgetUsedPct > 80 ? '#dc2626' : '#16a34a' }}>{budgetUsedPct}% used</span>
                    </div>
                    <div style={{ height: '8px', background: isDark ? '#1f2937' : '#e2e8f0', borderRadius: '4px' }}>
                      <div style={{ height: '100%', width: `${Math.min(budgetUsedPct, 100)}%`, background: budgetUsedPct > 80 ? '#ef4444' : '#6366f1', borderRadius: '4px', transition: 'width 0.4s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.75rem', color: muted }}>
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

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: cardBg, borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '380px', border: `1px solid ${border}` }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: text, marginBottom: '1.25rem' }}>Edit Profile</h3>
            <div style={fldLabel}>Full Name</div>
            <input style={inpStyle} placeholder="Your name" value={newName} onChange={e => setNewName(e.target.value)} />
            <div style={fldLabel}>Email</div>
            <input style={{ ...inpStyle, opacity: 0.6 }} value={user.email} disabled />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => setShowEditProfile(false)} style={{ padding: '0.75rem', border: `1px solid ${border}`, borderRadius: '8px', background: 'transparent', color: muted, cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={saveProfile} disabled={savingProfile} style={{ padding: '0.75rem', border: 'none', borderRadius: '8px', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: '700', opacity: savingProfile ? 0.7 : 1 }}>
                {savingProfile ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}