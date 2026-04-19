const request = require('supertest');
const app = require('../app');

describe('App Routes', () => {
  test('GET / returns 200 with message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('DevOps Pipeline App is live!');
  });

  test('GET /health returns healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});