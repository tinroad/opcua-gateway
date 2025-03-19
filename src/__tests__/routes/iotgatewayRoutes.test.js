const request = require('supertest');
const express = require('express');
const router = require('../../routes/iotgatewayRoutes');
const opcuaService = require('../../services/opcuaService');

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
    it('must write values correctly', async () => {
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

    it('must validate the input format', async () => {
      const response = await request(app)
        .post('/iotgateway/write')
        .send({ invalid: 'format' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
    });

    it('must handle write errors', async () => {
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

    it('must return an error if the id or value is missing', async () => {
      const invalidWriteData = [
        { value: 42 },
        { id: 'ns=2;s=test' }
      ];

      for (const data of invalidWriteData) {
        const response = await request(app)
          .post('/iotgateway/write')
          .send([data])
          .set('X-API-Key', 'test-api-key');

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Each element must have 'id' and 'value'");
      }
    });

    it('must return an error if the array is empty', async () => {
      const response = await request(app)
        .post('/iotgateway/write')
        .send([])
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("The request body must be an array of values to write");
    });
  });

  describe('GET /read', () => {
    it('must read values correctly', async () => {
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

    it('must handle read errors', async () => {
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

    it('must validate the input format', async () => {
      const response = await request(app)
        .get('/iotgateway/read')
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID is required');
    });

    it('must handle unexpected errors in readOPC', async () => {
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

    it('must handle an invalid ID', async () => {

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
        .query({ ids: 'invalid_id' })
        .set('X-API-Key', 'test-api-key');

      expect(response.status).toBe(200);
      expect(response.body.readResults).toHaveLength(1);
      expect(response.body.readResults[0].s).toBe(false);
      expect(response.body.readResults[0].r).toBe('The operation failed.');
    });
  });
}); 