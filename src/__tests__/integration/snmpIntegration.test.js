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
// Mantener un array de todas las sesiones creadas para asegurar la limpieza
let allSessions = [];

// Función para encontrar un puerto disponible
function getAvailablePort () {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    // Manejar errores del servidor
    server.on('error', (err) => {
      if (err.code === 'EACCES') {
        // Si hay error de permisos, intentar con un puerto más alto
        server.listen(0, '127.0.0.1', () => {
          const port = server.address().port;
          server.close(() => {
            resolve(port);
          });
        });
      } else {
        reject(err);
      }
    });

    // Intentar primero con un puerto aleatorio en el rango 49152-65535
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      if (port < 49152) {
        // Si el puerto es muy bajo, intentar con uno más alto
        server.close(() => {
          server.listen(0, '127.0.0.1', () => {
            const newPort = server.address().port;
            server.close(() => {
              resolve(newPort);
            });
          });
        });
      } else {
        server.close(() => {
          resolve(port);
        });
      }
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

    // Definir variable para controlar tiempo de espera
    jest.setTimeout(60000); // 60 segundos para todas las pruebas

    // Limpiar array de sesiones
    allSessions = [];

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

    // Forzar detención del agente por si quedó alguno de ejecución anterior
    try {
      await snmpAgent.stop();
      console.log('Agente SNMP anterior detenido exitosamente');
    } catch (error) {
      console.log('No había agente SNMP anterior o error al detenerlo:', error.message);
    }

    // Iniciamos el agente si no está ya iniciado
    console.log('Iniciando agente SNMP para pruebas de integración...');
    try {
      await snmpAgent.start();
      agentStarted = true;
      console.log('Agente SNMP iniciado exitosamente para pruebas');
    } catch (error) {
      console.error('Error al iniciar el agente SNMP:', error.message);
      throw error; // Fallar las pruebas si no se puede iniciar el agente
    }

    // Esperar un momento para que el agente esté completamente listo
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 60000); // Aumentar timeout para beforeAll

  beforeEach(() => {
    if (process.env.SKIP_INTEGRATION_TESTS) {
      return;
    }

    // Creamos una sesión SNMP para cada prueba
    const options = {
      port: snmpPort,
      retries: 3,          // Aumentar retries de 1 a 3
      timeout: 10000,      // Aumentar timeout de 5000 a 10000
      backoff: 1.5,        // Aumentar backoff de 1.0 a 1.5
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

      // Limpiar solicitudes pendientes
      if (sess._reqs) {
        sess._reqs = {};
      }

      // Forzar recolección de basura si está disponible
      if (global.gc) {
        global.gc();
      }
    } catch (err) {
      console.error(`Error closing SNMP session: ${err.message}`);
    }
  };

  afterEach(() => {
    if (process.env.SKIP_INTEGRATION_TESTS) {
      return;
    }

    // Cerramos la sesión después de cada prueba
    if (session) {
      closeSessionSafely(session);
      session = null;
    }
  });

  afterAll(async () => {
    // No detenemos el agente si estamos saltando las pruebas
    if (process.env.SKIP_INTEGRATION_TESTS) {
      return;
    }

    // Cerrar todas las sesiones que pudieran haber quedado abiertas
    console.log(`Cerrando ${allSessions.length} sesiones SNMP`);
    for (const sess of allSessions) {
      if (sess) {
        await new Promise(resolve => {
          try {
            closeSessionSafely(sess);
            resolve();
          } catch (err) {
            console.error('Error al cerrar sesión SNMP:', err.message);
            resolve();
          }
        });
      }
    }

    // Limpiar array de sesiones
    allSessions = [];

    // Asegurarse de que la sesión principal esté cerrada
    if (session) {
      await new Promise(resolve => {
        try {
          closeSessionSafely(session);
          session = null;
          resolve();
        } catch (err) {
          console.error('Error al cerrar sesión SNMP principal:', err.message);
          session = null;
          resolve();
        }
      });
    }

    // Dar tiempo para que se cierren las conexiones
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Detenemos el agente después de todas las pruebas
    if (agentStarted) {
      console.log('Deteniendo agente SNMP después de las pruebas...');
      try {
        await snmpAgent.stop();
        agentStarted = false;
        console.log('Agente SNMP detenido exitosamente');
      } catch (err) {
        console.error(`Error al detener el agente SNMP: ${err.message}`);
        // Intentar asegurar que el agente se marque como detenido
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

    // Dar tiempo final para limpieza
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 60000); // Aumentar timeout para afterAll

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
      // Verificar primero si hay error
      if (error) {
        console.log('Error en prueba de OID desconocido:', error);
        expect(error).toBeNull();
        done();
        return;
      }

      // Ahora podemos verificar varbinds con seguridad
      expect(varbinds).toBeDefined();
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