// scripts/importArtikelCsv.js
import fs from 'fs';
import csv from 'csv-parser';
import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../data/artikel.db');
const csvPath = join(__dirname, '../data/artikel.csv');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('DROP TABLE IF EXISTS artikel');
  db.run('CREATE TABLE artikel (artikelnummer TEXT PRIMARY KEY, bezeichnung TEXT NOT NULL)');

  const stmt = db.prepare('INSERT OR IGNORE INTO artikel VALUES (?, ?)');

  fs.createReadStream(csvPath)
    .pipe(csv({ separator: ',' }))
    .on('data', row => {
      stmt.run(row.ARTNR1, row.ABEZ1);
    })
    .on('end', () => {
      stmt.finalize();
      console.log('artikel.csv erfolgreich importiert in artikel.db');
      db.close();
    });
});
