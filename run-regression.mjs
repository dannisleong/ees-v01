import EmbeddedPostgres from 'embedded-postgres';
import { spawn } from 'child_process';

async function runCommand(cmd) {
  return new Promise((resolve) => {
    console.log(`\n>>> Running: ${cmd}`);
    const child = spawn(cmd, { shell: true, stdio: 'inherit' });
    child.on('close', (code) => resolve(code));
  });
}

async function main() {
  console.log('Starting embedded PostgreSQL...');

  const pg = new EmbeddedPostgres({
    databaseDir: './embedded-pg-data',
    user: 'postgres',
    password: 'postgres',
    port: 5432,
    persistent: true,
  });

  await pg.initialise();
  await pg.start();
  console.log('PostgreSQL started on port 5432');

  // Create ees_v01 database
  try {
    await pg.createDatabase('ees_v01');
    console.log('Database ees_v01 created');
  } catch (e) {
    console.log('Database ees_v01 may already exist:', e.message);
  }

  // Run Prisma migrate deploy
  const migrateCode = await runCommand('npx prisma migrate deploy');
  if (migrateCode !== 0) {
    console.error('Prisma migrate deploy failed');
    await pg.stop();
    process.exit(1);
  }

  // Run all test suites
  const tests = [
    'npx tsx api/src/tests/deposit-ssot.test.ts',
    'npx tsx api/src/tests/smart-gate.test.ts',
    'npx tsx api/src/tests/quality-audit.test.ts',
    'npx tsx api/src/tests/document-access.test.ts',
    'npx tsx api/src/tests/bom-management.test.ts',
    'npx tsx api/src/tests/eta-tracking.test.ts',
    'npx tsx api/src/tests/dashboard.test.ts',
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const code = await runCommand(test);
    if (code === 0) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY`);
  console.log(`========================================`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  console.log(`Total tests: 113 expected`);
  console.log(`========================================`);

  await pg.stop();
  console.log('PostgreSQL stopped');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
