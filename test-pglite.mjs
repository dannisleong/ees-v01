import { Pool } from 'pg';

async function test() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'postgres',
    ssl: false,
  });

  try {
    const result = await pool.query('SELECT version()');
    console.log('Connected:', result.rows[0].version);

    // Test pgcrypto / gen_random_uuid
    const uuidResult = await pool.query('SELECT gen_random_uuid() as id');
    console.log('UUID works:', uuidResult.rows[0].id);

    // Test creating a table
    await pool.query('CREATE TABLE IF NOT EXISTS test_pglite (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT)');
    console.log('CREATE TABLE works');

    // Test insert
    await pool.query("INSERT INTO test_pglite (name) VALUES ('test')");
    console.log('INSERT works');

    const select = await pool.query('SELECT * FROM test_pglite');
    console.log('SELECT works:', select.rows);

    await pool.query('DROP TABLE test_pglite');
    console.log('DROP TABLE works');

    console.log('\nPGlite is compatible with basic Prisma operations!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

test();
