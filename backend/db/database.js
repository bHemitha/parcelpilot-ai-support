import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    const dbPath = CONFIG.DATABASE_URL;
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? null : null
    });
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');

    // Run schema
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      dbInstance.exec(schemaSql);
    }
  }
  return dbInstance;
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export default getDatabase;
