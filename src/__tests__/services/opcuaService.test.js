// opcuaService.test.js
// Mockear el logger antes de cualquier otra cosa
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Definir mockSession y mockClient
const mockSession = {
  read: jest.fn(),
  write: jest.fn(),
  close: jest.fn()
};

const mockClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  createSession: jest.fn().mockResolvedValue(mockSession),
  on: jest.fn()
};

// Usar doMock en lugar de mock
jest.doMock('node-opcua', () => {
  return {
    OPCUAClient: {
      create: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(),
        disconnect: jest.fn(),
        createSession: jest.fn().mockResolvedValue(mockSession),
        on: jest.fn()
      })
    },
    DataType: {
      Boolean: 'Boolean',
      Int16: 'Int16',
      UInt16: 'UInt16',
      Int32: 'Int32',
      UInt32: 'UInt32',
      Float: 'Float',
      Double: 'Double',
      String: 'String'
    },
    AttributeIds: {
      Value: 13
    }
  };
});

// Importar después de configurar los mocks
const opcuaService = require('../../services/opcuaService');

describe('OPCUAService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear el estado del servicio
    opcuaService.clientPool = null;
    opcuaService.sessionPool = null;
  });

  describe('initOPCUAClient', () => {
    it('debería inicializar correctamente el cliente OPC UA', async () => {
      await opcuaService.initOPCUAClient();

      expect(opcuaService.clientPool).toBeTruthy();
      expect(opcuaService.sessionPool).toBeTruthy();
    });
  });

  // El resto del código de prueba sin cambios...
  describe('writeValues', () => {
    it('debería escribir valores correctamente', async () => {
      opcuaService.sessionPool = mockSession;

      const writeData = [{
        id: 'ns=2;s=test1',
        value: 42,
        dataType: 'UInt16'
      }];

      mockSession.write.mockResolvedValueOnce([{ s: true, r: 'Good' }]);

      const results = await opcuaService.writeValues(writeData);

      expect(results).toHaveLength(1);
      expect(results[0].s).toBe(true);
      expect(results[0].r).toBe('Good');
    });
  });

  describe('readOPC', () => {
    beforeEach(() => {
      opcuaService.clientPool = mockClient;
      opcuaService.sessionPool = mockSession;
    });

    it('debería leer valores correctamente', async () => {
      const mockReadResult = {
        statusCode: { name: 'Good' },
        value: { value: 42 }
      };

      mockSession.read.mockResolvedValueOnce(mockReadResult);

      const result = await opcuaService.readOPC('test1');

      expect(result).toEqual(mockReadResult);
      expect(mockSession.read).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: 'ns=2;s=test1'
        })
      );
    });

    it('debería manejar errores de lectura', async () => {
      mockSession.read.mockRejectedValueOnce(new Error('Read failed'));

      const result = await opcuaService.readOPC('test1');

      expect(result).toBe(false);
    });
  });

  describe('detectDataType', () => {
    it('debería detectar tipos correctamente', () => {
      expect(opcuaService.detectDataType(true)).toBe('Boolean');
      expect(opcuaService.detectDataType(42)).toBe('Int32');
      expect(opcuaService.detectDataType(3.14)).toBe('Double');
      expect(opcuaService.detectDataType('test')).toBe('String');
    });
  });
});