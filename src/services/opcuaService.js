const { OPCUAClient, AttributeIds, DataType } = require('node-opcua');
const CONFIG = require('../config/config');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');

class OPCUAService {
  constructor () {
    this.clientPool = null;
    this.sessionPool = null;
    this.connectionRetries = 0;
    this.MAX_RETRIES = CONFIG.CONNECTION_RETRY_MAX;
    this.RETRY_DELAY = CONFIG.CONNECTION_RETRY_DELAY;
    this.isReconnecting = false;
  }

  async initOPCUAClient () {
    if (this.clientPool) {
      return { client: this.clientPool, session: this.sessionPool };
    }

    try {
      logger.info(`Initializing OPC UA connection to ${CONFIG.OPC_ENDPOINT}`);

      // Base client configuration
      const clientOptions = {
        applicationName: "OPC UA Gateway",
        applicationUri: CONFIG.OPC_APPLICATION_URI,
        connectionStrategy: {
          initialDelay: CONFIG.CONNECTION_INITIAL_DELAY,
          maxRetry: CONFIG.CONNECTION_MAX_RETRY,
          maxDelay: CONFIG.CONNECTION_MAX_DELAY,
          randomisationFactor: 0.1
        },
        securityMode: CONFIG.OPC_SECURITY_MODE,
        securityPolicy: CONFIG.OPC_SECURITY_POLICY,
        endpointMustExist: true,
        keepSessionAlive: true,
        requestedSessionTimeout: 60000, // 1 minuto
        keepaliveInterval: 10000        // 10 segundos
      };

      // Add certificate configuration only if using a security mode that requires it
      if (CONFIG.OPC_SECURITY_MODE > 1 && CONFIG.OPC_SECURITY_POLICY !== "None") {
        logger.info("Configuring certificates for secure mode");
        clientOptions.certificateFile = CONFIG.OPC_CERTIFICATE_FILE;
        clientOptions.privateKeyFile = CONFIG.OPC_PRIVATE_KEY_FILE;
        clientOptions.trustedFolder = CONFIG.OPC_TRUSTED_FOLDER;
        clientOptions.rejectedFolder = CONFIG.OPC_REJECTED_FOLDER;
      } else {
        logger.info("Using unsecured mode");
      }

      const client = OPCUAClient.create(clientOptions);

      // Mejorado el manejo de eventos de conexión
      client.on("backoff", (retry, delay) => {
        logger.warn(`Retrying connection to ${CONFIG.OPC_ENDPOINT}. Attempt ${retry}, delay ${delay}ms`);
        metrics.incrementOpcuaReconnects();
      });

      client.on("connection_lost", async () => {
        logger.error("OPC UA connection lost. Restarting client...");
        metrics.incrementOpcuaErrors();

        if (!this.isReconnecting) {
          this.isReconnecting = true;
          try {
            await this.closeConnections();
            this.clientPool = null;
            this.sessionPool = null;
            await this.initOPCUAClient();
          } catch (error) {
            logger.error(`Error during reconnection: ${error.message}`);
            metrics.incrementOpcuaErrors();
          } finally {
            this.isReconnecting = false;
          }
        }
      });

      client.on("connection_reestablished", () => {
        logger.info("OPC UA connection reestablished");
        this.connectionRetries = 0;
      });

      client.on("keepalive", () => {
        logger.debug("OPC UA keepalive received");
      });

      const startTime = Date.now();
      await client.connect(CONFIG.OPC_ENDPOINT);
      const connectionTime = Date.now() - startTime;
      metrics.recordOpcuaResponseTime(connectionTime);

      logger.info("OPC UA connection established successfully");
      metrics.incrementOpcuaConnections();

      const session = await client.createSession();
      logger.info("OPC UA session created successfully");

      this.clientPool = client;
      this.sessionPool = session;
      this.connectionRetries = 0;

      return { client, session };
    } catch (err) {
      logger.error(`Error initializing OPC UA client: ${err.message}`);
      metrics.incrementOpcuaErrors();
      this.connectionRetries++;

      if (this.connectionRetries >= this.MAX_RETRIES) {
        logger.error(`Maximum connection retries (${this.MAX_RETRIES}) reached. Giving up.`);
        throw new Error(`Failed to connect to OPC UA server after ${this.MAX_RETRIES} attempts`);
      }

      // Retry with exponential backoff
      const delay = Math.min(this.RETRY_DELAY * Math.pow(1.5, this.connectionRetries - 1), 30000);
      logger.info(`Retrying connection in ${delay}ms...`);

      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const result = await this.initOPCUAClient();
            resolve(result);
          } catch (error) {
            logger.error(`Error in retry attempt: ${error.message}`);
            metrics.incrementOpcuaErrors();
            resolve({ client: null, session: null });
          }
        }, delay);
      });
    }
  }

  async readOPC (attribute) {
    try {
      metrics.incrementOpcuaRequests();
      metrics.incrementOpcuaReadOperations();

      // Ensure we have a connection
      if (!this.clientPool || !this.sessionPool) {
        await this.initOPCUAClient();
      }

      if (!this.sessionPool) {
        throw new Error("No OPC UA session available");
      }

      // Validate the attribute format
      if (!attribute || typeof attribute !== 'string') {
        throw new Error("Invalid attribute format");
      }

      logger.debug(`Reading OPC attribute: ${attribute}`);

      const startTime = Date.now();
      const result = await this.sessionPool.read({
        nodeId: attribute,
        attributeId: AttributeIds.Value
      });
      const responseTime = Date.now() - startTime;
      metrics.recordOpcuaResponseTime(responseTime);

      if (result.statusCode.isGood()) {
        logger.debug(`Successfully read attribute ${attribute}: ${result.value.value}`);
        return {
          s: true,
          v: result.value.value,
          q: result.statusCode.name
        };
      } else {
        logger.warn(`Error reading attribute ${attribute}: ${result.statusCode.description}`);
        metrics.incrementOpcuaRequestsErrors();
        return {
          s: false,
          v: null,
          q: result.statusCode.description
        };
      }
    } catch (err) {
      logger.error(`Exception reading OPC attribute ${attribute}: ${err.message}`);
      metrics.incrementOpcuaRequestsErrors();
      metrics.incrementOpcuaErrors();

      return {
        s: false,
        v: null,
        q: err.message
      };
    }
  }

  async closeConnections () {
    try {
      if (this.sessionPool) {
        logger.info("Closing OPC UA session...");
        await this.sessionPool.close();
        this.sessionPool = null;
      }

      if (this.clientPool) {
        logger.info("Disconnecting OPC UA client...");
        await this.clientPool.disconnect();
        this.clientPool = null;
        metrics.decrementOpcuaConnections();
      }

      logger.info("OPC UA connections closed successfully");
      return true;
    } catch (err) {
      logger.error(`Error closing OPC UA connections: ${err.message}`);
      metrics.incrementOpcuaErrors();
      return false;
    }
  }

  async writeValues (writeData) {
    try {
      metrics.incrementOpcuaRequests();
      metrics.incrementOpcuaWriteOperations();

      // Ensure we have a connection
      if (!this.clientPool || !this.sessionPool) {
        await this.initOPCUAClient();
      }

      if (!this.sessionPool) {
        throw new Error("No OPC UA session available");
      }

      // Process each write request
      const results = [];
      const startTime = Date.now();

      for (const item of writeData) {
        try {
          if (!item.id || item.value === undefined) {
            results.push({
              s: false,
              v: null,
              r: "Invalid write data format. Must contain id and value."
            });
            continue;
          }

          const nodeId = item.id;
          const value = this.convertValue(item.value, item.dataType);

          logger.debug(`Writing value ${value} to ${nodeId}`);

          const result = await this.sessionPool.write({
            nodeId: nodeId,
            attributeId: AttributeIds.Value,
            value: {
              value: value
            }
          });

          if (result.isGood()) {
            results.push({
              s: true,
              v: item.value,
              r: result.name
            });
          } else {
            metrics.incrementOpcuaRequestsErrors();
            results.push({
              s: false,
              v: item.value,
              r: result.description
            });
          }
        } catch (err) {
          logger.error(`Error writing to ${item.id}: ${err.message}`);
          metrics.incrementOpcuaRequestsErrors();
          results.push({
            s: false,
            v: item.value,
            r: err.message
          });
        }
      }

      const responseTime = Date.now() - startTime;
      metrics.recordOpcuaResponseTime(responseTime);

      return results;
    } catch (err) {
      logger.error(`Exception in write operation: ${err.message}`);
      metrics.incrementOpcuaErrors();
      metrics.incrementOpcuaRequestsErrors();
      return [
        {
          s: false,
          v: null,
          r: err.message
        }
      ];
    }
  }

  detectDataType (value) {
    if (Number.isInteger(value)) {
      return "Int32";
    } else if (typeof value === "number") {
      return "Double";
    } else if (typeof value === "boolean") {
      return "Boolean";
    } else if (typeof value === "string") {
      return "String";
    } else {
      return "Variant";
    }
  }

  convertValue (value, dataType) {
    const type = dataType || this.detectDataType(value);

    // No need for type conversion in most cases since node-opcua handles that
    // Just return the native JavaScript value
    return value;
  }
}

const opcuaService = new OPCUAService();

module.exports = opcuaService; 