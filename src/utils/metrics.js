/**
 * System metrics management module
 * Provides functions to collect and access different metrics
 */

const os = require('os');
const osUtils = require('os-utils');
const logger = require('./logger');

class MetricsCollector {
  constructor () {
    // Initialize counters and metrics
    this.metrics = {
      // OPC UA Metrics
      opcuaConnections: 0,
      opcuaErrors: 0,
      opcuaReconnects: 0,
      opcuaRequests: 0,
      opcuaRequestsErrors: 0,
      opcuaReadOperations: 0,
      opcuaWriteOperations: 0,
      opcuaLastResponseTime: 0,
      opcuaAvgResponseTime: 0,

      // HTTP Metrics
      httpRequests: 0,
      httpErrors: 0,
      http2xx: 0,
      http3xx: 0,
      http4xx: 0,
      http5xx: 0,
      httpLastResponseTime: 0,
      httpAvgResponseTime: 0,
      rateLimit: 0,

      // System Metrics
      cpuUsage: 0,
      memoryUsage: 0,
      totalMemory: 0,
      freeMemory: 0,
      uptime: 0
    };

    // Accumulators for average calculations
    this._opcuaResponseTimeAccumulator = 0;
    this._opcuaResponseTimeCount = 0;
    this._httpResponseTimeAccumulator = 0;
    this._httpResponseTimeCount = 0;

    // Referencia al intervalo para poder limpiarlo después
    this._metricsInterval = null;

    // Start periodic system metrics collection
    this.startSystemMetricsCollection();
  }

  // System - Update system metrics (CPU, memory, etc.)
  startSystemMetricsCollection () {
    this._metricsInterval = setInterval(() => {
      // Update system metrics every 5 seconds
      this.updateSystemMetrics();
    }, 5000);

    // Update system metrics immediately
    this.updateSystemMetrics();
    logger.info('System metrics collection started');
  }

  // Detener la recolección de métricas del sistema
  stopSystemMetricsCollection () {
    if (this._metricsInterval) {
      clearInterval(this._metricsInterval);
      this._metricsInterval = null;
      logger.info('System metrics collection stopped');
    }
  }

  updateSystemMetrics () {
    // Update CPU metrics
    osUtils.cpuUsage((cpuUsage) => {
      this.metrics.cpuUsage = cpuUsage * 100; // Convert to percentage
    });

    // Update memory metrics
    this.metrics.totalMemory = os.totalmem();
    this.metrics.freeMemory = os.freemem();
    this.metrics.memoryUsage = ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;

    // Update server uptime
    this.metrics.uptime = process.uptime();
  }

  // OPC UA - Update OPC UA connection metrics
  incrementOpcuaConnections () {
    this.metrics.opcuaConnections++;
    logger.debug('Incrementing OPC UA connection counter: ' + this.metrics.opcuaConnections);
  }

  decrementOpcuaConnections () {
    if (this.metrics.opcuaConnections > 0) {
      this.metrics.opcuaConnections--;
    }
    logger.debug('Decrementing OPC UA connection counter: ' + this.metrics.opcuaConnections);
  }

  incrementOpcuaErrors () {
    this.metrics.opcuaErrors++;
  }

  incrementOpcuaReconnects () {
    this.metrics.opcuaReconnects++;
  }

  incrementOpcuaRequests () {
    this.metrics.opcuaRequests++;
  }

  incrementOpcuaRequestsErrors () {
    this.metrics.opcuaRequestsErrors++;
  }

  incrementOpcuaReadOperations () {
    this.metrics.opcuaReadOperations++;
  }

  incrementOpcuaWriteOperations () {
    this.metrics.opcuaWriteOperations++;
  }

  recordOpcuaResponseTime (duration) {
    this.metrics.opcuaLastResponseTime = duration;
    this._opcuaResponseTimeAccumulator += duration;
    this._opcuaResponseTimeCount++;
    this.metrics.opcuaAvgResponseTime =
      this._opcuaResponseTimeAccumulator / this._opcuaResponseTimeCount;
  }

  // HTTP - Update HTTP request metrics
  incrementHttpRequests () {
    this.metrics.httpRequests++;
  }

  incrementHttpErrors () {
    this.metrics.httpErrors++;
  }

  incrementHttpStatusCode (statusCode) {
    if (statusCode >= 200 && statusCode < 300) {
      this.metrics.http2xx++;
    } else if (statusCode >= 300 && statusCode < 400) {
      this.metrics.http3xx++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.metrics.http4xx++;
    } else if (statusCode >= 500) {
      this.metrics.http5xx++;
    }
  }

  incrementRateLimit () {
    this.metrics.rateLimit++;
  }

  recordHttpResponseTime (duration) {
    this.metrics.httpLastResponseTime = duration;
    this._httpResponseTimeAccumulator += duration;
    this._httpResponseTimeCount++;
    this.metrics.httpAvgResponseTime =
      this._httpResponseTimeAccumulator / this._httpResponseTimeCount;
  }

  // Get all metrics
  getAllMetrics () {
    return this.metrics;
  }

  // Get specific metrics
  getOpcuaMetrics () {
    return {
      opcuaConnections: this.metrics.opcuaConnections,
      opcuaErrors: this.metrics.opcuaErrors,
      opcuaReconnects: this.metrics.opcuaReconnects,
      opcuaRequests: this.metrics.opcuaRequests,
      opcuaRequestsErrors: this.metrics.opcuaRequestsErrors,
      opcuaReadOperations: this.metrics.opcuaReadOperations,
      opcuaWriteOperations: this.metrics.opcuaWriteOperations,
      opcuaLastResponseTime: this.metrics.opcuaLastResponseTime,
      opcuaAvgResponseTime: this.metrics.opcuaAvgResponseTime
    };
  }

  getHttpMetrics () {
    return {
      httpRequests: this.metrics.httpRequests,
      httpErrors: this.metrics.httpErrors,
      http2xx: this.metrics.http2xx,
      http3xx: this.metrics.http3xx,
      http4xx: this.metrics.http4xx,
      http5xx: this.metrics.http5xx,
      httpLastResponseTime: this.metrics.httpLastResponseTime,
      httpAvgResponseTime: this.metrics.httpAvgResponseTime,
      rateLimit: this.metrics.rateLimit
    };
  }

  getSystemMetrics () {
    // Update system metrics before returning them
    this.updateSystemMetrics();
    return {
      cpuUsage: this.metrics.cpuUsage,
      memoryUsage: this.metrics.memoryUsage,
      totalMemory: this.metrics.totalMemory,
      freeMemory: this.metrics.freeMemory,
      uptime: this.metrics.uptime
    };
  }

  // Método general para actualizar todas las métricas
  updateMetrics () {
    // Por ahora solo actualizamos las métricas del sistema que no se actualizan automáticamente
    this.updateSystemMetrics();
    logger.debug('All metrics updated');
  }
}

// Create a single instance for the entire application
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector; 