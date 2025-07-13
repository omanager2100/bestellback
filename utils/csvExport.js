// utils/csvExport.js
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createObjectCsvWriter } from 'csv-writer';
import ftp from 'basic-ftp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = path.join(__dirname, '..', 'exports');
await fs.ensureDir(EXPORT_DIR);

export async function createCsvForOrder(order) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `bestellung_${order.user}_${timestamp}.csv`;
  const filePath = path.join(EXPORT_DIR, filename);

  const records = order.items.map(item => ({
    kundennummer: order.kundennummer,
    artikelnummer: item.artikelnummer,
    menge: item.menge,
    einheit: item.einheit
  }));

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: 'kundennummer', title: 'Kundennummer' },
      { id: 'artikelnummer', title: 'Artikelnummer' },
      { id: 'menge', title: 'Menge' },
      { id: 'einheit', title: 'Einheit' }
    ],
    fieldDelimiter: '|'
  });

  await csvWriter.writeRecords(records);
  return filePath;
}

export async function uploadToFtp(filePath) {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD,
      secure: false
    });

    await client.uploadFrom(filePath, path.basename(filePath));
  } finally {
    client.close();
  }
}
