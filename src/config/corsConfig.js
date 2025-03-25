const CONFIG = require('./config');

const corsOptions = {
  origin: CONFIG.ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: CONFIG.CORS_MAX_AGE,
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

module.exports = corsOptions; 