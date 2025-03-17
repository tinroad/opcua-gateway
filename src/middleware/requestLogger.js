const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const start = Date.now();
  logger.info(`Petición recibida: ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Petición completada: ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

module.exports = requestLogger; 