const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const ApiResponse = require('./utils/apiResponse');

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : [env.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing with safe size bounds
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter on API endpoints
app.use('/api', apiLimiter);

// Health check root
app.get('/', (req, res) => {
  res.json({
    name: 'Resilient Decision System API',
    status: 'ONLINE',
    version: '1.0.0',
    documentation: '/docs',
    health: '/api/health'
  });
});

// Mount modular API routes
app.use('/api', routes);

// 404 handler
app.use('*', (req, res) => {
  return ApiResponse.error(res, `Route ${req.originalUrl} not found`, 404, null, 'NOT_FOUND');
});

// Global error handler
app.use(errorHandler);

module.exports = app;
