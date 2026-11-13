import fs from 'node:fs';
import { getDb } from './connection.js';

const SCHEMA_PATH = new URL('./schema.sql', import.meta.url);

export function runMigrations(db = getDb()) {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(sql);
}
