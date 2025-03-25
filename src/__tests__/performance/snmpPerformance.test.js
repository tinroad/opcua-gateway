/**
 * Test de rendimiento para el agente SNMP
 * Este test evalúa la capacidad del agente para manejar múltiples consultas concurrentes
 */

const netSnmp = require('net-snmp');
const { performance } = require('perf_hooks');
const snmpAgent = require('../../utils/snmpAgent');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// Configuración de la prueba
const ITERATIONS = 100;    // Número de consultas
const CONCURRENCY = 10;    // Consultas concurrentes
const TIMEOUT_MS = 5000;   // Tiempo máximo de espera por consulta

// Variable para controlar si el agente ya se inició
let agentStarted = false;
let session;

describe('SNMP Performance Tests', () => {
  beforeAll(async () => {
    // Saltamos todas las pruebas si la variable está establecida
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Iniciamos el agente si no está ya iniciado
    if (!agentStarted) {
      await snmpAgent.start();
      agentStarted = true;
      console.log('SNMP agent started for performance tests');
    }
  }, 30000);

  beforeEach(() => {
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Crear una sesión SNMP con tiempos de espera adecuados para pruebas de rendimiento
    const options = {
      port: snmpAgent.port || 8161,
      retries: 1,
      timeout: 5000,
      backoff: 1.0,
      transport: 'udp4',
      trapPort: 162,
      version: netSnmp.Version2c,
    };

    session = netSnmp.createSession('127.0.0.1', 'public', options);
  });

  afterEach(() => {
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Cerrar la sesión después de cada prueba
    if (session) {
      session.close();
      session = null;
    }
  });

  afterAll(async () => {
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Detener el agente después de todas las pruebas
    if (agentStarted) {
      await snmpAgent.stop();
      agentStarted = false;
      console.log('SNMP agent stopped after performance tests');
    }
  }, 10000);

  /**
   * Función para realizar una consulta SNMP de forma prometificada
   */
  const snmpGet = (oids) => {
    return new Promise((resolve, reject) => {
      session.get(oids, (error, varbinds) => {
        if (error) {
          reject(error);
        } else {
          resolve(varbinds);
        }
      });
    });
  };

  it('debe soportar múltiples consultas concurrentes', async () => {
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Definir parámetros de la prueba
    const iterations = 100;  // Número total de consultas
    const oids = ['1.3.6.1.4.1.12345.1.1.1.0', '1.3.6.1.4.1.12345.1.3.1.0'];

    // Función para realizar una consulta individual y medir el tiempo
    const makeRequest = async () => {
      const start = Date.now();
      try {
        const result = await snmpGet(oids);
        const time = Date.now() - start;
        return { success: true, time, result };
      } catch (error) {
        const time = Date.now() - start;
        return { success: false, time, error };
      }
    };

    // Realizar todas las consultas concurrentemente
    const startTime = Date.now();
    const promises = Array(iterations).fill().map(() => makeRequest());
    const results = await Promise.all(promises);
    const endTime = Date.now();

    // Analizar resultados
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const timeouts = results.filter(r => !r.success && r.error && r.error.status === 'RequestTimedOut').length;
    const times = results.map(r => r.time);
    const totalTime = endTime - startTime;

    // Imprimir resultados
    console.log(`Total consultas: ${iterations}`);
    console.log(`Exitosas: ${successful}`);
    console.log(`Fallidas: ${failed}`);
    console.log(`Timeouts: ${timeouts}`);
    console.log(`Tiempo total: ${totalTime.toFixed(2)}ms`);

    // Calcular estadísticas adicionales
    if (successful > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      const qps = (successful / (totalTime / 1000)).toFixed(2);

      console.log(`Tiempo promedio por consulta: ${avg.toFixed(2)}ms`);
      console.log(`Tiempo mínimo: ${min.toFixed(2)}ms`);
      console.log(`Tiempo máximo: ${max.toFixed(2)}ms`);
      console.log(`Consultas por segundo: ${qps}`);
    }

    // Verificar resultados
    expect(successful / iterations).toBeGreaterThanOrEqual(0.9); // Al menos 90% éxito
    expect(totalTime / successful).toBeLessThan(1000); // Menos de 1000ms por consulta en promedio
  }, 60000);
}); 