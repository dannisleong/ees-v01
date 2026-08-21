import { Pool } from 'pg';

async function test() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: 'ees_v01',
    user: 'postgres',
    password: 'postgres',
    ssl: false,
  });

  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('Connection OK:', result.rows);
  } catch (e) {
    console.error('Connection failed:', e.message);
  } finally {
    await pool.end();
  }
}

test();
