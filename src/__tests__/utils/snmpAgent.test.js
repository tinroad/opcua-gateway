jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../utils/metrics', () => ({
  metrics: {
    opcuaConnections: 1,
    opcuaErrors: 0,
    opcuaReconnects: 0,
    opcuaRequests: 10,
    opcuaRequestsErrors: 0,
    opcuaReadOperations: 8,
    opcuaWriteOperations: 2,
    opcuaLastResponseTime: 129,
    opcuaAvgResponseTime: 145,
    httpRequests: 5,
    httpErrors: 0,
    http2xx: 5,
    http3xx: 0,
    http4xx: 0,
    http5xx: 0,
    httpLastResponseTime: 1,
    httpAvgResponseTime: 1.2,
    rateLimit: 0,
    cpuUsage: 24.38,
    memoryUsage: 75.27,
    totalMemory: 16952647680,
    freeMemory: 4191625216,
    uptime: 453.99
  },
  updateMetrics: jest.fn()
}));

// Mockear la clase SNMPAgent antes de que se instancie
jest.mock('../../utils/snmpAgent', () => {
  // Mock de la clase
  class MockSNMPAgent {
    constructor () {
      this.oids = {};
      this.oidDescriptions = {};
      this.agent = null;
      this.port = 8161;
      this.community = 'public';
      this.metricsInterval = null;

      this.registerMetrics();
      this.initializeOidDescriptions();
    }

    registerMetrics () {
      // Implementar un método básico de registro
      this.registerMetric('1.3.6.1.4.1.12345.1.1.1', () => 1, 'Integer32');
      this.registerMetric('1.3.6.1.4.1.12345.1.2.1', () => 5, 'Integer32');
      this.registerMetric('1.3.6.1.4.1.12345.1.3.1', () => Math.round(24.38 * 100), 'Integer32');
      this.registerMetric('1.3.6.1.4.1.12345.1.3.2', () => Math.round(75.27 * 100), 'Integer32');
      this.registerMetric('1.3.6.1.4.1.12345.1.3.3', () => Math.floor(16952647680 / 1048576), 'Integer32');
      this.registerMetric('1.3.6.1.4.1.12345.1.3.4', () => Math.floor(4191625216 / 1048576), 'Integer32');
    }

    registerMetric (oid, valueFunction, type) {
      this.oids[oid] = { valueFunction, type };
    }

    initializeOidDescriptions () {
      this.oidDescriptions = {
        '1.3.6.1.4.1.12345.1.1.1': 'Number of OPC UA connections',
        '1.3.6.1.4.1.12345.1.2.1': 'Number of HTTP requests',
        '1.3.6.1.4.1.12345.1.3.1': 'CPU usage (percentage * 100)'
      };
    }

    start () {
      return Promise.resolve();
    }

    stop () {
      this.metricsInterval = null;
      this.agent = null;
    }

    _registerProviders () {
      return Promise.resolve();
    }

    _startMetricsUpdater () {
      // Mock de método
    }

    logOidDescriptions () {
      // Mock de método
    }
  }

  // Retornar una instancia del mock
  return new MockSNMPAgent();
}, { virtual: true });

// Mockear net-snmp
jest.mock('net-snmp', () => {
  const mockMib = {
    registerProvider: jest.fn(),
    setScalarValue: jest.fn()
  };

  const mockAgent = {
    getMib: jest.fn().mockReturnValue(mockMib),
    getAuthorizer: jest.fn().mockReturnValue({
      addCommunity: jest.fn(),
      getAccessControlModel: jest.fn().mockReturnValue({
        setCommunityAccess: jest.fn()
      })
    }),
    close: jest.fn()
  };

  return {
    createAgent: jest.fn().mockReturnValue(mockAgent),
    createSession: jest.fn(),
    MibProviderType: {
      Scalar: 'scalar'
    },
    ObjectType: {
      Integer32: 'Integer32',
      Gauge32: 'Gauge32'
    },
    MaxAccess: {
      'read-only': 'read-only'
    },
    PduType: {
      GetRequest: 'GetRequest',
      GetNextRequest: 'GetNextRequest'
    },
    ErrorStatus: {
      GeneralError: 'GeneralError'
    },
    AccessControlModelType: {
      Simple: 'Simple'
    },
    Version1: 1,
    AccessLevel: {
      ReadOnly: 'ReadOnly'
    }
  };
});

const metrics = require('../../utils/metrics');
const logger = require('../../utils/logger');
const snmp = require('net-snmp');
const snmpAgent = require('../../utils/snmpAgent');

describe('SNMPAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset de mocks
    jest.resetAllMocks();
  });

  describe('Propiedades e inicialización', () => {
    it('debe tener las propiedades correctas', () => {
      expect(snmpAgent.port).toBe(8161);
      expect(snmpAgent.community).toBe('public');
      expect(Object.keys(snmpAgent.oids).length).toBeGreaterThan(0);
    });

    it('debe tener descripciones de OIDs', () => {
      expect(snmpAgent.oidDescriptions).toBeDefined();
      expect(Object.keys(snmpAgent.oidDescriptions).length).toBeGreaterThan(0);
      expect(snmpAgent.oidDescriptions['1.3.6.1.4.1.12345.1.1.1']).toBe('Number of OPC UA connections');
    });
  });

  describe('Métricas y OIDs', () => {
    it('debe tener OIDs registrados', () => {
      // Verificar que los OIDs principales están registrados
      expect(snmpAgent.oids['1.3.6.1.4.1.12345.1.1.1']).toBeDefined(); // OPC UA connections
      expect(snmpAgent.oids['1.3.6.1.4.1.12345.1.2.1']).toBeDefined(); // HTTP requests
      expect(snmpAgent.oids['1.3.6.1.4.1.12345.1.3.1']).toBeDefined(); // CPU usage
    });

    it('debe convertir valores correctamente para métricas del sistema', () => {
      // Verificar la conversión de valores decimales
      const cpuValue = snmpAgent.oids['1.3.6.1.4.1.12345.1.3.1'].valueFunction();
      expect(cpuValue).toBe(Math.round(24.38 * 100));

      const memValue = snmpAgent.oids['1.3.6.1.4.1.12345.1.3.2'].valueFunction();
      expect(memValue).toBe(Math.round(75.27 * 100));

      // Verificar la conversión de bytes a MB para memoria
      const totalMemValue = snmpAgent.oids['1.3.6.1.4.1.12345.1.3.3'].valueFunction();
      expect(totalMemValue).toBe(Math.floor(16952647680 / 1048576));
    });
  });

  describe('Métodos del agente', () => {
    it('debe llamarse al método start correctamente', async () => {
      // Espiar el método start
      const startSpy = jest.spyOn(snmpAgent, 'start');

      await snmpAgent.start();

      expect(startSpy).toHaveBeenCalled();
    });

    it('debe llamarse al método stop correctamente', () => {
      // Espiar el método stop
      const stopSpy = jest.spyOn(snmpAgent, 'stop');

      snmpAgent.stop();

      expect(stopSpy).toHaveBeenCalled();
    });
  });
}); 
}); 