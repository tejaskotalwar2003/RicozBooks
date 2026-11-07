const net = require('net');

function checkPort(port, host = '127.0.0.1', timeoutMs = 1500) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(timeoutMs);
    s.on('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.on('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.on('error', () => {
      s.destroy();
      resolve(false);
    });
    s.connect(port, host);
  });
}

async function ensureDatabase() {
  const uriFromEnv = process.env.MONGODB_URI;
  if (uriFromEnv && uriFromEnv.includes('mongodb+srv://')) {
    console.log(`[DB] Using remote MongoDB Atlas URI specified in environment.`);
    return { uri: uriFromEnv, replSet: null };
  }

  const isLocalPortOpen = await checkPort(27017);
  if (isLocalPortOpen) {
    console.log(`[DB] Detected active local MongoDB daemon on port 27017.`);
    return { uri: uriFromEnv || 'mongodb://127.0.0.1:27017/ricozbooks_dev', replSet: null };
  }

  console.log(`[DB] No active MongoDB daemon detected on port 27017.`);
  let MongoMemoryReplSet;
  try {
    MongoMemoryReplSet = require('mongodb-memory-server').MongoMemoryReplSet;
  } catch (err) {
    console.warn(`[DB] mongodb-memory-server not installed. Falling back to default URI: ${uriFromEnv || 'mongodb://127.0.0.1:27017/ricozbooks_dev'}`);
    return { uri: uriFromEnv || 'mongodb://127.0.0.1:27017/ricozbooks_dev', replSet: null };
  }
  console.log(`[DB] Initializing embedded MongoDB Replica Set with WiredTiger transactions...`);
  
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ port: 27017 }],
  });

  const uri = replSet.getUri('ricozbooks_dev');
  console.log(`[DB] [OK] Embedded Replica Set ready at: ${uri}`);
  return { uri, replSet };
}

async function stopDatabase(replSet) {
  if (replSet) {
    console.log('[DB] Stopping embedded MongoDB Replica Set...');
    try {
      await replSet.stop();
      console.log('[DB] [OK] Embedded Replica Set stopped.');
    } catch (err) {
      console.error('[DB ERR] Failed to stop Replica Set cleanly:', err.message);
    }
  }
}

module.exports = {
  checkPort,
  ensureDatabase,
  stopDatabase,
};

