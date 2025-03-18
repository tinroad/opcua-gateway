const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: parseInt(process.env.CORS_MAX_AGE) || 600,
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

module.exports = corsOptions; 