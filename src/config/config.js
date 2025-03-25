require('dotenv').config();

const CONFIG = {
  // OPC UA Configuration
  OPC_ENDPOINT: process.env.OPC_ENDPOINT || "opc.tcp://127.0.0.1:4840",
  OPC_SECURITY_MODE: parseInt(process.env.OPC_SECURITY_MODE) || 1,
  OPC_SECURITY_POLICY: process.env.OPC_SECURITY_POLICY || "None",
  OPC_NAMESPACE: parseInt(process.env.OPC_NAMESPACE) || 2,
  OPC_APPLICATION_URI: process.env.OPC_APPLICATION_URI || "urn:CLIENT:NodeOPCUA-Client",

  // OPC UA Certificate Configuration (optional)
  OPC_CERTIFICATE_FILE: process.env.OPC_CERTIFICATE_FILE || './certificates/client_cert.pem',
  OPC_PRIVATE_KEY_FILE: process.env.OPC_PRIVATE_KEY_FILE || './certificates/client_key.pem',
  OPC_TRUSTED_FOLDER: process.env.OPC_TRUSTED_FOLDER || './certificates/trusted',
  OPC_REJECTED_FOLDER: process.env.OPC_REJECTED_FOLDER || './certificates/rejected',

  // Connection Configuration
  CONNECTION_RETRY_MAX: parseInt(process.env.CONNECTION_RETRY_MAX) || 10,
  CONNECTION_INITIAL_DELAY: parseInt(process.env.CONNECTION_INITIAL_DELAY) || 2000,
  CONNECTION_MAX_RETRY: parseInt(process.env.CONNECTION_MAX_RETRY) || 15,
  CONNECTION_MAX_DELAY: parseInt(process.env.CONNECTION_MAX_DELAY) || 15000,
  CONNECTION_RETRY_DELAY: parseInt(process.env.CONNECTION_RETRY_DELAY) || 10000,

  // Server Configuration
  SERVER_PORT: parseInt(process.env.SERVER_PORT) || 3000,

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_FILE_ERROR: process.env.LOG_FILE_ERROR || "error.log",
  LOG_FILE_COMBINED: process.env.LOG_FILE_COMBINED || "combined.log",
  LOG_TO_CONSOLE: process.env.LOG_TO_CONSOLE === 'true',

  // Security Configuration
  API_KEY: process.env.API_KEY,
  AUTH_USERNAME: process.env.AUTH_USERNAME || 'admin',
  AUTH_PASSWORD: process.env.AUTH_PASSWORD,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  CORS_MAX_AGE: parseInt(process.env.CORS_MAX_AGE) || 600,
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,

  // Environment Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',

  // SNMP Configuration
  ENABLE_SNMP: process.env.ENABLE_SNMP === 'true',
  SNMP_PORT: parseInt(process.env.SNMP_PORT) || 8161,
  SNMP_VERSION: parseInt(process.env.SNMP_VERSION) || 1,
  SNMP_COMMUNITY: process.env.SNMP_COMMUNITY || 'public',
  SNMP_SECURITY_NAME: process.env.SNMP_SECURITY_NAME || 'opcgwuser',
  SNMP_SECURITY_LEVEL: process.env.SNMP_SECURITY_LEVEL || 'authPriv',
  SNMP_AUTH_PROTOCOL: process.env.SNMP_AUTH_PROTOCOL || 'SHA256',
  SNMP_AUTH_KEY: process.env.SNMP_AUTH_KEY || 'opcgw_auth_key',
  SNMP_PRIV_PROTOCOL: process.env.SNMP_PRIV_PROTOCOL || 'AES128',
  SNMP_PRIV_KEY: process.env.SNMP_PRIV_KEY || 'opcgw_priv_key',
  SNMP_USER_2_NAME: process.env.SNMP_USER_2_NAME,
  SNMP_USER_2_LEVEL: process.env.SNMP_USER_2_LEVEL || 'authPriv',
  SNMP_USER_2_AUTH_PROTOCOL: process.env.SNMP_USER_2_AUTH_PROTOCOL || 'SHA256',
  SNMP_USER_2_AUTH_KEY: process.env.SNMP_USER_2_AUTH_KEY || 'user2_auth_key',
  SNMP_USER_2_PRIV_PROTOCOL: process.env.SNMP_USER_2_PRIV_PROTOCOL || 'AES128',
  SNMP_USER_2_PRIV_KEY: process.env.SNMP_USER_2_PRIV_KEY || 'user2_priv_key'
};

module.exports = CONFIG;
