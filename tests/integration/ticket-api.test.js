'use strict';

// Интеграционные тесты: HTTP-запрос → src/app.js → src/store.js → ответ.
// Перед каждым тестом поднимается новый сервер с исходными данными,
// поэтому тесты не влияют друг на друга.

const { createApp } = require('../../src/app');

const VALID_TICKET = {
  title: '  Сбой VPN в корпусе  ',
  description: 'Не удается подключиться к учебной сети',
  category: 'network',
  priority: 'high'
};

let server;
let baseUrl;

beforeEach(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

// Отправляет запрос и возвращает статус и JSON-тело ответа
async function call(method, path, body) {
  const res = await fetch(baseUrl + path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, json: await res.json() };
}

describe('API заявок', () => {
  test('I-01: заявка сохраняется, тема нормализуется, статус new', async () => {
    // Act
    const created = await call('POST', '/api/tickets', VALID_TICKET);

    // Assert: ответ
    expect(created.status).toBe(201);
    expect(created.json.ticket.title).toBe('Сбой VPN в корпусе');
    expect(created.json.ticket.status).toBe('new');

    // Assert: состояние хранилища (заявка есть в реестре)
    const list = await call('GET', '/api/tickets');
    const found = list.json.items.find((t) => t.id === created.json.ticket.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('Сбой VPN в корпусе');
  });

  test('I-02: ошибка валидации возвращает 400 и не добавляет заявку', async () => {
    const before = await call('GET', '/api/tickets');

    const bad = await call('POST', '/api/tickets', { ...VALID_TICKET, title: 'VPN' });
    const after = await call('GET', '/api/tickets');

    expect(bad.status).toBe(400);
    expect(bad.json.errors.title).toBeDefined();
    expect(after.json.total).toBe(before.json.total);
  });

  test('I-03: неизвестный статус в PATCH возвращает 400', async () => {
    const res = await call('PATCH', '/api/tickets/1/status', { status: 'closed' });
    expect(res.status).toBe(400);
  });

  test('I-04: PATCH несуществующей заявки возвращает 404', async () => {
    const res = await call('PATCH', '/api/tickets/999/status', { status: 'in_progress' });
    expect(res.status).toBe(404);
  });

  test('I-05: переход new → resolved возвращает 409 и статус не меняется', async () => {
    const created = await call('POST', '/api/tickets', VALID_TICKET);
    const id = created.json.ticket.id;

    const res = await call('PATCH', `/api/tickets/${id}/status`, { status: 'resolved' });
    expect(res.status).toBe(409);

    const list = await call('GET', '/api/tickets');
    expect(list.json.items.find((t) => t.id === id).status).toBe('new');
  });

  test('I-06: search + status + category работают как AND', async () => {
    // В исходных данных подходит только заявка с id 1 («VPN недоступен»)
    const res = await call('GET', '/api/tickets?search=vpn&status=new&category=network');

    expect(res.status).toBe(200);
    expect(res.json.items.map((t) => t.id)).toEqual([1]);
    expect(res.json.total).toBe(1);
  });
    test('I-08: фильтр priority=high возвращает только high, более новые выше', async () => {
    // В исходных данных high: заявка 1 (2026-10-01) и заявка 4 (2026-10-04)
    const res = await call('GET', '/api/tickets?priority=high');

    expect(res.status).toBe(200);
    expect(res.json.items.every((t) => t.priority === 'high')).toBe(true);
    expect(res.json.total).toBe(2);
    expect(res.json.items.map((t) => t.id)).toEqual([4, 1]);
  });
});