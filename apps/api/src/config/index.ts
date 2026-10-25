import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: '/api/v1',
  appName: 'RicozBooks API (Node/Express)',
  appVersion: '1.3.0',
  
  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ricozbooks_db',
  
  // Security & JWT
  jwtSecret: process.env.JWT_SECRET || 'ricozbooks_super_secure_jwt_secret_key_2026_enterprise_finance',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
    : [
        'https://ricozbooks-web-staging.onrender.com',
        'https://ricozbooks-web.onrender.com',
        'https://ricozbooks.onrender.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
  
  // Frontend URL
  frontendUrl: process.env.FRONTEND_URL || 'https://ricozbooks-web-staging.onrender.com',
};

