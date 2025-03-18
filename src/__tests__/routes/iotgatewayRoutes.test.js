const request = require('supertest');
const express = require('express');
const router = require('../../routes/iotgatewayRoutes');
const opcuaService = require('../../services/opcuaService');

// Mock del servicio OPC UA
jest.mock('../../services/opcuaService', () => ({
  writeValues: jest.fn(),
  readOPC: jest.fn()
}));

describe('IOT Gateway Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/iotgateway', router);
  });

  describe('POST /write', () => {
    it('debería escribir valores correctamente', async () => {
      const writeData = [{
        id: 'ns=2;s=test',
        value: 42,
        dataType: 'UInt16'
      }];

      opcuaService.writeValues.mockResolvedValueOnce([{
        id: 'ns=2;s=test',
        s: true,
        r: 'Good',
        t: Date.now()
      }]);

      const response = await request(app)
        .post('/iotgateway/write')
        .send(writeData)
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.writeResults).toHaveLength(1);
      expect(response.body.writeResults[0].s).toBe(true);
    });

    it('debería validar el formato de entrada', async () => {
      const response = await request(app)
        .post('/iotgateway/write')
        .send({ invalid: 'format' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
    });

    it('debería manejar errores de escritura', async () => {
      const writeData = [{
        id: 'ns=2;s=test',
        value: 42,
        dataType: 'UInt16'
      }];

      opcuaService.writeValues.mockRejectedValueOnce(new Error('Write failed'));

      const response = await request(app)
        .post('/iotgateway/write')
        .send(writeData)
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error processing write operation');
    });

    // Nueva prueba para validar la estructura de cada elemento
    it('debería devolver un error si falta el id o el value', async () => {
      const invalidWriteData = [
        { value: 42 }, // Falta el id
        { id: 'ns=2;s=test' } // Falta el value
      ];

      for (const data of invalidWriteData) {
        const response = await request(app)
          .post('/iotgateway/write')
          .send([data]) // Enviar un solo elemento inválido
          .set('X-API-Key', 'test-api-key');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Each element must have 'id' and 'value'");
      }
    });

    it('debería devolver un error si falta el id o el value', async () => {
      const invalidWriteData = [
        { value: 42 }, // Falta el id
        { id: 'ns=2;s=test' } // Falta el value
      ];

      for (const data of invalidWriteData) {
        const response = await request(app)
          .post('/iotgateway/write')
          .send([data]) // Enviar un solo elemento inválido
          .set('X-API-Key', 'test-api-key');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Each element must have 'id' and 'value'");
      }
    });

    it('debería devolver un error si el array está vacío', async () => {
      const response = await request(app)
        .post('/iotgateway/write')
        .send([]) // Enviar un array vacío
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("The request body must be an array of values to write");
    });
  });

  describe('GET /read', () => {
    it('debería leer valores correctamente', async () => {
      const mockReadResult = {
        statusCode: { name: 'Good' },
        value: { value: 42 }
      };

      opcuaService.readOPC.mockResolvedValueOnce(mockReadResult);

      const response = await request(app)
        .get('/iotgateway/read')
        .query({ ids: 'ns=2;s=test' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.readResults).toHaveLength(1);
      expect(response.body.readResults[0].s).toBe(true);
      expect(response.body.readResults[0].v).toBe(42);
    });

    it('debería manejar errores de lectura', async () => {
      opcuaService.readOPC.mockResolvedValueOnce(false);

      const response = await request(app)
        .get('/iotgateway/read')
        .query({ ids: 'ns=2;s=test' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.readResults).toHaveLength(1);
      expect(response.body.readResults[0].s).toBe(false);
      expect(response.body.readResults[0].r).toBe('Error reading OPC UA value');
    });

    it('debería validar el formato de entrada', async () => {
      const response = await request(app)
        .get('/iotgateway/read')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID is required');
    });

    it('debería manejar errores inesperados en readOPC', async () => {
      opcuaService.readOPC.mockRejectedValueOnce(new Error('Unexpected error'));

      const response = await request(app)
        .get('/iotgateway/read')
        .query({ ids: 'ns=2;s=test' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(500);
      expect(response.body.readResults).toHaveLength(1);
      expect(response.body.readResults[0].s).toBe(false);
      expect(response.body.readResults[0].r).toBe('Internal error: Unexpected error');
    });

    it('debería manejar un ID no válido', async () => {

      const mockReadResult = {
        value: { dataType: 7, arrayType: 0, value: 89, dimensions: null },
        statusCode: {
          value: 2147483648,
          description: 'The operation failed.',
          name: 'Bad'
        },
      };

      opcuaService.readOPC.mockResolvedValueOnce(mockReadResult);

      const response = await request(app)
        .get('/iotgateway/read')
        .query({ ids: 'invalid_id' }) // Probar con un ID no válido
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.readResults).toHaveLength(1);
      expect(response.body.readResults[0].s).toBe(false);
      expect(response.body.readResults[0].r).toBe('The operation failed.');
    });
  });
}); 