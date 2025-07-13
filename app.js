// app.js
import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { login, verifyToken } from './utils/auth.js';
import { createCsvForOrder, uploadToFtp } from './utils/csvExport.js';
import sqlite3 from 'sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const usersPath = path.join(__dirname, 'data', 'users.json');
const ordersPath = path.join(__dirname, 'data', 'bestellungen.json');
const artikelDbPath = path.join(__dirname, 'data', 'artikel.db');

const db = new sqlite3.Database(artikelDbPath);

// === LOGIN ===
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const token = await login(username, password);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// === GET BESTELLUNGEN ===
app.get('/api/orders', async (req, res) => {
  try {
    const token = req.headers.authorization;
    const user = verifyToken(token);
    const allOrders = await fs.readJson(ordersPath);
    const filtered = user.role === 'admin' ? allOrders : allOrders.filter(o => o.user === user.username);
    res.json(filtered);
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

// === NEUE BESTELLUNG SPEICHERN ===
app.post('/api/orders', async (req, res) => {
  const token = req.headers.authorization;
  const user = verifyToken(token);
  const neueBestellung = req.body;
  neueBestellung.user = user.username;
  neueBestellung.status = 'entwurf';
  neueBestellung.createdAt = new Date().toISOString();
  const orders = await fs.readJson(ordersPath);
  orders.push(neueBestellung);
  await fs.writeJson(ordersPath, orders, { spaces: 2 });
  res.json({ success: true });
});

// === BESTELLUNG BEARBEITEN ===
app.put('/api/orders/:id', async (req, res) => {
  const token = req.headers.authorization;
  const user = verifyToken(token);
  const orders = await fs.readJson(ordersPath);
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).send('Nicht gefunden');
  if (orders[idx].status === 'freigegeben') return res.status(400).send('Nicht bearbeitbar');
  if (orders[idx].user !== user.username && user.role !== 'admin') return res.status(403).send('Kein Zugriff');
  orders[idx] = { ...orders[idx], ...req.body };
  await fs.writeJson(ordersPath, orders, { spaces: 2 });
  res.json({ success: true });
});

// === BESTELLUNG FREIGEBEN & CSV EXPORTIEREN ===
app.post('/api/orders/:id/freigeben', async (req, res) => {
  const token = req.headers.authorization;
  const user = verifyToken(token);
  const orders = await fs.readJson(ordersPath);
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).send('Nicht gefunden');
  const order = orders[idx];
  if (order.status === 'freigegeben') return res.status(400).send('Schon freigegeben');

  const csvPath = await createCsvForOrder(order);
  await uploadToFtp(csvPath);
  order.status = 'freigegeben';
  order.exportedAt = new Date().toISOString();
  orders[idx] = order;
  await fs.writeJson(ordersPath, orders, { spaces: 2 });
  res.json({ success: true });
});

// === ARTIKEL SUCHEN AUS SQLite ===
app.get('/api/artikel/:nummer', (req, res) => {
  db.get('SELECT * FROM artikel WHERE artikelnummer = ?', [req.params.nummer], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB-Fehler' });
    if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(row);
  });
});

app.listen(PORT, () => console.log('Server ready on port ' + PORT));
