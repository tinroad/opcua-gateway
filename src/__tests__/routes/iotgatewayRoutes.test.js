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
  });
}); 