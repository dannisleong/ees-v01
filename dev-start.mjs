import { spawn } from 'child_process';
import net from 'net';

function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      const client = net.createConnection({ port, host: '127.0.0.1' });
      client.on('connect', () => { client.end(); resolve(); });
      client.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error(`Port ${port} not ready`));
        setTimeout(tryConnect, 500);
      });
    };
    tryConnect();
  });
}

async function run(cmd, label) {
  console.log(`[dev] ${label}...`);
  const code = await new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, stdio: 'inherit' });
    child.on('close', resolve);
  });
  return code;
}

async function main() {
  console.log('[dev] EES V0.1 — Starting services...');

  // 1. PostgreSQL (background)
  const pg = spawn('node start-pg-resume.mjs', { shell: true, stdio: 'inherit' });
  await waitForPort(5432);
  console.log('[dev] PostgreSQL ready');

  // 2. Migrations (blocking)
  const migrateCode = await run('npx prisma migrate deploy', 'Applying migrations');
  if (migrateCode !== 0) throw new Error('Migration failed');

  // 3. API (background)
  const api = spawn('npx tsx api/src/index.ts', { shell: true, stdio: 'inherit' });
  await waitForPort(3001);
  console.log('[dev] API ready');

  // 4. Vite (foreground — blocks here)
  console.log('[dev] Starting Vite...');
  const vite = spawn('npx vite --port 3000', { shell: true, stdio: 'inherit' });

  // Cleanup on Ctrl+C
  process.on('SIGINT', () => { pg.kill(); api.kill(); vite.kill(); process.exit(0); });
}

main().catch((e) => { console.error('[dev] Fatal:', e.message); process.exit(1); });
