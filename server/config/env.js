import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number.parseInt(process.env.PORT || '3001', 10);
const DB_PATH = path.resolve(process.cwd(), process.env.DB_PATH || 'data/taskflow.db');
const DATABASE_URL = process.env.DATABASE_URL || process.env['database.url'] || '';
const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'TaskFlow2026!';

function resolveSessionSecret() {
  const envSecret = process.env.SESSION_SECRET;

  if (NODE_ENV === 'production') {
    if (!envSecret || envSecret.length < 32) {
      throw new Error(
        'SESSION_SECRET environment variable must be set and at least 32 characters long in production.'
      );
    }
    return envSecret;
  }

  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }

  const secretPath = path.resolve(process.cwd(), 'data/.dev-secret');
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });

  if (fs.existsSync(secretPath)) {
    const existing = fs.readFileSync(secretPath, 'utf8').trim();
    if (existing.length >= 32) {
      return existing;
    }
  }

  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, `${generated}\n`, { encoding: 'utf8', mode: 0o600 });
  return generated;
}

const SESSION_SECRET = resolveSessionSecret();

export const env = Object.freeze({
  NODE_ENV,
  PORT: Number.isNaN(PORT) ? 3001 : PORT,
  DB_PATH,
  DATABASE_URL,
  SEED_DEFAULT_PASSWORD,
  SESSION_SECRET,
  COOKIE_SECRET: SESSION_SECRET,
});
