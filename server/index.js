import { createApp } from './app.js';
import { env } from './config/env.js';
import { closeDb, getDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';

async function start() {
  const db = getDb();
  runMigrations(db);
  await seedDatabase(db);

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`TaskFlow API server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      closeDb();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start TaskFlow API server:', err);
  closeDb();
  process.exit(1);
});
