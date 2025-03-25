/**
 * Tests de integración para el agente SNMP
 * Este test requiere que el servidor esté en ejecución
 */

const net = require('net');
const axios = require('axios');
const netSnmp = require('net-snmp');
const snmpAgent = require('../../utils/snmpAgent');
const logger = require('../../utils/logger');

// Variable para controlar si el agente ya se inició
let agentStarted = false;
let session;
// Puerto aleatorio para el agente SNMP en las pruebas
let snmpPort;

// Función para encontrar un puerto disponible
function getAvailablePort () {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

// Pruebas saltables con variable de entorno
const itIfNotSkipped = process.env.SKIP_INTEGRATION_TESTS
  ? it.skip
  : it;

describe('SNMP Integration Tests', () => {
  beforeAll(async () => {
    // Saltamos todas las pruebas si la variable está establecida
    if (process.env.SKIP_INTEGRATION_TESTS) {
      return;
    }

    // Obtenemos un puerto disponible
    try {
      snmpPort = await getAvailablePort();
      console.log(`Usando puerto SNMP aleatorio: ${snmpPort}`);
    } catch (err) {
      console.error(`Error al obtener puerto disponible: ${err.message}`);
      snmpPort = 0; // Puerto aleatorio asignado por el sistema
    }

    // Configuramos el agente SNMP con el puerto aleatorio
    snmpAgent.port = snmpPort;

    // Iniciamos el agente si no está ya iniciado
    if (!agentStarted) {
      await snmpAgent.start();
      agentStarted = true;
    }
  }, 30000);

  beforeEach(() => {
    // Creamos una sesión SNMP para cada prueba
    const options = {
      port: snmpPort,
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
    // Cerramos la sesión después de cada prueba
    if (session) {
      session.close();
    }
  });

  afterAll(async () => {
    // No detenemos el agente si estamos saltando las pruebas
    if (process.env.SKIP_INTEGRATION_TESTS) {
      return;
    }

    // Detenemos el agente después de todas las pruebas
    if (agentStarted) {
      try {
        // Parar el actualizador de métricas antes de detener el agente
        if (snmpAgent.metricsInterval) {
          clearInterval(snmpAgent.metricsInterval);
          snmpAgent.metricsInterval = null;
          logger.info('Metrics updater stopped manually after tests');
        }

        await snmpAgent.stop();
        agentStarted = false;
        console.log('SNMP agent stopped after integration tests');
      } catch (err) {
        console.error(`Error al detener el agente SNMP: ${err.message}`);
      }
    }
  }, 10000);

  itIfNotSkipped('debe responder con un valor definido para un OID válido', (done) => {
    session.get(['1.3.6.1.4.1.12345.1.3.1.0'], (error, varbinds) => {
      expect(error).toBeNull();
      expect(varbinds.length).toBe(1);
      expect(varbinds[0].value).toBeDefined();
      expect(typeof varbinds[0].value).toBe('number');
      done();
    });
  }, 30000);

  itIfNotSkipped('debe tener valores consistentes con las métricas de la API', async () => {
    // Intentamos obtener métricas HTTP, pero podría fallar si el servidor no está en ejecución
    let httpMetrics;
    try {
      const response = await axios.get('http://localhost:3000/metrics');
      httpMetrics = response.data;
    } catch (err) {
      console.log('No se pudo obtener métricas HTTP. Asegúrate de que el servidor esté en ejecución');
      httpMetrics = null;
    }

    // Obtenemos un valor SNMP usando una promesa
    return new Promise((resolve, reject) => {
      session.get(['1.3.6.1.4.1.12345.1.3.1.0'], (error, varbinds) => {
        try {
          expect(error).toBeNull();
          expect(varbinds.length).toBe(1);

          // Si tenemos métricas HTTP, comparamos los valores
          if (httpMetrics && httpMetrics.system && httpMetrics.system.cpu) {
            // Normalización: SNMP reporta porcentaje * 100
            const snmpValue = varbinds[0].value / 100;
            expect(Math.abs(snmpValue - httpMetrics.system.cpu)).toBeLessThan(5);
          }

          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }, 30000);

  itIfNotSkipped('debe manejar OIDs desconocidos correctamente', (done) => {
    session.get(['1.3.6.1.4.1.12345.99.99.99.0'], (error, varbinds) => {
      expect(varbinds.length).toBe(1);
      expect(varbinds[0].type).toBe(netSnmp.ObjectType.NoSuchObject);
      done();
    });
  }, 30000);

  itIfNotSkipped('debe soportar consultas múltiples', (done) => {
    session.get(['1.3.6.1.4.1.12345.1.3.1.0', '1.3.6.1.4.1.12345.1.3.2.0'], (error, varbinds) => {
      expect(error).toBeNull();
      expect(varbinds.length).toBe(2);
      expect(varbinds[0].value).toBeDefined();
      expect(varbinds[1].value).toBeDefined();
      done();
    });
  }, 30000);
}); 