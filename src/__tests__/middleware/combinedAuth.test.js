jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn()
}));

const express = require('express');
const request = require('supertest');
const CONFIG = require('../../config/config');
const combinedAuth = require('../../middleware/combinedAuth');

const originalAuthConfig = {
  API_KEY: CONFIG.API_KEY,
  AUTH_USERNAME: CONFIG.AUTH_USERNAME,
  AUTH_PASSWORD: CONFIG.AUTH_PASSWORD
};

const basicHeader = (credentials) =>
  `Basic ${Buffer.from(credentials).toString('base64')}`;

const createProtectedApp = (handler) => {
  const app = express();
  app.use(combinedAuth);
  app.get('/protected', handler);
  return app;
};

describe('combinedAuth', () => {
  beforeEach(() => {
    CONFIG.API_KEY = undefined;
    CONFIG.AUTH_USERNAME = 'admin';
    CONFIG.AUTH_PASSWORD = undefined;
  });

  afterAll(() => {
    Object.assign(CONFIG, originalAuthConfig);
  });

  it('rejects a colonless Basic credential when AUTH_PASSWORD is unset', async () => {
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = createProtectedApp(handler);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', basicHeader('admin'));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects a missing credential when no authentication method is configured', async () => {
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = createProtectedApp(handler);

    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', 'Basic '],
    ['malformed', 'Basic !!!not-base64!!!']
  ])('rejects an %s Basic credential when AUTH_PASSWORD is unset', async (name, header) => {
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = createProtectedApp(handler);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', header);

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects an empty Basic password when API key auth is configured', async () => {
    CONFIG.API_KEY = 'configured-api-key';
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = createProtectedApp(handler);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', basicHeader('admin:'));

    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('accepts a configured API key', async () => {
    CONFIG.API_KEY = 'configured-api-key';
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = createProtectedApp(handler);

    const response = await request(app)
      .get('/protected')
      .set('X-API-Key', CONFIG.API_KEY);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('accepts configured Basic credentials and preserves colons in the password', async () => {
    CONFIG.AUTH_PASSWORD = 'secure:password';
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = createProtectedApp(handler);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', basicHeader('admin:secure:password'));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fails startup validation when no complete authentication method exists', () => {
    expect(() => combinedAuth.assertAuthenticationConfigured()).toThrow(
      'Authentication is not configured'
    );
  });

  it.each([
    ['API key', { API_KEY: 'configured-api-key' }],
    ['Basic', { AUTH_PASSWORD: 'configured-password' }]
  ])('passes startup validation with configured %s authentication', (name, config) => {
    Object.assign(CONFIG, config);

    expect(() => combinedAuth.assertAuthenticationConfigured()).not.toThrow();
  });
});
