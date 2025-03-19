jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../config/config', () => ({
  OPC_ENDPOINT: 'mocked_endpoint',
  CONNECTION_RETRY_MAX: 3,
  CONNECTION_RETRY_DELAY: 1000
}));

// Importamos el servicio después de configurar los mocks
const logger = require('../../utils/logger');
const CONFIG = require('../../config/config');
const { mockSession, mockClient } = require('../../__mocks__/node-opcua');
const opcuaService = require('../../services/opcuaService');

describe('OPCUAService', () => {
  beforeEach(() => {
    // Reiniciar los mocks
    jest.clearAllMocks();

    // Restablecer el comportamiento predeterminado de los mocks para cada prueba
    mockSession.read.mockClear();
    mockSession.write.mockClear();
    mockSession.close.mockClear();

    mockClient.connect.mockClear();
    mockClient.disconnect.mockClear();
    mockClient.createSession.mockClear();
    mockClient.on.mockClear();

    // Reiniciar el estado del servicio antes de cada prueba
    opcuaService.clientPool = null;
    opcuaService.sessionPool = null;
    opcuaService.connectionRetries = 0;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initOPCUAClient', () => {
    it('Must initialize the OPC UA client correctly', async () => {
      // Modificar el comportamiento del mock para esta prueba específica
      mockClient.connect.mockResolvedValueOnce();

      await opcuaService.initOPCUAClient();

      expect(opcuaService.clientPool).toBeTruthy();
      expect(opcuaService.sessionPool).toBeTruthy();
    });

    it('must try to reconnect if the initial connection fails', async () => {
      // Asegúrate de que el contador de reintentos empiece en 0
      opcuaService.connectionRetries = 0;

      // Mockea el método closeConnections para que no cause efectos secundarios
      jest.spyOn(opcuaService, 'closeConnections').mockResolvedValue();

      // Configura el mock para rechazar la llamada a connect
      mockClient.connect.mockRejectedValueOnce(new Error('Connection error'));

      // La primera llamada debe fallar
      await expect(opcuaService.initOPCUAClient()).rejects.toThrow('Connection error');

      // Verifica que el contador de reintentos se incrementó
      expect(opcuaService.connectionRetries).toBe(1);

      // Ahora, configura el mock para que la segunda llamada también falle
      mockClient.connect.mockRejectedValueOnce(new Error('Connection error'));

      // La segunda llamada también debe fallar
      await expect(opcuaService.initOPCUAClient()).rejects.toThrow('Connection error');

      // Verifica que el contador de reintentos se incrementó de nuevo
      expect(opcuaService.connectionRetries).toBe(2);

      // Verifica que clientPool y sessionPool son null después de un error
      expect(opcuaService.clientPool).toBeNull();
      expect(opcuaService.sessionPool).toBeNull();
    });

    it('must register a success message when the connection is established', async () => {
      // Modificar el comportamiento del mock para esta prueba específica
      mockClient.connect.mockResolvedValueOnce();

      await opcuaService.initOPCUAClient();

      expect(logger.info).toHaveBeenCalledWith("OPC UA connection established successfully");
    });

    it('must register an information message when initializing the connection', async () => {
      // Modificar el comportamiento del mock para esta prueba específica
      mockClient.connect.mockResolvedValueOnce();

      await opcuaService.initOPCUAClient();

      expect(logger.info).toHaveBeenCalledWith(`Initializing OPC UA connection to ${CONFIG.OPC_ENDPOINT}`);
    });
  });

  describe('writeValues', () => {
    beforeEach(() => {
      opcuaService.clientPool = mockClient;
      opcuaService.sessionPool = mockSession;
    });

    it('Must write values correctly', async () => {

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

    it('must return an error if the value is not a number', async () => {

      const writeData = [{
        id: 'ns=2;s=test',
        value: 'invalid_value',
        dataType: 'UInt16'
      }];

      mockSession.write.mockRejectedValueOnce(new Error('expecting a number NaN'));

      const results = await opcuaService.writeValues(writeData);

      expect(results).toHaveLength(1);
      expect(results[0].s).toBe(false);
      expect(results[0].r).toBe('Error: expecting a number NaN');
    });


    it('Must fail when the data type is not correct', async () => {

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

    it('must handle errors when writing values', async () => {
      const writeData = [{
        id: 'ns=2;s=test1',
        value: 42,
        dataType: 'UInt16'
      }];

      mockSession.write.mockRejectedValueOnce(new Error('Error de escritura'));

      const results = await opcuaService.writeValues(writeData);

      expect(results).toHaveLength(1);
      expect(results[0].s).toBe(false);
      expect(results[0].r).toBe('Error: Error de escritura');
    });

    it('must register a warning if the writing is not successful', async () => {
      const writeData = [{
        id: 'ns=2;s=test1',
        value: 42,
        dataType: 'UInt16'
      }];

      const mockWriteResult = {
        value: 100,
        description: 'Error al escribir',
        name: 'Bad'
      };
      mockSession.write.mockResolvedValueOnce(mockWriteResult);
      jest.spyOn(logger, 'warn').mockImplementation(() => { });

      await opcuaService.writeValues(writeData);

      expect(logger.warn).toHaveBeenCalledWith(`Error writing in ${writeData[0].id}: ${mockWriteResult.description}`);
    });

    it('must handle correctly the writing results', async () => {
      const writeData = [{
        id: 'ns=2;s=test1',
        value: 42,
        dataType: 'UInt16'
      }];

      const mockWriteResultGood = {
        value: 42,
        description: 'The operation succeeded.',
        name: 'Good'
      };
      mockSession.write.mockResolvedValueOnce(mockWriteResultGood);

      const results = await opcuaService.writeValues(writeData);

      expect(results[0].s).toBe(true);
      expect(results[0].r).toBe('Good');
      expect(results[0].v).toBe(42);
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

    it('must return an error if the attribute is not specified', async () => {
      // Use the test function that checks exceptions
      await expect(opcuaService.readOPC()).rejects.toThrow('Attribute not specified');

      // Verify that no session or client methods are called
      expect(mockSession.read).not.toHaveBeenCalled();
    });

    it('must handle correctly the use of connections in readOPC', async () => {
      const mockReadResult = {
        value: { dataType: 7, arrayType: 0, value: 89, dimensions: null },
        statusCode: {
          value: 0,
          description: 'The operation succeeded.',
          name: 'Good'
        },
      };
      mockSession.read.mockResolvedValueOnce(mockReadResult);
      jest.spyOn(opcuaService, 'initOPCUAClient').mockClear(); // Clean previous calls
      jest.spyOn(opcuaService, 'initOPCUAClient').mockResolvedValue({ client: mockClient, session: mockSession });

      await opcuaService.readOPC('test1');

      expect(opcuaService.initOPCUAClient).toHaveBeenCalled();
    });
  });

  describe('convertValue', () => {
    it('must convert values correctly according to the data type', () => {
      expect(opcuaService.convertValue(42, 'UInt16')).toBe(42);
      expect(opcuaService.convertValue(3.14, 'Float')).toBe(3.14);
      expect(opcuaService.convertValue('true', 'Boolean')).toBe(true);
      expect(opcuaService.convertValue('test', 'String')).toBe('test');
      expect(opcuaService.convertValue(true, 'Boolean')).toBe(true);
      expect(opcuaService.convertValue(false, 'Boolean')).toBe(false);
      expect(opcuaService.convertValue(123, 'Int32')).toBe(123);
      expect(opcuaService.convertValue(-456, 'Int32')).toBe(-456);
      expect(opcuaService.convertValue(123.45, 'Double')).toBe(123.45);
      expect(opcuaService.convertValue(-789.123, 'Double')).toBe(-789.123);

    });

    it('must handle the case of invalid data types in convertValue', () => {
      expect(opcuaService.convertValue(42, 'InvalidType')).toBe(42); // Should return the value without converting
    });

    it('must handle non-convertible values in convertValue', () => {
      expect(opcuaService.convertValue('abc', 'Int32')).toBeNaN(); // 'abc' is not convertible to Int32
    });

    it('must handle invalid values without errors in convertValue', () => {
      expect(opcuaService.convertValue(null, 'String')).toBe('null'); // null is an invalid value but should handle it without error
      expect(opcuaService.convertValue(undefined, 'Boolean')).toBe(false); // undefined is an invalid value but should handle it without error
    });
  });

  describe('detectDataType', () => {
    it('must detect data types correctly for different inputs', () => {
      expect(opcuaService.detectDataType(true)).toBe('Boolean');
      expect(opcuaService.detectDataType(123)).toBe('Int32');
      expect(opcuaService.detectDataType(3.14)).toBe('Double');
      expect(opcuaService.detectDataType('test')).toBe('String');
      expect(opcuaService.detectDataType(null)).toBe('Variant'); // or the default data type that handles
      expect(opcuaService.detectDataType(undefined)).toBe('Variant'); // or the default data type that handles
    });
  });
});
