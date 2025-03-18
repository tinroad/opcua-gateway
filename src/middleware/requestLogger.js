const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  logger.info(`Request received: ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Request completed: ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

module.exports = requestLogger; 