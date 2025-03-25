/**
 * SNMP agent to expose system metrics
 */

const snmp = require('net-snmp');
const metrics = require('./metrics');
const logger = require('./logger');
const CONFIG = require('../config/config');

class SNMPAgent {
  constructor () {
    // Initialize OIDs mapping
    this.oids = {};
    this.registerMetrics();

    this.agent = null;
    this.port = CONFIG.SNMP_PORT || 8161;
    this.community = CONFIG.SNMP_COMMUNITY || 'public';

    // Initialize OID descriptions for documentation
    this.initializeOidDescriptions();
  }

  // Register all metrics with their OIDs
  registerMetrics () {
    // OPC UA Metrics
    this.registerMetric('1.3.6.1.4.1.12345.1.1.1', () => metrics.metrics.opcuaConnections, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.1.2', () => metrics.metrics.opcuaErrors, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.1.3', () => metrics.metrics.opcuaReconnects, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.1.4', () => metrics.metrics.opcuaRequests, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.1.5', () => metrics.metrics.opcuaRequestsErrors, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.1.6', () => metrics.metrics.opcuaReadOperations, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.1.7', () => metrics.metrics.opcuaWriteOperations, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.1.8', () => metrics.metrics.opcuaLastResponseTime, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.1.9', () => metrics.metrics.opcuaAvgResponseTime, snmp.ObjectType.Integer32);

    // HTTP Metrics
    this.registerMetric('1.3.6.1.4.1.12345.1.2.1', () => metrics.metrics.httpRequests, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.2.2', () => metrics.metrics.httpErrors, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.2.3', () => metrics.metrics.http2xx, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.2.4', () => metrics.metrics.http3xx, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.2.5', () => metrics.metrics.http4xx, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.2.6', () => metrics.metrics.http5xx, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.2.7', () => metrics.metrics.httpLastResponseTime, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.2.8', () => metrics.metrics.httpAvgResponseTime, snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.2.9', () => metrics.metrics.rateLimit, snmp.ObjectType.Integer32);

    // System Metrics - Convertir valores decimales a enteros multiplicando por 100 para mantener 2 decimales
    this.registerMetric('1.3.6.1.4.1.12345.1.3.1', () => Math.round(metrics.metrics.cpuUsage * 100), snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.3.2', () => Math.round(metrics.metrics.memoryUsage * 100), snmp.ObjectType.Integer32);
    this.registerMetric('1.3.6.1.4.1.12345.1.3.3', () => Math.floor(metrics.metrics.totalMemory / 1048576), snmp.ObjectType.Integer32); // Convertir a MB
    this.registerMetric('1.3.6.1.4.1.12345.1.3.4', () => Math.floor(metrics.metrics.freeMemory / 1048576), snmp.ObjectType.Integer32); // Convertir a MB
    this.registerMetric('1.3.6.1.4.1.12345.1.3.5', () => Math.round(metrics.metrics.uptime), snmp.ObjectType.Integer32);
  }

  // Helper method to register a metric with its OID
  registerMetric (oid, valueFunction, type) {
    this.oids[oid] = { valueFunction, type };
  }

  // Initialize OID descriptions
  initializeOidDescriptions () {
    this.oidDescriptions = {
      // OPC UA
      '1.3.6.1.4.1.12345.1.1.1': 'Number of OPC UA connections',
      '1.3.6.1.4.1.12345.1.1.2': 'Number of OPC UA errors',
      '1.3.6.1.4.1.12345.1.1.3': 'Number of OPC UA reconnections',
      '1.3.6.1.4.1.12345.1.1.4': 'Number of OPC UA requests',
      '1.3.6.1.4.1.12345.1.1.5': 'Number of OPC UA request errors',
      '1.3.6.1.4.1.12345.1.1.6': 'Number of OPC UA read operations',
      '1.3.6.1.4.1.12345.1.1.7': 'Number of OPC UA write operations',
      '1.3.6.1.4.1.12345.1.1.8': 'Last OPC UA response time (ms)',
      '1.3.6.1.4.1.12345.1.1.9': 'Average OPC UA response time (ms)',

      // HTTP
      '1.3.6.1.4.1.12345.1.2.1': 'Number of HTTP requests',
      '1.3.6.1.4.1.12345.1.2.2': 'Number of HTTP errors',
      '1.3.6.1.4.1.12345.1.2.3': 'Number of HTTP 2xx responses',
      '1.3.6.1.4.1.12345.1.2.4': 'Number of HTTP 3xx responses',
      '1.3.6.1.4.1.12345.1.2.5': 'Number of HTTP 4xx responses',
      '1.3.6.1.4.1.12345.1.2.6': 'Number of HTTP 5xx responses',
      '1.3.6.1.4.1.12345.1.2.7': 'Last HTTP response time (ms)',
      '1.3.6.1.4.1.12345.1.2.8': 'Average HTTP response time (ms)',
      '1.3.6.1.4.1.12345.1.2.9': 'Number of rate limit hits',

      // System
      '1.3.6.1.4.1.12345.1.3.1': 'CPU usage (percentage * 100)',
      '1.3.6.1.4.1.12345.1.3.2': 'Memory usage (percentage * 100)',
      '1.3.6.1.4.1.12345.1.3.3': 'Total memory (MB)',
      '1.3.6.1.4.1.12345.1.3.4': 'Free memory (MB)',
      '1.3.6.1.4.1.12345.1.3.5': 'Server uptime (seconds)'
    };
  }

  // Start the SNMP agent
  start () {
    try {
      logger.info(`Starting SNMP agent on port ${this.port}`);

      // Configuración para el agente SNMP
      const options = {
        port: this.port,
        disableAuthorization: false,
        accessControlModelType: snmp.AccessControlModelType.Simple
      };

      // Crear el agente SNMP
      this.agent = snmp.createAgent(options, (error, data) => {
        if (error) {
          logger.error(`SNMP agent error: ${error.message}`);
        } else if (data) {
          logger.debug(`SNMP agent received data: ${JSON.stringify(data)}`);
        }
      });

      if (!this.agent) {
        throw new Error("Failed to create SNMP agent");
      }

      // Obtener el autorizador y agregar nuestra comunidad
      const authorizer = this.agent.getAuthorizer();
      authorizer.addCommunity(this.community);
      logger.info(`SNMP community '${this.community}' registered successfully`);

      // Configurar el modelo de control de acceso para permitir acceso de lectura
      const acm = authorizer.getAccessControlModel();
      acm.setCommunityAccess(this.community, snmp.AccessLevel.ReadOnly);
      logger.info(`SNMP access level set to ReadOnly for community '${this.community}'`);

      // Registrar proveedores para cada OID
      this._registerProviders();

      // Iniciar la actualización periódica de métricas
      this._startMetricsUpdater();

      logger.info(`SNMP agent started successfully on port ${this.port}`);
      this.logOidDescriptions();

    } catch (error) {
      logger.error(`Failed to start SNMP agent: ${error.message}`);
      throw error;
    }
  }

  // Registrar proveedores para cada OID
  _registerProviders () {
    try {
      // Obtener la MIB del agente
      const mib = this.agent.getMib();

      // Registrar cada OID como un proveedor escalar
      for (const [oidStr, metricInfo] of Object.entries(this.oids)) {
        // Crear un nombre único para el proveedor
        const providerName = `provider_${oidStr.replace(/\./g, '_')}`;

        // Crear la definición del proveedor
        const providerDef = {
          name: providerName,
          type: snmp.MibProviderType.Scalar,
          oid: oidStr,
          scalarType: metricInfo.type,
          maxAccess: snmp.MaxAccess['read-only'],
          handler: (mibRequest) => {
            try {
              // Obtener el valor actual de la métrica
              const value = metricInfo.valueFunction();

              // Si es una solicitud GetRequest, actualizar el valor en la MIB
              if (mibRequest.operation === snmp.PduType.GetRequest ||
                mibRequest.operation === snmp.PduType.GetNextRequest) {
                // Actualizar el valor en la MIB
                mib.setScalarValue(providerName, value);
                logger.debug(`SNMP ${mibRequest.operation === snmp.PduType.GetRequest ? 'GET' : 'GETNEXT'} request for OID ${oidStr}, returning value: ${value}`);
              }

              // Señalar que hemos terminado de procesar la solicitud
              mibRequest.done();
            } catch (error) {
              logger.error(`Error in provider handler for ${oidStr}: ${error.message}`);
              // Señalar un error
              mibRequest.done({
                errorStatus: snmp.ErrorStatus.GeneralError
              });
            }
          }
        };

        // Registrar el proveedor
        mib.registerProvider(providerDef);

        // Establecer un valor inicial para este proveedor
        try {
          const initialValue = metricInfo.valueFunction();
          mib.setScalarValue(providerName, initialValue);
          logger.debug(`Registered OID ${oidStr} with initial value ${initialValue}`);
        } catch (error) {
          logger.error(`Error setting initial value for OID ${oidStr}: ${error.message}`);
        }
      }

      logger.info(`Successfully registered ${Object.keys(this.oids).length} OID providers`);
    } catch (error) {
      logger.error(`Error registering providers: ${error.message}`);
      throw error;
    }
  }

  // Actualizar periódicamente las métricas para mantenerlas frescas
  _startMetricsUpdater () {
    // Forzar una actualización inmediata
    metrics.updateMetrics();

    // Programar actualizaciones periódicas cada 5 segundos
    this.metricsInterval = setInterval(() => {
      try {
        metrics.updateMetrics();
        logger.debug('Metrics updated for SNMP');
      } catch (error) {
        logger.error(`Error updating metrics: ${error.message}`);
      }
    }, 5000);

    logger.info('Periodic metrics updater started');
  }

  // Stop the SNMP agent
  stop () {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
      logger.info('Metrics updater stopped');
    }

    if (this.agent) {
      try {
        this.agent.close();
        this.agent = null;
        logger.info('SNMP agent stopped');
      } catch (error) {
        logger.error(`Error stopping SNMP agent: ${error.message}`);
      }
    }
  }

  // Log OID descriptions for monitoring configuration
  logOidDescriptions () {
    logger.info('=== SNMP Configuration for Monitoring ===');
    logger.info(`SNMP Port: ${this.port}`);
    logger.info(`SNMP Community: ${this.community}`);

    logger.info('Available OIDs:');
    Object.entries(this.oidDescriptions).forEach(([oid, description]) => {
      logger.info(`${oid} - ${description}`);
    });

    logger.info('=======================================');
  }
}

// Create a singleton instance of the SNMP agent
const snmpAgent = new SNMPAgent();

module.exports = snmpAgent; 