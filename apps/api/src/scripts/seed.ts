import mongoose from 'mongoose';
import { config } from '../config';
import { SeedService } from '../services/seed.service';

async function runSeed() {
  console.log(`Connecting to MongoDB: ${config.mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  await mongoose.connect(config.mongoUri);
  console.log('Running SeedService.seedAll()...');
  await SeedService.seedAll();
  console.log('✅ Seed completed successfully.');
  await mongoose.disconnect();
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

