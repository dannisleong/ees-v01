import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function main() {
  // Start pglite-server
  const server = spawn('npx', ['pglite-server', '--port=5432', '--host=127.0.0.1', '--max-connections=10', '--db=./pglite-data'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    shell: true
  });

  let ready = false;
  server.stdout.on('data', (data) => {
    const str = data.toString();
    console.log('[PGlite]', str.trim());
    if (str.includes('listening on')) ready = true;
  });
  server.stderr.on('data', (data) => {
    console.error('[PGlite err]', data.toString().trim());
  });

  // Wait for server to be ready
  for (let i = 0; i < 30; i++) {
    if (ready) break;
    await setTimeout(500);
  }

  if (!ready) {
    console.error('PGlite server did not start');
    server.kill();
    process.exit(1);
  }

  console.log('PGlite server ready, running tests...');

  // Run all tests sequentially
  const tests = [
    'npx tsx api/src/tests/deposit-ssot.test.ts',
    'npx tsx api/src/tests/smart-gate.test.ts',
    'npx tsx api/src/tests/quality-audit.test.ts',
    'npx tsx api/src/tests/document-access.test.ts',
    'npx tsx api/src/tests/bom-management.test.ts',
    'npx tsx api/src/tests/eta-tracking.test.ts',
    'npx tsx api/src/tests/dashboard.test.ts',
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const testCmd of tests) {
    console.log(`\n=== Running: ${testCmd} ===`);
    const result = spawn(testCmd, { cwd: process.cwd(), shell: true, stdio: 'inherit' });
    const exitCode = await new Promise<number>((resolve) => result.on('close', resolve));
    if (exitCode === 0) {
      totalPassed++;
    } else {
      totalFailed++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Suites passed: ${totalPassed}/${tests.length}`);
  console.log(`Suites failed: ${totalFailed}/${tests.length}`);

  server.kill();
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
