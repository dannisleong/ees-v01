import { Pool } from 'pg';

async function main() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: 'ees_v01',
    user: 'postgres',
    password: 'postgres',
    ssl: false,
  });

  const result = await pool.query("SELECT pg_encoding_to_char(encoding) as enc FROM pg_database WHERE datname = 'ees_v01'");
  console.log('Database encoding:', result.rows[0]?.enc);

  await pool.end();
}

main().catch(console.error);
