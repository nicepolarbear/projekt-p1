import { closeDb, getDb } from './connection.js';
import { runMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';

async function resetDatabase() {
  const db = getDb();
  try {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS task_assignments;
      DROP TABLE IF EXISTS tasks;
      DROP TABLE IF EXISTS priorities;
      DROP TABLE IF EXISTS task_statuses;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS departments;
      DROP TABLE IF EXISTS positions;
      DROP TABLE IF EXISTS roles;
      PRAGMA foreign_keys = ON;
    `);

    runMigrations(db);
    const result = await seedDatabase(db, { force: true });
    console.log('Database reset, migrated, and seeded successfully:', result.counts);
  } finally {
    closeDb();
  }
}

await resetDatabase();
