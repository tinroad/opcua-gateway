const express = require('express');
const path = require('path');
const serveIndex = require('serve-index');
const CONFIG = require('./config/config');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const opcuaService = require('./services/opcuaService');
const iotgatewayRoutes = require('./routes/iotgatewayRoutes');
const healthRoutes = require('./routes/healthRoutes');
const configRoutes = require('./routes/configRoutes');
const cors = require('cors');
const morgan = require('morgan');
const opcuaRoutes = require('./routes/opcuaRoutes');
const errorHandler = require('./middleware/errorHandler');
const helmet = require('helmet');
const corsOptions = require('./config/corsConfig');
const rateLimiter = require('./middleware/rateLimiter');
const combinedAuth = require('./middleware/combinedAuth');

const app = express();

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(rateLimiter);

// Basic Middleware
app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));
app.use(requestLogger);

// Authentication Middleware
app.use('/iotgateway', combinedAuth);

// Routes
app.use('/iotgateway', iotgatewayRoutes);
app.use('/', healthRoutes);

// Configuration routes only in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/', configRoutes);
}

// Serve static files
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use('/public', serveIndex(path.join(__dirname, '../public')));

// Routes
app.use('/api/opcua', opcuaRoutes);

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error in request: ${err.message}`);
  res.status(500).send({ error: 'Internal server error' });
});

// Clean server shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received, closing server...');
  await opcuaService.closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received, closing server...');
  await opcuaService.closeConnections();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app; 