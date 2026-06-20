import { el, createButton, escapeHtml, showToast } from '../ui.js';
import * as data from '../data.js';

export function registerPlayersScreen(registerScreen) {
  registerScreen('players', renderPlayers);
}

function renderPlayers({ app }) {
  const screen = el('div', { class: 'screen players-screen' });

  screen.appendChild(renderHeader(app));

  const listContainer = el('div', { class: 'players-list' });
  screen.appendChild(listContainer);

  const addForm = renderAddForm(app, () => refreshList());
  screen.appendChild(addForm);

  function refreshList() {
    listContainer.innerHTML = '';
    const players = data.getPlayers();
    if (players.length === 0) {
      listContainer.appendChild(
        el('div', { class: 'empty-state' }, '👥 Nog geen spelers. Voeg er hieronder een toe!')
      );
      return;
    }
    for (const player of players) {
      listContainer.appendChild(renderPlayerCard(player, app, refreshList));
    }
  }

  refreshList();
  return screen;
}

function renderHeader(app) {
  return el('div', { class: 'screen-header' },
    createButton('← Terug', 'ghost', () => app.navigate('home')),
    el('h2', { class: 'screen-title' }, '👥 Spelers'),
  );
}

function renderPlayerCard(player, app, refresh) {
  const sessions = data.getSessions();
  const sessionCount = sessions.filter(s => s.players.some(p => p.playerId === player.id)).length;
  const lossCount = player.stats?.gamesLost ?? 0;
  const playedCount = player.stats?.gamesPlayed ?? 0;

  const card = el('div', { class: 'card player-card', 'data-id': player.id });

  const infoRow = el('div', { class: 'player-info-row' },
    el('div', { class: 'player-avatar' }, player.name.charAt(0).toUpperCase()),
    el('div', { class: 'player-details' },
      el('div', { class: 'player-name', id: `name-${player.id}` }, player.name),
      el('div', { class: 'player-meta' }, `${playedCount} gespeeld · ${lossCount} verloren`),
    ),
  );

  const actions = el('div', { class: 'player-actions' },
    createButton('✏️', 'ghost', () => startEdit(player, card, app, refresh)),
    createButton('🗑️', 'ghost', () => {
      if (confirm(`Speler "${player.name}" verwijderen?`)) {
        app.deletePlayer(player.id);
        refresh();
      }
    }),
  );

  card.appendChild(infoRow);
  card.appendChild(actions);
  return card;
}

function startEdit(player, card, app, refresh) {
  const nameEl = card.querySelector(`#name-${player.id}`);
  if (!nameEl) return;

  const input = el('input', {
    class: 'inline-edit-input',
    value: player.name,
    type: 'text',
    maxlength: '40',
  });

  const confirmBtn = createButton('✓', 'primary', () => {
    const newName = input.value.trim();
    if (newName && app.editPlayer(player.id, newName)) {
      refresh();
    }
  });
  confirmBtn.className = 'btn btn--primary btn--small';

  const cancelBtn = createButton('✕', 'ghost', () => refresh());
  cancelBtn.className = 'btn btn--ghost btn--small';

  nameEl.replaceWith(
    el('div', { class: 'inline-edit-row' }, input, confirmBtn, cancelBtn)
  );

  input.focus();
  input.select();

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  });
}

function renderAddForm(app, refresh) {
  const form = el('form', { class: 'add-player-form card' });

  const input = el('input', {
    class: 'text-input',
    type: 'text',
    placeholder: 'Naam nieuwe speler...',
    maxlength: '40',
    autocomplete: 'off',
  });

  const addBtn = createButton('+ Toevoegen', 'primary');
  addBtn.type = 'submit';

  form.appendChild(el('div', { class: 'form-row' }, input, addBtn));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = input.value.trim();
    if (app.addPlayer(name)) {
      input.value = '';
      refresh();
      input.focus();
    }
  });

  return form;
}
