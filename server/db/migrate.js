import fs from 'node:fs';
import { getPool } from './connection.js';

export async function runMigrations() {
  const pool = getPool();
  try {
    const check = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles')"
    );
    if (!check.rows[0]?.exists) {
      const migrationPath = new URL('./migrations/0000_empty_lilith.sql', import.meta.url);
      if (fs.existsSync(migrationPath)) {
        const sql = fs.readFileSync(migrationPath, 'utf8');
        const statements = sql
          .split('--> statement-breakpoint')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const statement of statements) {
          await pool.query(statement);
        }
      }
    }
  } catch (err) {
    console.warn('Migration check warning (tables may already exist):', err.message);
  }
}
