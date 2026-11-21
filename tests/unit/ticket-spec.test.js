'use strict';

const {
  normalizeTitle,
  validateTicketInput,
  canChangeStatus,
  filterAndSort
} = require('../../src/core');

// Корректная заявка. Тесты меняют только одно поле.
function makeInput(overrides) {
  return {
    title: 'Сбой VPN в корпусе',
    description: 'Не удается подключиться к учебной сети',
    category: 'network',
    priority: 'high',
    ...overrides
  };
}

// Тестовая заявка для фильтрации и сортировки.
function ticket(overrides) {
  return {
    id: 1,
    title: 'Тестовая заявка',
    description: 'Описание заявки для теста',
    category: 'network',
    priority: 'low',
    status: 'new',
    createdAt: '2026-01-01T10:00:00.000Z',
    ...overrides
  };
}

// U-01: нормализация темы (ТЗ: пробелы по краям убираются, любая серия пробельных символов → один пробел)
describe('U-01: нормализация темы', () => {
  test('убирает пробелы по краям', () => {
    expect(normalizeTitle('  Сбой принтера  ')).toBe('Сбой принтера');
  });

  test('заменяет несколько пробелов между словами одним', () => {
    expect(normalizeTitle('Сбой    принтера')).toBe('Сбой принтера');
  });

  test('заменяет табуляции и переносы строк одним пробелом', () => {
    expect(normalizeTitle('Сбой\tVPN\nв корпусе')).toBe('Сбой VPN в корпусе');
  });
});

// U-02: границы длины темы 5–80 символов.
// Значения 4 и 81 — сразу за границей, 5 и 80 — сама граница.
describe('U-02: граница длины темы (5–80)', () => {
  test.each([
    [4, true],   // ниже минимума: ошибка
    [5, false],  // минимум: допустимо
    [80, false], // максимум: допустимо
    [81, true]   // выше максимума: ошибка
  ])('тема из %i символов → ошибка: %s', (length, hasError) => {
    const errors = validateTicketInput(makeInput({ title: 'a'.repeat(length) }));
    expect(Boolean(errors.title)).toBe(hasError);
  });
});

// U-03: границы описания 10–500 символов после удаления пробелов по краям.
describe('U-03: граница длины описания (10–500)', () => {
  test.each([
    ['   123456789   ', true],   // 9 символов после trim
    ['1234567890', false],      // 10 символов
    ['a'.repeat(500), false],   // 500 символов
    ['a'.repeat(501), true]     // 501 символ
  ])('описание %j → ошибка: %s', (description, hasError) => {
    const errors = validateTicketInput(makeInput({ description }));
    expect(Boolean(errors.description)).toBe(hasError);
  });
});

// U-04: категория — только hardware, software, network.
describe('U-04: категория', () => {
  test.each([
    ['network', false],
    ['Network', true],
    ['printer', true]
  ])('категория %j → ошибка: %s', (category, hasError) => {
    const errors = validateTicketInput(makeInput({ category }));
    expect(Boolean(errors.category)).toBe(hasError);
  });
});

// U-05: приоритет — только low, medium, high.
describe('U-05: приоритет', () => {
  test.each([
    ['high', false],
    ['urgent', true]
  ])('приоритет %j → ошибка: %s', (priority, hasError) => {
    const errors = validateTicketInput(makeInput({ priority }));
    expect(Boolean(errors.priority)).toBe(hasError);
  });
});

// U-06: длина темы проверяется ПОСЛЕ нормализации (ТЗ: «от 5 до 80 символов после нормализации»).
describe('U-06: длина темы считается после нормализации', () => {
  test.each([
    ['  VPN  ', true],        // после нормализации 3 символа
    ['     ', true],          // после нормализации 0 символов
    ['  Сбой VPN  ', false]   // после нормализации 8 символов
  ])('тема %j → ошибка: %s', (title, hasError) => {
    const errors = validateTicketInput(makeInput({ title }));
    expect(Boolean(errors.title)).toBe(hasError);
  });
});

// U-07: переходы статусов. Разрешены только new→in_progress и in_progress→resolved.
describe('U-07: переходы статусов', () => {
  test.each([
    ['new', 'in_progress', true],
    ['in_progress', 'resolved', true],
    ['new', 'resolved', false],        // пропуск этапа запрещён
    ['in_progress', 'new', false],     // возврат запрещён
    ['resolved', 'in_progress', false],
    ['resolved', 'new', false],
    ['new', 'new', false],
    ['in_progress', 'in_progress', false]
  ])('%s → %s: разрешено %s', (from, to, allowed) => {
    expect(canChangeStatus(from, to)).toBe(allowed);
  });
});

// U-08: сортировка. Сначала high, затем medium, затем low.
// Внутри одного приоритета более новая заявка выше.
describe('U-08: сортировка реестра', () => {
  test('сначала high, затем medium, затем low', () => {
    const tickets = [
      ticket({ id: 1, priority: 'low' }),
      ticket({ id: 2, priority: 'high' }),
      ticket({ id: 3, priority: 'medium' })
    ];
    expect(filterAndSort(tickets).map(t => t.id)).toEqual([2, 3, 1]);
  });

  test('внутри одного приоритета более новая заявка выше', () => {
    const tickets = [
      ticket({ id: 1, priority: 'high', createdAt: '2026-01-01T10:00:00.000Z' }),
      ticket({ id: 2, priority: 'high', createdAt: '2026-01-03T10:00:00.000Z' }),
      ticket({ id: 3, priority: 'high', createdAt: '2026-01-02T10:00:00.000Z' })
    ];
    expect(filterAndSort(tickets).map(t => t.id)).toEqual([2, 3, 1]);
  });
});

// U-09: поиск по теме или описанию, без учёта регистра, строка поиска обрезается по краям.
describe('U-09: поиск', () => {
  const list = [
    ticket({ id: 1, title: 'Сбой VPN в корпусе', description: 'Нет связи' }),
    ticket({ id: 2, title: 'Принтер', description: 'Не работает vpn-доступ' }),
    ticket({ id: 3, title: 'Почта', description: 'Не приходят письма' })
  ];

  test.each([
    ['Сбой', [1]],       // точное совпадение (проходит)
    ['VPN', [1, 2]],     // регистр темы и описания
    ['vpn', [1, 2]],     // строчные буквы
    ['  VPN  ', [1, 2]], // пробелы по краям строки поиска
    ['почта', [3]]       // строчные буквы в русском слове
  ])('поиск %j → заявки %j', (search, expectedIds) => {
    const ids = filterAndSort(list, { search }).map(t => t.id).sort((a, b) => a - b);
    expect(ids).toEqual(expectedIds);
  });
});

// U-10: условия поиска, категории и статуса работают как AND.
describe('U-10: совместные фильтры (AND)', () => {
  test('заявка должна подходить под все три условия', () => {
    const list = [
      ticket({ id: 1, title: 'VPN сбой', category: 'network', status: 'new' }),
      ticket({ id: 2, title: 'VPN сбой', category: 'hardware', status: 'new' }),
      ticket({ id: 3, title: 'VPN сбой', category: 'network', status: 'resolved' })
    ];
    const ids = filterAndSort(list, { search: 'VPN', category: 'network', status: 'new' })
      .map(t => t.id);
    expect(ids).toEqual([1]);
  });
});