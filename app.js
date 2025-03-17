require('dotenv').config();
const express = require('express');
const serveIndex = require('serve-index');
const { AttributeIds, OPCUAClient, StatusCodes } = require("node-opcua");
const winston = require('winston');
const path = require('path');

// Configuración desde variables de entorno
const CONFIG = {
  // Configuración OPC UA
  OPC_ENDPOINT: process.env.OPC_ENDPOINT || "opc.tcp://127.0.0.1:4840",
  OPC_SECURITY_MODE: parseInt(process.env.OPC_SECURITY_MODE || "1"),
  OPC_SECURITY_POLICY: process.env.OPC_SECURITY_POLICY || "None",
  OPC_NAMESPACE: parseInt(process.env.OPC_NAMESPACE || "2"),

  // Configuración de conexión
  CONNECTION_RETRY_MAX: parseInt(process.env.CONNECTION_RETRY_MAX || "5"),
  CONNECTION_INITIAL_DELAY: parseInt(process.env.CONNECTION_INITIAL_DELAY || "1000"),
  CONNECTION_MAX_RETRY: parseInt(process.env.CONNECTION_MAX_RETRY || "10"),
  CONNECTION_MAX_DELAY: parseInt(process.env.CONNECTION_MAX_DELAY || "10000"),
  CONNECTION_RETRY_DELAY: parseInt(process.env.CONNECTION_RETRY_DELAY || "5000"),

  // Configuración del servidor
  SERVER_PORT: parseInt(process.env.SERVER_PORT || "3000"),

  // Configuración de logs
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_FILE_ERROR: process.env.LOG_FILE_ERROR || "error.log",
  LOG_FILE_COMBINED: process.env.LOG_FILE_COMBINED || "combined.log",
  LOG_TO_CONSOLE: process.env.LOG_TO_CONSOLE !== "false"
};

// Configuración de Winston para logging
const logTransports = [
  new winston.transports.File({ filename: CONFIG.LOG_FILE_ERROR, level: 'error' }),
  new winston.transports.File({ filename: CONFIG.LOG_FILE_COMBINED })
];

if (CONFIG.LOG_TO_CONSOLE) {
  logTransports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

const logger = winston.createLogger({
  level: CONFIG.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'opc-gateway' },
  transports: logTransports
});

// Creación de la aplicación Express
const app = express();
const PORT = CONFIG.SERVER_PORT;

// Pool de conexiones OPC UA
let clientPool = null;
let sessionPool = null;
let connectionRetries = 0;
const MAX_RETRIES = CONFIG.CONNECTION_RETRY_MAX;
const RETRY_DELAY = CONFIG.CONNECTION_RETRY_DELAY;

// Inicialización del cliente OPC UA
async function initOPCUAClient () {
  if (clientPool) {
    return { client: clientPool, session: sessionPool };
  }

  try {
    logger.info(`Iniciando conexión OPC UA a ${CONFIG.OPC_ENDPOINT}`);
    const client = OPCUAClient.create({
      applicationName: "OPC UA Gateway",
      connectionStrategy: {
        initialDelay: CONFIG.CONNECTION_INITIAL_DELAY,
        maxRetry: CONFIG.CONNECTION_MAX_RETRY,
        maxDelay: CONFIG.CONNECTION_MAX_DELAY
      },
      securityMode: CONFIG.OPC_SECURITY_MODE,
      securityPolicy: CONFIG.OPC_SECURITY_POLICY,
      endpointMustExist: false
    });

    client.on("backoff", (retry, delay) => {
      logger.warn(`Reintentando conexión a ${CONFIG.OPC_ENDPOINT}. Intento ${retry}, retraso ${delay}ms`);
    });

    client.on("connection_lost", () => {
      logger.error("Conexión OPC UA perdida. Reiniciando cliente...");
      clientPool = null;
      sessionPool = null;
    });

    client.on("connection_reestablished", () => {
      logger.info("Conexión OPC UA reestablecida");
    });

    await client.connect(CONFIG.OPC_ENDPOINT);
    logger.info("Conexión OPC UA establecida correctamente");

    const session = await client.createSession();
    logger.info("Sesión OPC UA creada correctamente");

    clientPool = client;
    sessionPool = session;
    connectionRetries = 0;

    return { client, session };
  } catch (err) {
    logger.error(`Error al inicializar el cliente OPC UA: ${err.message}`);
    connectionRetries++;

    if (connectionRetries >= MAX_RETRIES) {
      logger.error(`Número máximo de reintentos alcanzado (${MAX_RETRIES}). Esperando ${RETRY_DELAY / 1000} segundos antes de reintentar.`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      connectionRetries = 0;
    }

    clientPool = null;
    sessionPool = null;
    throw err;
  }
}

// Función para leer valores OPC UA
async function readOPC (atributo) {
  if (!atributo) {
    logger.error("Intento de lectura sin especificar un atributo");
    throw new Error("Atributo no especificado");
  }

  let client = null;
  let session = null;
  let usePooledConnection = true;

  try {
    // Intentar usar la conexión del pool
    try {
      const pooledConnection = await initOPCUAClient();
      client = pooledConnection.client;
      session = pooledConnection.session;
    } catch (error) {
      logger.warn("No se pudo usar la conexión del pool, creando una nueva conexión.");
      usePooledConnection = false;
      client = OPCUAClient.create();
      await client.connect(CONFIG.OPC_ENDPOINT);
      session = await client.createSession();
    }

    const nodeId = `ns=${CONFIG.OPC_NAMESPACE};s=${atributo}`;
    logger.info(`Leyendo valor de ${nodeId}`);

    const readResult = await session.read({ nodeId });
    logger.info(`Lectura de ${nodeId} completada con estado: ${readResult.statusCode.name}`);

    if (!usePooledConnection) {
      await session.close();
      await client.disconnect();
    }

    return readResult;
  } catch (err) {
    logger.error(`Error al leer valor OPC UA (${atributo}): ${err.message}`);

    // Si se estaba usando una conexión no pooled, cerrarla
    if (!usePooledConnection && client && session) {
      try {
        await session.close();
        await client.disconnect();
      } catch (closeErr) {
        logger.error(`Error al cerrar la sesión OPC UA: ${closeErr.message}`);
      }
    }

    // Si hay un error con la conexión pooled, resetearla
    if (usePooledConnection) {
      try {
        if (sessionPool) await sessionPool.close();
        if (clientPool) await clientPool.disconnect();
      } catch (e) {
        logger.error(`Error al cerrar la conexión pooled: ${e.message}`);
      }
      clientPool = null;
      sessionPool = null;
    }

    return false;
  }
}

// Middleware para registro de peticiones
app.use((req, res, next) => {
  const start = Date.now();
  logger.info(`Petición recibida: ${req.method} ${req.originalUrl}`);

  // Capturar cuando la respuesta se envía
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Petición completada: ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error en petición: ${err.message}`);
  res.status(500).send({ error: 'Error interno del servidor' });
});

// Servir archivos estáticos
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/public', serveIndex(path.join(__dirname, 'public')));

// Endpoint para leer valores OPC UA
app.get('/iotgateway/read', async (req, res) => {
  try {
    const ids = req.query.ids;

    if (!ids) {
      logger.warn('Petición de lectura sin ID especificado');
      return res.status(400).send({ error: 'El parámetro ids es requerido' });
    }

    logger.info(`Procesando solicitud de lectura para ID: ${ids}`);

    let opcResponse = await readOPC(ids);
    if (opcResponse === false) {
      logger.warn(`Error al leer valor OPC UA para ID: ${ids}`);
      return res.send({
        "readResults": [
          {
            "id": ids,
            "s": false,
            "r": "Error al leer valor OPC UA",
            "v": null,
            "t": Date.now()
          }
        ]
      });
    }

    const estado = opcResponse.statusCode.name === 'Good';
    const response = {
      "readResults": [
        {
          "id": ids,
          "s": estado,
          "r": opcResponse.statusCode.name,
          "v": opcResponse.value ? opcResponse.value.value : null,
          "t": Date.now()
        }
      ]
    };

    logger.info(`Respuesta enviada para ID ${ids} con estado: ${estado}`);
    res.send(response);
  } catch (error) {
    logger.error(`Error en endpoint /iotgateway/read: ${error.message}`);
    res.status(500).send({
      "readResults": [
        {
          "id": req.query.ids || "desconocido",
          "s": false,
          "r": `Error interno: ${error.message}`,
          "v": null,
          "t": Date.now()
        }
      ]
    });
  }
});

// Endpoint para verificar el estado del servicio
app.get('/health', (req, res) => {
  res.send({
    status: "UP",
    opcClient: clientPool ? "CONNECTED" : "DISCONNECTED",
    opcEndpoint: CONFIG.OPC_ENDPOINT,
    time: Date.now()
  });
});

// Endpoint para ver la configuración actual (para debug, omitir en producción)
if (process.env.NODE_ENV !== 'production') {
  app.get('/config', (req, res) => {
    res.send({
      ...CONFIG,
      // Ocultar información sensible
      OPC_ENDPOINT: CONFIG.OPC_ENDPOINT.replace(/\/\/(.+)@/, '//*****@')
    });
  });
}

// Iniciar servidor
app.listen(PORT, async () => {
  logger.info(`Servidor iniciado en puerto ${PORT}`);
  logger.info(`Conectando a OPC UA endpoint: ${CONFIG.OPC_ENDPOINT}`);

  // Inicializar conexión OPC UA al inicio
  try {
    await initOPCUAClient();
  } catch (err) {
    logger.warn(`No se pudo establecer la conexión OPC UA inicial: ${err.message}`);
  }
});

// Gestión para cierre limpio del servidor
process.on('SIGTERM', async () => {
  logger.info('Señal SIGTERM recibida, cerrando servidor...');
  if (sessionPool) await sessionPool.close();
  if (clientPool) await clientPool.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Señal SIGINT recibida, cerrando servidor...');
  if (sessionPool) await sessionPool.close();
  if (clientPool) await clientPool.disconnect();
  process.exit(0);
});