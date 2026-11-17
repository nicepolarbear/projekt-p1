import { createApp } from '../server/app.js';
import { getDb } from '../server/db/connection.js';
import { runMigrations } from '../server/db/migrate.js';
import { seedDatabase } from '../server/db/seed.js';

let initialized = false;
let initPromise = null;

async function ensureDb() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const db = getDb();
        await runMigrations(db);
        await seedDatabase(db);
        initialized = true;
      } catch (err) {
        console.warn('Vercel serverless DB warmup warning:', err?.message || err);
        initialized = true;
      }
    })();
  }
  await initPromise;
}

const app = createApp();

export default async function handler(req, res) {
  await ensureDb();

  // Ensure req.url starts with /api so Express routes match regardless of Vercel rewrite mode
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
