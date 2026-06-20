import { el, createButton } from '../ui.js';
import * as data from '../data.js';

export function registerStatsScreen(registerScreen) {
  registerScreen('stats', renderStats);
}

function renderStats({ app }) {
  const screen = el('div', { class: 'screen stats-screen' });
  const players = data.getPlayers();
  const sessions = data.getSessions();
  const games = data.getGames();

  screen.appendChild(el('div', { class: 'screen-header' },
    createButton('← Terug', 'ghost', () => app.navigate('home')),
    el('h2', { class: 'screen-title' }, '📊 Statistieken'),
  ));

  if (players.length === 0) {
    screen.appendChild(el('div', { class: 'empty-state' }, '📭 Nog geen spelers of sessies.'));
    return screen;
  }

  // Player filter
  let selectedPlayerId = 'all';

  const filterRow = el('div', { class: 'filter-row' });
  const select = el('select', { class: 'player-filter-select' });
  select.appendChild(el('option', { value: 'all' }, 'Alle spelers'));
  for (const player of players) {
    select.appendChild(el('option', { value: player.id }, player.name));
  }
  select.addEventListener('change', () => {
    selectedPlayerId = select.value;
    refreshHistory();
  });
  filterRow.appendChild(el('label', { class: 'filter-label' }, 'Filter: '));
  filterRow.appendChild(select);
  screen.appendChild(filterRow);

  // Per-player stats cards
  const statsGrid = el('div', { class: 'stats-grid' });

  for (const player of players) {
    const played = player.stats?.gamesPlayed ?? 0;
    const lost = player.stats?.gamesLost ?? 0;
    const won = played - lost;
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;

    const card = el('div', { class: 'stat-player-card card' },
      el('div', { class: 'stat-player-header' },
        el('div', { class: 'stat-player-avatar' }, player.name.charAt(0).toUpperCase()),
        el('div', { class: 'stat-player-name' }, player.name),
      ),
      el('div', { class: 'stat-row' },
        statItem('🎮', 'Gespeeld', String(played)),
        statItem('🏆', 'Gewonnen', String(won)),
        statItem('💀', 'Verloren', String(lost)),
        statItem('📈', 'Win%', `${winRate}%`),
      ),
    );
    statsGrid.appendChild(card);
  }
  screen.appendChild(statsGrid);

  // Session history
  screen.appendChild(el('h3', { class: 'section-label' }, 'Sessie History'));

  const historyContainer = el('div', { id: 'session-history' });
  screen.appendChild(historyContainer);

  function refreshHistory() {
    historyContainer.innerHTML = '';

    let filteredSessions = [...sessions].reverse(); // newest first

    if (selectedPlayerId !== 'all') {
      filteredSessions = filteredSessions.filter(s =>
        s.players.some(p => p.playerId === selectedPlayerId)
      );
    }

    if (filteredSessions.length === 0) {
      historyContainer.appendChild(
        el('div', { class: 'empty-state' }, '📭 Geen sessies gevonden.')
      );
      return;
    }

    for (const session of filteredSessions) {
      const game = games.find(g => g.id === session.gameId);
      const date = new Date(session.date);
      const dateStr = new Intl.DateTimeFormat('nl-NL', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(date);

      const sessionCard = el('div', { class: 'session-history-card card' },
        el('div', { class: 'session-history-header' },
          el('div', { class: 'session-history-game' }, game?.name ?? 'Onbekend spel'),
          el('div', { class: 'session-history-date' }, dateStr),
        ),
        el('div', { class: 'session-history-players' },
          ...session.players.map(({ playerId, finalScore }) => {
            const player = players.find(p => p.id === playerId);
            const isLoser = session.losers?.includes(playerId);
            return el('div', { class: `session-player-chip ${isLoser ? 'session-player-chip--loser' : ''}` },
              el('span', {}, player?.name ?? '?'),
              el('span', { class: 'chip-score' }, `${finalScore}pt`),
              isLoser ? el('span', {}, ' 💀') : el('span', {}, ' 🏆'),
            );
          })
        ),
      );
      historyContainer.appendChild(sessionCard);
    }
  }

  refreshHistory();
  return screen;
}

function statItem(icon, label, value) {
  return el('div', { class: 'stat-item' },
    el('div', { class: 'stat-item-value' }, value),
    el('div', { class: 'stat-item-label' }, `${icon} ${label}`),
  );
}
