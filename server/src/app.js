/**
 * Express Application Setup
 * 
 * Configures all middleware, routes, and error handling.
 * Separated from server.js so the app can be tested without starting the server.
 */

const express = require('express');
const cors = require('cors');
const corsOptions = require('./config/cors');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const routes = require('./routes');

const app = express();

// ─── Global Middleware ───────────────────────────────────────────

// CORS
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (development)
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
});

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/v1', routes);
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HMS Server is running',
    version: '1.0.0',
    docs: '/api/v1/health',
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────

app.use((req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
});

// ─── Error Handler ───────────────────────────────────────────────

app.use(errorHandler);

module.exports = app;
