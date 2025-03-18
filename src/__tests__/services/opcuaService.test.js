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
    it('Must initialize the OPC UA client correctly', async () => {
      await opcuaService.initOPCUAClient();

      expect(opcuaService.clientPool).toBeTruthy();
      expect(opcuaService.sessionPool).toBeTruthy();
    });
  });

  // El resto del código de prueba sin cambios...
  describe('writeValues', () => {
    it('Must write values correctly', async () => {
      opcuaService.sessionPool = mockSession;

      const writeData = [{
        id: 'ns=2;s=test1',
        value: 42,
        dataType: 'UInt16'
      }];

      const mockWriteResult = {
        value: 42,
        description: 'The operation succeeded.',
        name: 'Good'
      };

      mockSession.write.mockResolvedValueOnce(mockWriteResult);

      const results = await opcuaService.writeValues(writeData);

      expect(results).toHaveLength(1);
      expect(results[0].s).toBe(true);
      expect(results[0].r).toBe('Good');
      expect(results[0].v).toBe(42);
    });


    it('Must fail when the data type is not correct', async () => {
      opcuaService.sessionPool = mockSession;

      const writeData = [{
        id: 'ns=2;s=test1',
        value: 42,
        dataType: 'Int16'
      }];

      const mockWriteResult = {
        value: 2155085824,
        description: "The value supplied for the attribute is not of the same type as the attribute's value.",
        name: 'BadTypeMismatch'
      };

      mockSession.write.mockResolvedValueOnce(mockWriteResult);

      const results = await opcuaService.writeValues(writeData);

      expect(results).toHaveLength(1);
      expect(results[0].s).toBe(false);
      expect(results[0].r).toBe("Error: The value supplied for the attribute is not of the same type as the attribute's value.");
      expect(results[0].v).toBe(2155085824);
    });
  });

  describe('readOPC', () => {
    beforeEach(() => {
      opcuaService.clientPool = mockClient;
      opcuaService.sessionPool = mockSession;
    });

    it('Must read values correctly', async () => {
      const mockReadResult = {
        value: { dataType: 7, arrayType: 0, value: 89, dimensions: null },
        statusCode: {
          value: 0,
          description: 'The operation succeeded.',
          name: 'Good'
        },
      };

      mockSession.read.mockResolvedValueOnce(mockReadResult);

      const result = await opcuaService.readOPC('test1');

      expect(result).toEqual(mockReadResult);
    });

    it('Must fail when the attribute is not correct', async () => {
      const mockReadResult = {
        statusCode: {
          value: 2147483648,
          description: 'The operation failed.',
          name: 'Bad'
        },
      };

      mockSession.read.mockResolvedValueOnce(mockReadResult);

      const result = await opcuaService.readOPC('test1');

      expect(result.statusCode.name).toBe("Bad");
      expect(result.statusCode.description).toBe("The operation failed.");
    });

    it('Must handle read errors', async () => {
      mockSession.read.mockRejectedValueOnce(new Error('Read failed'));

      const result = await opcuaService.readOPC('test1');

      expect(result).toBe(false);
    });
  });
});