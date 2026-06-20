import { el, createButton, showToast } from '../ui.js';
import * as data from '../data.js';

export function registerNewSessionScreen(registerScreen) {
  registerScreen('newSession', renderNewSession);
}

function renderNewSession({ app }) {
  const screen = el('div', { class: 'screen new-session-screen' });
  const players = data.getPlayers();
  const games = data.getGames();

  screen.appendChild(el('div', { class: 'screen-header' },
    createButton('← Terug', 'ghost', () => app.navigate('home')),
    el('h2', { class: 'screen-title' }, '🎮 Nieuwe Sessie'),
  ));

  // Game selection
  screen.appendChild(el('h3', { class: 'section-label' }, 'Kies een spel'));

  let selectedGameId = games[0]?.id ?? null;
  const gameSection = el('div', { class: 'game-list' });

  function renderGames() {
    gameSection.innerHTML = '';
    for (const game of games) {
      const isSelected = game.id === selectedGameId;
      const card = el('button', {
        class: `game-card ${isSelected ? 'game-card--selected' : ''}`,
        onclick: () => { selectedGameId = game.id; renderGames(); },
      },
        el('div', { class: 'game-card-name' }, game.name),
        el('div', { class: 'game-card-meta' }, `Verloren bij ${game.losingScore}pt · Pelt bij ${game.peltThreshold}pt`),
        isSelected ? el('div', { class: 'game-card-check' }, '✓') : null,
      );
      gameSection.appendChild(card);
    }
  }
  renderGames();
  screen.appendChild(gameSection);

  // Player selection
  screen.appendChild(el('h3', { class: 'section-label' }, 'Kies spelers (min. 2)'));

  const selectedPlayerIds = new Set();
  const playerSection = el('div', { class: 'player-select-list' });

  function renderPlayerSelect() {
    playerSection.innerHTML = '';
    if (players.length === 0) {
      playerSection.appendChild(
        el('div', { class: 'empty-state' }, '👥 Geen spelers gevonden. Voeg eerst spelers toe.')
      );
      return;
    }
    for (const player of players) {
      const isSelected = selectedPlayerIds.has(player.id);
      const row = el('button', {
        class: `player-select-row ${isSelected ? 'player-select-row--selected' : ''}`,
        onclick: () => {
          if (selectedPlayerIds.has(player.id)) {
            selectedPlayerIds.delete(player.id);
          } else {
            selectedPlayerIds.add(player.id);
          }
          renderPlayerSelect();
          updateStartBtn();
        },
      },
        el('div', { class: 'player-select-avatar' }, player.name.charAt(0).toUpperCase()),
        el('div', { class: 'player-select-name' }, player.name),
        el('div', { class: `player-select-check ${isSelected ? 'visible' : ''}` }, '✓'),
      );
      playerSection.appendChild(row);
    }
  }
  renderPlayerSelect();
  screen.appendChild(playerSection);

  // Count label
  const countLabel = el('div', { class: 'player-count-label' }, '');
  screen.appendChild(countLabel);

  // Start button
  const startBtn = createButton('🎮 Start Sessie', 'primary');
  startBtn.className = 'btn btn--primary btn--large';
  startBtn.disabled = true;

  function updateStartBtn() {
    const count = selectedPlayerIds.size;
    countLabel.textContent = count === 0 ? '' : `${count} speler${count !== 1 ? 's' : ''} geselecteerd`;
    startBtn.disabled = count < 2 || !selectedGameId;
  }

  startBtn.addEventListener('click', () => {
    if (selectedPlayerIds.size < 2) {
      showToast('Selecteer minimaal 2 spelers', 'error');
      return;
    }
    if (!selectedGameId) {
      showToast('Selecteer een spel', 'error');
      return;
    }
    app.startSession(selectedGameId, [...selectedPlayerIds]);
  });

  screen.appendChild(startBtn);

  return screen;
}
