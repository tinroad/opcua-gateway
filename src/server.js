const app = require('./app');
const CONFIG = require('./config/config');
const logger = require('./utils/logger');
const opcuaService = require('./services/opcuaService');

const PORT = CONFIG.SERVER_PORT;

app.listen(PORT, async () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Connecting to OPC UA endpoint: ${CONFIG.OPC_ENDPOINT}`);

  // Initialize OPC UA connection at startup
  try {
    await opcuaService.initOPCUAClient();
  } catch (err) {
    logger.warn(`Could not establish initial OPC UA connection: ${err.message}`);
  }
}); 