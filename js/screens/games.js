import { el, createButton, showToast } from '../ui.js';
import * as data from '../data.js';

export function registerGamesScreen(registerScreen) {
  registerScreen('games', renderGames);
}

function renderGames({ app }) {
  const screen = el('div', { class: 'screen games-screen' });

  screen.appendChild(el('div', { class: 'screen-header' },
    createButton('← Terug', 'ghost', () => app.navigate('home')),
    el('h2', { class: 'screen-title' }, '🎮 Spellen'),
  ));

  const listContainer = el('div', { class: 'games-list' });
  screen.appendChild(listContainer);

  screen.appendChild(renderAddForm(app, refreshList));

  function refreshList() {
    listContainer.innerHTML = '';
    const games = data.getGames();
    if (games.length === 0) {
      listContainer.appendChild(
        el('div', { class: 'empty-state' }, '🎮 Nog geen spellen. Voeg er hieronder een toe!')
      );
      return;
    }
    for (const game of games) {
      listContainer.appendChild(renderGameCard(game, app, refreshList));
    }
  }

  refreshList();
  return screen;
}

function renderGameCard(game, app, refresh) {
  const card = el('div', { class: 'card game-manage-card', 'data-id': game.id });
  showCardView(card, game, app, refresh);
  return card;
}

function showCardView(card, game, app, refresh) {
  card.innerHTML = '';
  const row = el('div', { class: 'game-manage-row' },
    el('div', { class: 'game-manage-info' },
      el('div', { class: 'game-manage-name' }, game.name),
      el('div', { class: 'game-manage-meta' },
        `Verloren bij ${game.losingScore}pt · Pelt bij ${game.peltThreshold}pt`
        + (game.maxPointsPerRound != null ? ` · Max ${game.maxPointsPerRound}pt/ronde` : '')
        + (game.allowNegativePoints ? '' : ' · Geen negatieve punten'),
      ),
    ),
    el('div', { class: 'player-actions' },
      createButton('✏️', 'ghost', () => showCardEdit(card, game, app, refresh)),
      createButton('🗑️', 'ghost', () => {
        if (confirm(`Spel "${game.name}" verwijderen?`)) {
          app.deleteGame(game.id);
          refresh();
        }
      }),
    ),
  );
  card.appendChild(row);
}

function showCardEdit(card, game, app, refresh) {
  card.innerHTML = '';
  const form = buildGameForm(game,
    (config) => { app.editGame(game.id, config); refresh(); showToast('Spel bijgewerkt', 'success'); },
    () => showCardView(card, game, app, refresh),
  );
  card.appendChild(form);
}

function renderAddForm(app, refresh) {
  const wrapper = el('div', { class: 'card game-add-card' });
  wrapper.appendChild(el('h3', { class: 'section-label' }, '+ Nieuw spel toevoegen'));
  const form = buildGameForm(null,
    (config) => { app.addGame(config); refresh(); showToast('Spel toegevoegd', 'success'); form.reset(); resetForm(); },
    null,
  );
  wrapper.appendChild(form);

  function resetForm() {
    wrapper.innerHTML = '';
    wrapper.appendChild(el('h3', { class: 'section-label' }, '+ Nieuw spel toevoegen'));
    const newForm = buildGameForm(null,
      (config) => { app.addGame(config); refresh(); showToast('Spel toegevoegd', 'success'); resetForm(); },
      null,
    );
    wrapper.appendChild(newForm);
  }

  return wrapper;
}

function buildGameForm(game, onSave, onCancel) {
  const form = el('form', { class: 'game-form' });

  const nameInput = el('input', {
    class: 'text-input',
    type: 'text',
    placeholder: 'Spelnaam...',
    maxlength: '40',
    autocomplete: 'off',
  });
  if (game) nameInput.value = game.name;

  const losingInput = el('input', {
    class: 'text-input',
    type: 'number',
    placeholder: 'bv. 15',
    min: '1',
  });
  losingInput.value = String(game?.losingScore ?? 15);

  const peltInput = el('input', {
    class: 'text-input',
    type: 'number',
    placeholder: 'bv. 14',
    min: '0',
  });
  peltInput.value = String(game?.peltThreshold ?? 14);

  const maxInput = el('input', {
    class: 'text-input',
    type: 'number',
    placeholder: 'Onbeperkt',
    min: '1',
  });
  if (game?.maxPointsPerRound != null) maxInput.value = String(game.maxPointsPerRound);

  const allowNegLabel = el('label', { class: 'checkbox-label' });
  const allowNegCheck = el('input', { type: 'checkbox', class: 'checkbox-input' });
  if (game?.allowNegativePoints ?? true) allowNegCheck.checked = true;
  allowNegLabel.appendChild(allowNegCheck);
  allowNegLabel.appendChild(document.createTextNode(' Negatieve punten toestaan'));

  form.appendChild(el('div', { class: 'form-group' },
    el('label', { class: 'form-label' }, 'Naam'),
    nameInput,
  ));
  form.appendChild(el('div', { class: 'form-row-2' },
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Verliesgrens (pt)'),
      losingInput,
    ),
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Pelt-drempel (pt)'),
      peltInput,
    ),
  ));
  form.appendChild(el('div', { class: 'form-row-2' },
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Max pt/ronde'),
      maxInput,
    ),
    el('div', { class: 'form-group form-group--center' },
      allowNegLabel,
    ),
  ));

  const btnRow = el('div', { class: 'form-btn-row' });

  const saveBtn = createButton(game ? '✓ Opslaan' : '+ Toevoegen', 'primary');
  saveBtn.type = 'submit';
  btnRow.appendChild(saveBtn);

  if (onCancel) {
    const cancelBtn = createButton('✕', 'ghost', onCancel);
    cancelBtn.className = 'btn btn--ghost btn--small';
    btnRow.appendChild(cancelBtn);
  }

  form.appendChild(btnRow);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const losingScore = parseInt(losingInput.value, 10);
    const peltThreshold = parseInt(peltInput.value, 10);
    const maxPR = maxInput.value.trim() ? parseInt(maxInput.value, 10) : null;
    const allowNeg = allowNegCheck.checked;

    if (!name) { showToast('Naam is verplicht', 'error'); return; }
    if (isNaN(losingScore) || losingScore <= 0) { showToast('Verliesgrens moet groter dan 0 zijn', 'error'); return; }
    if (isNaN(peltThreshold) || peltThreshold < 0) { showToast('Pelt-drempel ongeldig', 'error'); return; }
    if (peltThreshold >= losingScore) { showToast('Pelt-drempel moet kleiner zijn dan verliesgrens', 'error'); return; }
    if (maxPR !== null && (isNaN(maxPR) || maxPR <= 0)) { showToast('Max punten per ronde ongeldig', 'error'); return; }

    onSave({ name, losingScore, peltThreshold, maxPointsPerRound: maxPR, allowNegativePoints: allowNeg });
  });

  return form;
}
