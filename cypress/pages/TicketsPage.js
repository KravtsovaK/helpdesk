export class TicketsPage {
  open() { cy.visit('/'); }
  items() { return cy.get('[data-testid="ticket-item"]'); }
  count() { return cy.get('[data-testid="ticket-count"]'); }
  searchFor(text) { cy.get('[data-testid="search"]').clear().type(text); }
  setStatus(status) { cy.get('[data-testid="status-filter"]').select(status); }
  setCategory(category) { cy.get('[data-testid="category-filter"]').select(category); }
  // Карточка заявки по ID
  ticket(id) { return cy.get(`[data-testid="ticket-item"][data-id="${id}"]`); }
  // Заголовки всех карточек
  titles() { return cy.get('[data-testid="ticket-item"] .ticket-title'); }
  // Текст статуса в карточке (последний span в блоке метаданных)
  statusOf(id) { return this.ticket(id).find('.ticket-meta span').last(); }
  // Кнопка перехода статуса в карточке (у завершённой заявки её нет)
  actionButton(id) { return this.ticket(id).find('button'); }
}

