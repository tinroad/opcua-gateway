const { OPCUAClient } = require("node-opcua");
const CONFIG = require('../config/config');
const logger = require('../utils/logger');

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
      });

      client.on("connection_lost", async () => {
        logger.error("OPC UA connection lost. Restarting client...");
        if (!this.isReconnecting) {
          this.isReconnecting = true;
          try {
            await this.closeConnections();
            this.clientPool = null;
            this.sessionPool = null;
            await this.initOPCUAClient();
          } catch (error) {
            logger.error(`Error during reconnection: ${error.message}`);
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

      await client.connect(CONFIG.OPC_ENDPOINT);
      logger.info("OPC UA connection established successfully");

      const session = await client.createSession();
      logger.info("OPC UA session created successfully");

      this.clientPool = client;
      this.sessionPool = session;
      this.connectionRetries = 0;

      return { client, session };
    } catch (err) {
      logger.error(`Error initializing OPC UA client: ${err.message}`);
      this.connectionRetries++;

      if (this.connectionRetries >= this.MAX_RETRIES) {
        logger.error(`Maximum retry attempts reached (${this.MAX_RETRIES}). Waiting ${this.RETRY_DELAY / 1000} seconds before retrying.`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        this.connectionRetries = 0;
      }

      this.clientPool = null;
      this.sessionPool = null;
      throw err;
    }
  }

  async readOPC (attribute) {
    if (!attribute) {
      logger.error("Read attempt without specifying an attribute");
      throw new Error("Attribute not specified");
    }

    let client = null;
    let session = null;
    let usePooledConnection = true;

    try {
      try {
        const pooledConnection = await this.initOPCUAClient();
        client = pooledConnection.client;
        session = pooledConnection.session;
      } catch (error) {
        logger.warn("Could not use pooled connection, creating a new connection.");
        usePooledConnection = false;
        client = OPCUAClient.create();
        await client.connect(CONFIG.OPC_ENDPOINT);
        session = await client.createSession();
      }

      const nodeId = `ns=${CONFIG.OPC_NAMESPACE};s=${attribute}`;
      logger.info(`Reading value from ${nodeId}`);

      const readResult = await session.read({ nodeId });
      logger.info(`Read from ${nodeId} completed with status: ${readResult.statusCode.name}`);

      if (!usePooledConnection) {
        await session.close();
        await client.disconnect();
      }

      return readResult;
    } catch (err) {
      logger.error(`Error reading OPC UA value (${attribute}): ${err.message}`);

      if (!usePooledConnection && client && session) {
        try {
          await session.close();
          await client.disconnect();
        } catch (closeErr) {
          logger.error(`Error closing OPC UA session: ${closeErr.message}`);
        }
      }

      if (usePooledConnection) {
        try {
          if (this.sessionPool) await this.sessionPool.close();
          if (this.clientPool) await this.clientPool.disconnect();
        } catch (e) {
          logger.error(`Error closing pooled connection: ${e.message}`);
        }
        this.clientPool = null;
        this.sessionPool = null;
      }

      return false;
    }
  }

  async closeConnections () {
    if (this.sessionPool) await this.sessionPool.close();
    if (this.clientPool) await this.clientPool.disconnect();
    this.clientPool = null;
    this.sessionPool = null;
  }
}

module.exports = new OPCUAService(); 