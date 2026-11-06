import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from local root or apps/api directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
let mongoUri = (process.env.MONGODB_URI || '').trim();

if (!mongoUri) {
  if (isProd) {
    throw new Error(
      '[FATAL CONFIG ERROR] MONGODB_URI environment variable is required in production! ' +
      'Please configure your online MongoDB Atlas connection string (e.g. mongodb+srv://<username>:<password>@<cluster-url>/ricozbooks_prod?retryWrites=true&w=majority).'
    );
  }
  mongoUri = 'mongodb://127.0.0.1:27017/ricozbooks_dev';
} else if (isProd && (mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost'))) {
  throw new Error(
    '[FATAL CONFIG ERROR] MONGODB_URI cannot point to localhost/127.0.0.1 in production! ' +
    'Please configure your online MongoDB Atlas connection string.'
  );
}

export const config = {
  env,
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: '/api/v1',
  appName: 'RicozBooks API (Node/Express)',
  appVersion: '1.3.0',
  
  // Database
  mongoUri,
  
  // Security & JWT
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_ricozbooks_change_in_production_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // CORS
  corsOrigins: [
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
    'https://ricozbooks-web-staging.onrender.com',
    'https://ricozbooks-web.onrender.com',
    'https://ricozbooks.onrender.com',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000',
  ],
};
