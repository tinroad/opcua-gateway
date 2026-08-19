const crypto = require('crypto');
const logger = require('../utils/logger');
const CONFIG = require('../config/config');

const isConfigured = (value) => typeof value === 'string' && value.length > 0;

const getConfiguredMethods = () => ({
  apiKey: isConfigured(CONFIG.API_KEY),
  basic: isConfigured(CONFIG.AUTH_USERNAME) && isConfigured(CONFIG.AUTH_PASSWORD)
});

const safeEqual = (provided, expected) => {
  if (typeof provided !== 'string' || !isConfigured(expected)) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

const parseBasicCredentials = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  const base64Credentials = authHeader.slice('Basic '.length).trim();
  if (!base64Credentials) {
    return null;
  }

  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const separatorIndex = credentials.indexOf(':');

  if (separatorIndex <= 0) {
    return null;
  }

  return {
    username: credentials.slice(0, separatorIndex),
    password: credentials.slice(separatorIndex + 1)
  };
};

const assertAuthenticationConfigured = () => {
  const methods = getConfiguredMethods();

  if (!methods.apiKey && !methods.basic) {
    throw new Error(
      'Authentication is not configured. Set API_KEY or both AUTH_USERNAME and AUTH_PASSWORD.'
    );
  }
};

const combinedAuth = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  const authHeader = req.header('Authorization');
  const methods = getConfiguredMethods();

  // If there is no API Key or Basic Auth
  if (!apiKey && !authHeader) {
    logger.warn('Request without any authentication');
    return res.status(401)
      .header('WWW-Authenticate', 'Basic')
      .json({ error: 'Authentication required (Basic Auth or API Key)' });
  }

  // Verify API Key
  if (methods.apiKey && safeEqual(apiKey, CONFIG.API_KEY)) {
    logger.info('Authentication successful via API Key');
    return next();
  }

  // Verify Basic Auth
  if (methods.basic) {
    const credentials = parseBasicCredentials(authHeader);

    if (credentials &&
      safeEqual(credentials.username, CONFIG.AUTH_USERNAME) &&
      safeEqual(credentials.password, CONFIG.AUTH_PASSWORD)) {
      logger.info('Authentication successful via Basic Auth');
      return next();
    }
  }

  // If no authentication was successful
  return res.status(401)
    .header('WWW-Authenticate', 'Basic')
    .json({ error: 'Invalid authentication credentials' });
};

combinedAuth.assertAuthenticationConfigured = assertAuthenticationConfigured;

module.exports = combinedAuth;
