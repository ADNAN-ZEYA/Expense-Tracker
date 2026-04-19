import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import './App.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const API = '/api';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('income');

  useEffect(() => { fetchTransactions(); }, []);

  const fetchTransactions = async () => {
    const res = await fetch(`${API}/transactions`);
    const data = await res.json();
    setTransactions(data);
  };

  const addTransaction = async () => {
    if (!description || !amount) return alert('Fill all fields');
    await fetch(`${API}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount, type })
    });
    setDescription('');
    setAmount('');
    fetchTransactions();
  };

  const deleteTransaction = async (id) => {
    await fetch(`${API}/transactions/${id}`, { method: 'DELETE' });
    fetchTransactions();
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const chartData = {
    labels: ['Income', 'Expense'],
    datasets: [{
      data: [totalIncome || 0, totalExpense || 0],
      backgroundColor: ['#4ade80', '#f87171'],
      borderColor: ['#166534', '#7f1d1d'],
      borderWidth: 2
    }]
  };

  return (
    <div className="app">
      <h1>Expense Tracker</h1>

      <div className="summary">
        <div className="card balance">
          <h3>Balance</h3>
          <p>₹{balance.toFixed(2)}</p>
        </div>
        <div className="card income">
          <h3>Total Income</h3>
          <p>₹{totalIncome.toFixed(2)}</p>
        </div>
        <div className="card expense">
          <h3>Total Expense</h3>
          <p>₹{totalExpense.toFixed(2)}</p>
        </div>
      </div>

      <div className="main">
        <div className="form-section">
          <h2>Add Transaction</h2>
          <input
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <input
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <div className="type-toggle">
            <button
              className={type === 'income' ? 'active-income' : ''}
              onClick={() => setType('income')}
            >Income</button>
            <button
              className={type === 'expense' ? 'active-expense' : ''}
              onClick={() => setType('expense')}
            >Expense</button>
          </div>
          <button className="btn-add" onClick={addTransaction}>
            Add Transaction
          </button>
        </div>

        <div className="chart-section">
          <h2>Overview</h2>
          <Doughnut data={chartData} options={{
            plugins: { legend: { labels: { color: '#e2e8f0' } } }
          }} />
        </div>

        <div className="list-section">
          <h2>Transaction History</h2>
          {transactions.length === 0
            ? <p className="empty">No transactions yet. Add one above.</p>
            : [...transactions].reverse().map(t => (
              <div key={t.id} className={`transaction-item ${t.type}`}>
                <div>
                  <div className="desc">{t.description}</div>
                  <div className="date">{t.date}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="amount">
                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(2)}
                  </span>
                  <button className="btn-delete" onClick={() => deleteTransaction(t.id)}>✕</button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}