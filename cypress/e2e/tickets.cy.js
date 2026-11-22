import { TicketsPage } from '../pages/TicketsPage';
import { TicketForm } from '../pages/TicketForm';

const page = new TicketsPage();
const form = new TicketForm();

describe('HelpDesk — E2E', () => {
  beforeEach(() => {
    // Сброс данных до четырёх исходных заявок (работает только в npm run start:test)
    cy.request('POST', '/api/__reset');
  });

  it('показывает исходные заявки', () => {
    page.open();
    cy.get('[data-testid="page-title"]').should('contain', 'HelpDesk');
    page.items().should('have.length', 4);
    page.count().should('have.text', '4');
  });

  it('E-01: создание заявки через форму', () => {
    cy.intercept('POST', '/api/tickets').as('create');
    page.open();

    form.fill({
      title: '  Сбой   VPN в корпусе ',
      description: 'Не удается подключиться к учебной сети',
      category: 'network',
      priority: 'high'
    });
    form.submit();

    cy.wait('@create').its('response.statusCode').should('eq', 201);
    form.message().invoke('text').should('match', /Заявка №\d+ создана/);
    page.count().should('have.text', '5');
    page.titles().should('contain.text', 'Сбой VPN в корпусе');
  });

  it('E-02: поиск и фильтры по статусу и категории', () => {
    page.open();
    page.searchFor('сети');
    page.setStatus('new');
    page.setCategory('network');

    page.count().should('have.text', '1');
    page.items().should('have.length', 1);
    page.titles().should('have.text', 'VPN недоступен');
  });

  it('E-03: перевод заявки в работу и завершение', () => {
    cy.intercept('PATCH', '/api/tickets/*/status').as('patch');
    page.open();

    page.statusOf(1).should('have.text', 'Новая');

    page.actionButton(1).should('have.text', 'В работу').click();
    cy.wait('@patch').its('response.statusCode').should('eq', 200);
    page.statusOf(1).should('have.text', 'В работе');

    page.actionButton(1).should('have.text', 'Завершить').click();
    cy.wait('@patch').its('response.statusCode').should('eq', 200);
    page.statusOf(1).should('have.text', 'Завершена');
    page.actionButton(1).should('not.exist');
  });

  it('E-04: HTML-разметка в тексте заявки остаётся текстом', () => {
    const marker = 'XSS-тест';
    const title = `${marker} <img src=x onerror="window.__xss=1">`;
    const description = '<b>жирный</b> текст описания';

    page.open();
    form.fill({ title, description, category: 'software', priority: 'low' });
    form.submit();
    form.message().should('contain.text', 'создана');

    cy.contains('[data-testid="ticket-item"] .ticket-title', marker)
      .should('have.text', title);

    cy.contains('[data-testid="ticket-item"] .ticket-description', 'текст описания')
      .should('have.text', description);

    cy.window().then((win) => {
      expect(win.__xss, 'код из заголовка не должен выполниться').to.be.undefined;
    });
  });
});