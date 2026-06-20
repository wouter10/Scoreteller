import { el, createButton } from '../ui.js';
import * as data from '../data.js';

export function registerEndScreen(registerScreen) {
  registerScreen('end', renderEnd);
}

function renderEnd({ app, losers = [] }) {
  const active = app.getActiveSession();
  if (!active) { app.navigate('home'); return null; }

  const players = data.getPlayers();
  const game = data.getGames().find(g => g.id === active.gameId);
  const screen = el('div', { class: 'screen end-screen' });

  // Trophy header
  screen.appendChild(el('div', { class: 'end-header' },
    el('div', { class: 'end-trophy' }, losers.length > 0 ? '💀' : '🏆'),
    el('h2', { class: 'end-title' }, 'Sessie Afgelopen!'),
    game ? el('p', { class: 'end-game' }, game.name) : null,
  ));

  // Results list
  const resultsList = el('div', { class: 'results-list' });

  const sortedPlayers = active.playerIds
    .map(pid => ({ player: players.find(p => p.id === pid), score: active.scores[pid] ?? 0 }))
    .filter(x => x.player)
    .sort((a, b) => a.score - b.score);

  for (const { player, score } of sortedPlayers) {
    const isLoser = losers.includes(player.id);
    const resultCard = el('div', { class: `result-card ${isLoser ? 'result-card--loser' : 'result-card--winner'}` },
      el('div', { class: 'result-icon' }, isLoser ? '💀' : '🏆'),
      el('div', { class: 'result-player-info' },
        el('div', { class: 'result-player-name' }, player.name),
        el('div', { class: 'result-label' }, isLoser ? 'Verloren' : 'Gewonnen'),
      ),
      el('div', { class: 'result-score' }, `${score} pt`),
    );
    resultsList.appendChild(resultCard);
  }

  screen.appendChild(resultsList);

  // Loser callout
  if (losers.length > 0) {
    const loserNames = losers.map(id => players.find(p => p.id === id)?.name ?? 'Onbekend');
    screen.appendChild(
      el('div', { class: 'loser-callout' },
        el('p', {}, `💀 ${loserNames.join(', ')} ${losers.length === 1 ? 'heeft' : 'hebben'} verloren!`),
      )
    );
  }

  // Actions
  const actions = el('div', { class: 'end-actions' });

  const saveBtn = createButton('💾 Opslaan & Naar Huis', 'primary');
  saveBtn.className = 'btn btn--primary btn--large';
  saveBtn.addEventListener('click', () => app.endSession(losers));

  const playAgainBtn = createButton('🔄 Opnieuw met zelfde spelers', 'ghost');
  playAgainBtn.className = 'btn btn--ghost btn--large';
  playAgainBtn.addEventListener('click', () => {
    const { gameId, playerIds } = active;
    app.endSession(losers);
    setTimeout(() => app.startSession(gameId, playerIds), 50);
  });

  actions.appendChild(saveBtn);
  actions.appendChild(playAgainBtn);

  screen.appendChild(actions);
  return screen;
}
