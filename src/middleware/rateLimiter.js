const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos por defecto
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 solicitudes por ventana por defecto
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later'
    });
  }
});

module.exports = limiter; 