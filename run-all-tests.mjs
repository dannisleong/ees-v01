import { spawn } from 'child_process';
import net from 'net';

function waitForPort(host, port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for port'));
          return;
        }
        setTimeout(tryConnect, 500);
      });
      socket.once('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for port'));
          return;
        }
        setTimeout(tryConnect, 500);
      });
      socket.connect(port, host);
    };
    tryConnect();
  });
}

async function runTest(cmd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, stdio: 'inherit' });
    child.on('close', (code) => resolve(code));
  });
}

async function main() {
  // Start pglite-server as a child process
  const server = spawn('npx', ['pglite-server', '--port=5432', '--host=127.0.0.1', '--max-connections=10', '--db=./pglite-data'], {
    shell: true,
    stdio: 'pipe',
  });

  let serverOutput = '';
  server.stdout.on('data', (d) => { serverOutput += d.toString(); process.stdout.write(d); });
  server.stderr.on('data', (d) => { process.stderr.write(d); });

  console.log('Waiting for PGlite server on port 5432...');
  try {
    await waitForPort('127.0.0.1', 5432, 30000);
    console.log('PGlite server is ready');
  } catch (e) {
    console.error('Server failed to start:', e.message);
    console.error('Server output:', serverOutput);
    server.kill();
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
    console.log(`\n=== Running: ${test} ===`);
    const code = await runTest(test);
    if (code === 0) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);

  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
