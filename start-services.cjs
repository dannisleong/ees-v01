const { spawn } = require('child_process');
const fs = require('fs');

// Start API
const api = spawn('npx', ['tsx', 'api/src/index.ts'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe']
});
fs.writeFileSync('api.pid', String(api.pid));

api.stdout.on('data', d => fs.appendFileSync('api.log', d));
api.stderr.on('data', d => fs.appendFileSync('api.log', d));

console.log('API starting on PID', api.pid);

// Start Vite after 3s
setTimeout(() => {
  const vite = spawn('npx', ['vite', '--port', '3000'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  fs.writeFileSync('vite.pid', String(vite.pid));
  vite.stdout.on('data', d => fs.appendFileSync('vite.log', d));
  vite.stderr.on('data', d => fs.appendFileSync('vite.log', d));
  console.log('Vite starting on PID', vite.pid);
}, 3000);

// Keep alive
setInterval(() => {}, 1000);
