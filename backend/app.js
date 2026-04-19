const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'transactions.json');

app.use(cors());
app.use(express.json());

const readData = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
};

const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

app.get('/api/transactions', (req, res) => {
  res.json(readData());
});

app.post('/api/transactions', (req, res) => {
  const { description, amount, type } = req.body;
  if (!description || !amount || !type) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const transactions = readData();
  const newTransaction = {
    id: Date.now().toString(),
    description,
    amount: parseFloat(amount),
    type,
    date: new Date().toLocaleDateString()
  };
  transactions.push(newTransaction);
  writeData(transactions);
  res.status(201).json(newTransaction);
});

app.delete('/api/transactions/:id', (req, res) => {
  const transactions = readData();
  const filtered = transactions.filter(t => t.id !== req.params.id);
  writeData(filtered);
  res.json({ message: 'Deleted' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));