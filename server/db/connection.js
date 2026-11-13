import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { env } from '../config/env.js';
import * as schema from './schema.js';

if (typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket;
}

let poolInstance = null;
let drizzleInstance = null;
let dbWrapperInstance = null;

function convertPlaceholders(sql) {
  let paramIndex = 0;
  let inString = false;
  let result = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'") {
      if (inString && sql[i + 1] === "'") {
        result += "''";
        i++;
        continue;
      }
      inString = !inString;
      result += char;
    } else if (char === '?' && !inString) {
      paramIndex++;
      result += `$${paramIndex}`;
    } else {
      result += char;
    }
  }

  return result;
}

export function getPool() {
  if (!poolInstance) {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set in environment or .env.local');
    }
    poolInstance = new Pool({ connectionString: env.DATABASE_URL });
  }
  return poolInstance;
}

export function getDrizzle() {
  if (!drizzleInstance) {
    const pool = getPool();
    drizzleInstance = drizzle(pool, { schema });
  }
  return drizzleInstance;
}

function createStatement(client, sqlText) {
  const pgSql = convertPlaceholders(sqlText.trim());
  const isInsert = /^\s*insert\s+into\b/i.test(pgSql);
  const hasReturning = /\breturning\b/i.test(pgSql);

  const runSql = isInsert && !hasReturning ? `${pgSql} RETURNING *` : pgSql;

  return {
    async get(...params) {
      const flatParams = params.flat();
      const res = await client.query(pgSql, flatParams);
      return res.rows[0];
    },
    async all(...params) {
      const flatParams = params.flat();
      const res = await client.query(pgSql, flatParams);
      return res.rows;
    },
    async run(...params) {
      const flatParams = params.flat();
      const res = await client.query(runSql, flatParams);
      return {
        changes: res.rowCount ?? 0,
        lastInsertRowid: res.rows?.[0]?.id,
      };
    },
  };
}

export function getDb() {
  if (dbWrapperInstance) {
    return dbWrapperInstance;
  }

  const pool = getPool();
  const drizzleClient = getDrizzle();

  dbWrapperInstance = {
    drizzle: drizzleClient,
    pool,
    prepare(sqlText) {
      return createStatement(pool, sqlText);
    },
    async exec(sqlText) {
      return await pool.query(sqlText);
    },
    async query(sqlText, params = []) {
      const pgSql = convertPlaceholders(sqlText);
      const res = await pool.query(pgSql, params.flat());
      return res.rows;
    },
  };

  return dbWrapperInstance;
}

export async function withTransaction(fn) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txWrapper = {
      drizzle: drizzle(client, { schema }),
      client,
      prepare(sqlText) {
        return createStatement(client, sqlText);
      },
      async exec(sqlText) {
        return await client.query(sqlText);
      },
      async query(sqlText, params = []) {
        const pgSql = convertPlaceholders(sqlText);
        const res = await client.query(pgSql, params.flat());
        return res.rows;
      },
    };
    const result = await fn(txWrapper);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failure
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function closeDb() {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    drizzleInstance = null;
    dbWrapperInstance = null;
  }
}

export const db = getDrizzle();
export { schema };
