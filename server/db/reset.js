import { closeDb, getDb } from './connection.js';
import { runMigrations } from './migrate.js';
import { seedDatabase } from './seed.js';

async function resetDatabase() {
  const db = getDb();
  try {
    await db.exec(`
      DROP TABLE IF EXISTS bug_task_links CASCADE;
      DROP TABLE IF EXISTS bug_comments CASCADE;
      DROP TABLE IF EXISTS bug_reports CASCADE;
      DROP TABLE IF EXISTS applications CASCADE;
      DROP TABLE IF EXISTS join_requests CASCADE;
      DROP TABLE IF EXISTS invitation_codes CASCADE;
      DROP TABLE IF EXISTS organization_members CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS task_assignments CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS priorities CASCADE;
      DROP TABLE IF EXISTS task_statuses CASCADE;
      DROP TABLE IF EXISTS sessions CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
      DROP TABLE IF EXISTS positions CASCADE;
      DROP TABLE IF EXISTS organizations CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
    `);

    await runMigrations(db);
    const result = await seedDatabase(db, { force: true });
    console.log('Database reset, migrated, and seeded successfully:', result.counts);
  } finally {
    await closeDb();
  }
}

await resetDatabase();
