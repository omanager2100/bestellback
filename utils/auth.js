// utils/auth.js
import fs from 'fs-extra';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersPath = path.join(__dirname, '..', 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'geheim123';

export async function login(username, password) {
  const users = await fs.readJson(usersPath);
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) throw new Error('Ungültige Zugangsdaten');

  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
  return token;
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload;
  } catch (err) {
    throw new Error('Token ungültig oder abgelaufen');
  }
}
