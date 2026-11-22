'use strict';

const { createApp } = require('../../src/app');

let server;
let baseUrl;

// Две заявки с одинаковым приоритетом high и разной датой создания
const seed = [
  { id: 1, title: 'Старая заявка', description: 'Описание старой заявки', category: 'network',
    priority: 'high', status: 'new', createdAt: '2026-10-01T09:00:00.000Z' },
  { id: 2, title: 'Новая заявка', description: 'Описание новой заявки', category: 'network',
    priority: 'high', status: 'new', createdAt: '2026-10-05T09:00:00.000Z' }
];

beforeAll(async () => {
  server = createApp({ seed });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

describe('порядок заявок', () => {
  test('I-07: при одинаковом приоритете более новая заявка выше', async () => {
    const res = await fetch(`${baseUrl}/api/tickets?priority=high`);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.items.map((t) => t.id)).toEqual([2, 1]);
  });
});