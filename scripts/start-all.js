const { spawn } = require('child_process');
const path = require('path');
const { ensureDatabase, stopDatabase } = require('./ensure-db');

async function main() {
  console.log('===========================================================');
  console.log('🚀 Starting RicozBooks Monorepo Services');
  console.log('   - Express Backend API: http://localhost:5000/api/v1');
  console.log('   - Next.js Web Frontend: http://localhost:3000');
  console.log('===========================================================\n');

  // 1. Ensure Database (Atlas, existing local daemon, or embedded Replica Set)
  let replSet = null;
  let mongoUri = process.env.MONGODB_URI;
  try {
    const dbInfo = await ensureDatabase();
    replSet = dbInfo.replSet;
    mongoUri = dbInfo.uri;
  } catch (err) {
    console.error('[DB ERR] Failed to initialize database:', err.message);
  }

  const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');

  // 2. Start Express.js API
  const apiProc = spawn('node', ['apps/api/dist/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '5000', MONGODB_URI: mongoUri || process.env.MONGODB_URI },
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  apiProc.stdout.on('data', (d) => {
    process.stdout.write(`\x1b[36m[API]\x1b[0m ${d.toString()}`);
  });
  apiProc.stderr.on('data', (d) => {
    process.stderr.write(`\x1b[31m[API ERR]\x1b[0m ${d.toString()}`);
  });

  // 3. Start Next.js Web
  const webProc = spawn('node', [`"${nextBin}"`, 'start', 'apps/web', '-p', '3000'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3000', API_URL: 'http://localhost:5000/api/v1' },
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  webProc.stdout.on('data', (d) => {
    process.stdout.write(`\x1b[32m[WEB]\x1b[0m ${d.toString()}`);
  });
  webProc.stderr.on('data', (d) => {
    process.stderr.write(`\x1b[33m[WEB ERR]\x1b[0m ${d.toString()}`);
  });

  async function cleanup() {
    console.log('\n🛑 Shutting down all RicozBooks services...');
    try { apiProc.kill(); } catch (e) {}
    try { webProc.kill(); } catch (e) {}
    await stopDatabase(replSet);
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch(console.error);
