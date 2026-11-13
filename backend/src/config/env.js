const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/resilient_decision_system',
  USE_MEMORY_DB_FALLBACK: process.env.USE_MEMORY_DB_FALLBACK !== 'false',
  JWT_SECRET: process.env.JWT_SECRET || 'super_resilient_jwt_secret_key_change_in_production_2026!',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  EXTERNAL_SERVICE_TIMEOUT_MS: parseInt(process.env.EXTERNAL_SERVICE_TIMEOUT_MS, 10) || 3000,
  EXTERNAL_SERVICE_FAILURE_RATE: parseFloat(process.env.EXTERNAL_SERVICE_FAILURE_RATE) || 0.0,
  MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS, 10) || 3,
  RETRY_BASE_DELAY_MS: parseInt(process.env.RETRY_BASE_DELAY_MS, 10) || 200,
  RETRY_MAX_DELAY_MS: parseInt(process.env.RETRY_MAX_DELAY_MS, 10) || 2000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500
};
