import { spawn } from 'child_process';

const isWin = process.platform === 'win32';
const pathSep = isWin ? ';' : ':';

const env = {
  ...process.env,
  PATH: [
    'C:\\Users\\danni\\AppData\\Local\\Programs\\Kimi\\resources\\resources\\runtime',
    'C:\\Users\\danni\\AppData\\Roaming\\kimi-desktop\\daimon-share\\daimon\\command-process-owner\\bin',
  ].join(pathSep) + pathSep + process.env.PATH,
};

const child = spawn('npx.cmd tsx api/src/index.ts', {
  cwd: process.cwd(),
  stdio: 'inherit',
  env,
  shell: true,
});

child.on('error', (err) => console.error('ERROR:', err));
child.on('exit', (code) => console.log('EXIT:', code));

setTimeout(() => {
  console.log('Test complete, killing child...');
  child.kill();
  process.exit(0);
}, 5000);
