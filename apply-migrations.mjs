import { Pool } from 'pg';
import { readFileSync } from 'fs';

async function main() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: 'ees_v01',
    user: 'postgres',
    password: 'postgres',
    ssl: false,
  });

  // Set client encoding to UTF8
  await pool.query("SET client_encoding = 'UTF8'");

  const migrations = [
    'prisma/migrations/20250816000000_deposit_ssot_trigger/migration.sql',
    'prisma/migrations/20250816000001_smart_gate_conditions/migration.sql',
    'prisma/migrations/20250816000002_document_access_permissions/migration.sql',
  ];

  for (const file of migrations) {
    console.log(`Applying: ${file}`);
    const sql = readFileSync(file, 'utf-8');
    try {
      await pool.query(sql);
      console.log(`  OK`);
    } catch (e) {
      console.error(`  FAILED: ${e.message}`);
    }
  }

  await pool.end();
  console.log('Done');
}

main().catch(console.error);
