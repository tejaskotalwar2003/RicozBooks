const { spawn } = require('child_process');

console.log('===========================================================');
console.log('⚡ Starting RicozBooks Development Servers');
console.log('   - Express Backend API (tsx watch): http://localhost:5000/api/v1');
console.log('   - Next.js Web Frontend (hot reload): http://localhost:3000');
console.log('===========================================================\n');

const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const apiProc = spawn(npmCmd, ['run', 'dev', '--workspace=apps/api'], {
  env: { ...process.env, PORT: '5000' },
  stdio: ['inherit', 'pipe', 'pipe'],
});

apiProc.stdout.on('data', (d) => {
  process.stdout.write(`\x1b[36m[API]\x1b[0m ${d.toString()}`);
});
apiProc.stderr.on('data', (d) => {
  process.stderr.write(`\x1b[31m[API ERR]\x1b[0m ${d.toString()}`);
});

const webProc = spawn(npxCmd, ['next', 'dev', 'apps/web', '-p', '3000'], {
  env: { ...process.env, PORT: '3000', API_URL: 'http://localhost:5000/api/v1' },
  stdio: ['inherit', 'pipe', 'pipe'],
});

webProc.stdout.on('data', (d) => {
  process.stdout.write(`\x1b[32m[WEB]\x1b[0m ${d.toString()}`);
});
webProc.stderr.on('data', (d) => {
  process.stderr.write(`\x1b[33m[WEB ERR]\x1b[0m ${d.toString()}`);
});

function cleanup() {
  console.log('\n🛑 Stopping dev servers...');
  apiProc.kill();
  webProc.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
