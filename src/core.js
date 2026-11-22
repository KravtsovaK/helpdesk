'use strict';

const CATEGORIES = ['hardware', 'software', 'network'];
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['new', 'in_progress', 'resolved'];
const PRIORITY_RANK = { low: 1, medium: 2, high: 3 };

/**
 * Нормализует тему заявки: внешние и повторяющиеся пробелы незначимы.
 * Продукт передан студентам в исходном состоянии; корректность НЕ гарантируется.
 */
function normalizeTitle(title) {
  return typeof title === 'string' ? title.trim().replace(/\s+/g, ' ') : '';
}

function validateTicketInput(input) {
  const errors = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { input: 'Ожидается объект с данными заявки' };
  }

  // Сначала очищаем тему, потом проверяем длину очищенной строки
  const title = typeof input.title === 'string' ? normalizeTitle(input.title) : '';
  if (title.length < 5 || title.length > 80) {
    errors.title = 'Тема должна содержать от 5 до 80 символов';
  }

  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (description.length < 10 || description.length > 500) {
    errors.description = 'Описание должно содержать от 10 до 500 символов';
  }
  if (!CATEGORIES.includes(input.category)) {
    errors.category = 'Неизвестная категория';
  }
  if (!PRIORITIES.includes(input.priority)) {
    errors.priority = 'Неизвестный приоритет';
  }
  return errors;
}

function canChangeStatus(from, to) {
  if (!STATUSES.includes(from) || !STATUSES.includes(to)) return false;
  if (from === 'new') return to === 'in_progress';
  if (from === 'in_progress') return to === 'resolved';
  return false;
}

/**
 * Условия поиска объединяются оператором AND.
 * В результирующем списке первыми должны идти важные и новые заявки.
 */
function matchesFilters(ticket, f) {
  if (f.priority && ticket.priority !== f.priority) return false;
  if (f.status && ticket.status !== f.status) return false;
  if (f.category && ticket.category !== f.category) return false;
  if (!f.search) return true;
  return ticket.title.toLowerCase().includes(f.search)
    || ticket.description.toLowerCase().includes(f.search);
}

function compareTickets(a, b) {
  const byPriority = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (byPriority !== 0) return byPriority;
  return b.createdAt.localeCompare(a.createdAt);
}

function filterAndSort(tickets, filters = {}) {
  const f = {
    search: String(filters.search || '').trim().toLowerCase(),
    status: String(filters.status || '').trim(),
    category: String(filters.category || '').trim(),
    priority: String(filters.priority || '').trim()
  };
  return tickets.filter((ticket) => matchesFilters(ticket, f)).sort(compareTickets);
}

module.exports = {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  normalizeTitle,
  validateTicketInput,
  canChangeStatus,
  filterAndSort
};
