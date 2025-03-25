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
// Mantener un array de todas las sesiones creadas para asegurar la limpieza
let allSessions = [];

describe('SNMP Performance Tests', () => {
  beforeAll(async () => {
    // Saltamos todas las pruebas si la variable está establecida
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Limpiar array de sesiones
    allSessions = [];

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

    // Guardar referencia a la sesión para limpieza
    allSessions.push(session);
  });

  // Función para cerrar una sesión SNMP de forma segura
  const closeSessionSafely = (sess) => {
    if (!sess) return;

    try {
      // Cancelar todas las solicitudes pendientes
      if (typeof sess.cancelRequests === 'function') {
        sess.cancelRequests();
      }

      // Eliminar todos los listeners
      if (typeof sess.removeAllListeners === 'function') {
        sess.removeAllListeners();
      }

      // Intentar cerrar sockets internos
      if (sess._socket) {
        try {
          if (typeof sess._socket.removeAllListeners === 'function') {
            sess._socket.removeAllListeners();
          }
          if (typeof sess._socket.unref === 'function') {
            sess._socket.unref();
          }
          if (typeof sess._socket.close === 'function') {
            sess._socket.close();
          }
        } catch (socketErr) {
          console.error(`Error closing session socket: ${socketErr.message}`);
        }
        // Forzar limpieza de referencia
        sess._socket = null;
      }

      // Cerrar la sesión explícitamente
      sess.close();

      // Limpiar timers internos (si existen)
      if (sess._timer) {
        clearTimeout(sess._timer);
        sess._timer = null;
      }

      // Limpiar referencias internas
      if (sess._reqs) {
        sess._reqs = {};
      }
    } catch (err) {
      console.error(`Error closing SNMP session: ${err.message}`);
    }
  };

  afterEach(() => {
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Cerrar la sesión actual después de cada prueba
    if (session) {
      closeSessionSafely(session);
      session = null;
    }
  });

  afterAll(async () => {
    if (process.env.SKIP_PERFORMANCE_TESTS) {
      return;
    }

    // Cerrar todas las sesiones que pudieran haber quedado abiertas
    allSessions.forEach(sess => {
      if (sess) {
        closeSessionSafely(sess);
      }
    });

    // Limpiar array de sesiones
    allSessions = [];

    // Asegurarse de que la sesión principal esté cerrada
    if (session) {
      closeSessionSafely(session);
      session = null;
    }

    // Detener el agente después de todas las pruebas
    if (agentStarted) {
      try {
        await snmpAgent.stop();
        agentStarted = false;
        console.log('SNMP agent stopped after performance tests');
      } catch (err) {
        console.error(`Error stopping SNMP agent: ${err.message}`);
        agentStarted = false;
      }
    }

    // Intentar forzar la limpieza de cualquier recurso restante
    try {
      // Forzar la recolección de basura si está disponible
      if (global.gc) {
        global.gc();
      }
    } catch (e) {
      // Ignorar errores en esta etapa final
    }
  }, 15000);

  /**
   * Función para realizar una consulta SNMP de forma prometificada
   */
  const snmpGet = (oids) => {
    return new Promise((resolve, reject) => {
      // Usar un ID de timeout para poder cancelarlo después
      const timeoutId = setTimeout(() => {
        reject(new Error('SNMP request timed out'));
      }, TIMEOUT_MS);

      // Solo intentar la consulta si la sesión está disponible
      if (!session) {
        clearTimeout(timeoutId);
        return reject(new Error('SNMP session not available'));
      }

      try {
        session.get(oids, (error, varbinds) => {
          // Siempre limpiar el timeout
          clearTimeout(timeoutId);

          if (error) {
            reject(error);
          } else {
            resolve(varbinds);
          }
        });
      } catch (execError) {
        // Capturar errores de ejecución
        clearTimeout(timeoutId);
        reject(execError);
      }
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

    // Esperar a que todas las promesas se resuelvan o rechacen
    const results = await Promise.all(promises);
    const endTime = Date.now();

    // Analizar resultados
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const timeouts = results.filter(r => !r.success && r.error && r.error.message === 'SNMP request timed out').length;
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