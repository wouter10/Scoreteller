import { el, createButton, escapeHtml, showToast } from '../ui.js';
import * as data from '../data.js';

function colorSwatch(color, selected, onClick) {
  const sw = el('button', { type: 'button', class: `color-swatch ${selected ? 'color-swatch--selected' : ''}` });
  sw.style.background = color;
  sw.addEventListener('click', onClick);
  return sw;
}

function renderColorPicker(selectedColor, onChange) {
  const wrap = el('div', { class: 'color-picker' });
  const swatches = [];
  for (const c of data.PLAYER_COLORS) {
    const sw = colorSwatch(c, c === selectedColor, () => {
      swatches.forEach(s => s.classList.remove('color-swatch--selected'));
      sw.classList.add('color-swatch--selected');
      onChange(c);
    });
    swatches.push(sw);
    wrap.appendChild(sw);
  }
  return wrap;
}

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
    el('div', { class: 'player-avatar', style: player.color ? `background:${player.color}` : '' }, player.name.charAt(0).toUpperCase()),
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

  let selectedColor = player.color ?? data.PLAYER_COLORS[0];

  const input = el('input', {
    class: 'inline-edit-input',
    value: player.name,
    type: 'text',
    maxlength: '40',
  });

  const picker = renderColorPicker(selectedColor, c => { selectedColor = c; });

  const confirmBtn = createButton('✓', 'primary', () => {
    const newName = input.value.trim();
    if (newName && app.editPlayer(player.id, newName, selectedColor)) {
      refresh();
    }
  });
  confirmBtn.className = 'btn btn--primary btn--small';

  const cancelBtn = createButton('✕', 'ghost', () => refresh());
  cancelBtn.className = 'btn btn--ghost btn--small';

  const editWrap = el('div', { class: 'inline-edit-wrap' },
    el('div', { class: 'inline-edit-row' }, input, confirmBtn, cancelBtn),
    picker,
  );

  nameEl.replaceWith(editWrap);

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

  const players = data.getPlayers();
  const usedColors = players.map(p => p.color).filter(Boolean);
  let selectedColor = data.PLAYER_COLORS.find(c => !usedColors.includes(c)) ?? data.PLAYER_COLORS[0];

  const picker = renderColorPicker(selectedColor, c => { selectedColor = c; });

  const addBtn = createButton('+ Toevoegen', 'primary');
  addBtn.type = 'submit';

  form.appendChild(el('div', { class: 'form-row' }, input, addBtn));
  form.appendChild(picker);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = input.value.trim();
    if (app.addPlayer(name, selectedColor)) {
      input.value = '';
      refresh();
      input.focus();
    }
  });

  return form;
}
