require('dotenv').config();

const CONFIG = {
  // OPC UA Configuration
  OPC_ENDPOINT: process.env.OPC_ENDPOINT || "opc.tcp://127.0.0.1:4840",
  OPC_SECURITY_MODE: parseInt(process.env.OPC_SECURITY_MODE || "1"),
  OPC_SECURITY_POLICY: process.env.OPC_SECURITY_POLICY || "None",
  OPC_NAMESPACE: parseInt(process.env.OPC_NAMESPACE || "2"),
  OPC_APPLICATION_URI: process.env.OPC_APPLICATION_URI || "urn:CLIENT:NodeOPCUA-Client",

  // OPC UA Certificate Configuration (optional)
  OPC_CERTIFICATE_FILE: process.env.OPC_CERTIFICATE_FILE,
  OPC_PRIVATE_KEY_FILE: process.env.OPC_PRIVATE_KEY_FILE,
  OPC_TRUSTED_FOLDER: process.env.OPC_TRUSTED_FOLDER,
  OPC_REJECTED_FOLDER: process.env.OPC_REJECTED_FOLDER,

  // Connection Configuration
  CONNECTION_RETRY_MAX: parseInt(process.env.CONNECTION_RETRY_MAX || "5"),
  CONNECTION_INITIAL_DELAY: parseInt(process.env.CONNECTION_INITIAL_DELAY || "1000"),
  CONNECTION_MAX_RETRY: parseInt(process.env.CONNECTION_MAX_RETRY || "10"),
  CONNECTION_MAX_DELAY: parseInt(process.env.CONNECTION_MAX_DELAY || "10000"),
  CONNECTION_RETRY_DELAY: parseInt(process.env.CONNECTION_RETRY_DELAY || "5000"),

  // Server Configuration
  SERVER_PORT: parseInt(process.env.SERVER_PORT || "3000"),

  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_FILE_ERROR: process.env.LOG_FILE_ERROR || "error.log",
  LOG_FILE_COMBINED: process.env.LOG_FILE_COMBINED || "combined.log",
  LOG_TO_CONSOLE: process.env.LOG_TO_CONSOLE !== "false"
};

module.exports = CONFIG;
