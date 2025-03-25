const logger = require('../utils/logger');
const CONFIG = require('../config/config');

const combinedAuth = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  const authHeader = req.header('Authorization');

  // If there is no API Key or Basic Auth
  if (!apiKey && !authHeader) {
    logger.warn('Request without any authentication');
    return res.status(401)
      .header('WWW-Authenticate', 'Basic')
      .json({ error: 'Authentication required (Basic Auth or API Key)' });
  }

  // Verify API Key
  if (apiKey && apiKey === CONFIG.API_KEY) {
    logger.info('Authentication successful via API Key');
    return next();
  }

  // Verify Basic Auth
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username === CONFIG.AUTH_USERNAME && password === CONFIG.AUTH_PASSWORD) {
      logger.info('Authentication successful via Basic Auth');
      return next();
    }
  }

  // If no authentication was successful
  return res.status(401)
    .header('WWW-Authenticate', 'Basic')
    .json({ error: 'Invalid authentication credentials' });
};

module.exports = combinedAuth; 