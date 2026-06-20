import { el, createButton, showToast } from '../ui.js';
import * as data from '../data.js';
import { isValidPoints } from '../gameLogic.js';

export function registerScoreboardScreen(registerScreen) {
  registerScreen('scoreboard', renderScoreboard);
}

function renderScoreboard({ app }) {
  const active = app.getActiveSession();
  if (!active) { app.navigate('home'); return null; }

  const game = data.getGames().find(g => g.id === active.gameId);
  const players = data.getPlayers();
  const screen = el('div', { class: 'screen scoreboard-screen' });

  // Header
  const header = el('div', { class: 'screen-header' },
    createButton('✕ Stoppen', 'ghost', () => {
      if (confirm('Sessie verlaten zonder op te slaan?')) {
        app.abandonSession();
      }
    }),
    el('h2', { class: 'screen-title' }, game?.name ?? 'Scoreboard'),
  );
  screen.appendChild(header);

  // Score table — sorted by score ascending (lower is better in penalty games)
  const sortedPlayers = active.playerIds
    .map(pid => ({ player: players.find(p => p.id === pid), score: active.scores[pid] ?? 0 }))
    .filter(x => x.player)
    .sort((a, b) => a.score - b.score);

  const table = el('div', { class: 'score-table' });

  for (const { player, score } of sortedPlayers) {
    const isPelt = game && score >= game.peltThreshold;
    const progress = game ? Math.min(score / game.losingScore, 1) : 0;

    const row = el('div', { class: `score-row ${isPelt ? 'score-row--pelt' : ''}` },
      el('div', { class: 'score-row-left' },
        el('div', { class: 'score-avatar' }, player.name.charAt(0).toUpperCase()),
        el('div', { class: 'score-player-info' },
          el('div', { class: 'score-player-name' }, player.name),
          isPelt ? el('div', { class: 'pelt-badge' }, '⚠️ PELT') : null,
        ),
      ),
      el('div', { class: 'score-value' }, String(score)),
    );

    // Progress bar
    const bar = el('div', { class: 'score-progress-bar' },
      el('div', {
        class: `score-progress-fill ${isPelt ? 'score-progress-fill--pelt' : ''}`,
        style: `width: ${Math.round(progress * 100)}%`,
      }),
    );
    const rowWrap = el('div', { class: 'score-row-wrap' }, row, bar);
    table.appendChild(rowWrap);
  }

  screen.appendChild(table);

  if (game) {
    screen.appendChild(
      el('div', { class: 'losing-score-hint' }, `Verloren bij ${game.losingScore} punten`)
    );
  }

  // Round input form
  screen.appendChild(el('h3', { class: 'section-label' }, '➕ Ronde invoeren'));

  const form = el('div', { class: 'round-form card' });
  const selectedIds = new Set();

  // Player checkboxes
  const playerToggles = el('div', { class: 'round-player-toggles' });

  function renderToggles() {
    playerToggles.innerHTML = '';
    for (const { player } of sortedPlayers) {
      const isSel = selectedIds.has(player.id);
      const btn = el('button', {
        class: `player-toggle ${isSel ? 'player-toggle--selected' : ''}`,
        onclick: () => {
          if (selectedIds.has(player.id)) selectedIds.delete(player.id);
          else selectedIds.add(player.id);
          renderToggles();
          updateSubmitBtn();
        },
      },
        el('span', { class: 'player-toggle-avatar' }, player.name.charAt(0).toUpperCase()),
        el('span', { class: 'player-toggle-name' }, player.name),
      );
      playerToggles.appendChild(btn);
    }
  }
  renderToggles();
  form.appendChild(playerToggles);

  // Points input
  const pointsRow = el('div', { class: 'points-row' },
    el('label', { class: 'points-label', for: 'points-input' }, 'Punten:'),
    el('input', {
      class: 'points-input',
      id: 'points-input',
      type: 'number',
      placeholder: '0',
      min: '-99',
      max: '99',
    }),
  );
  form.appendChild(pointsRow);

  const submitBtn = createButton('✓ Ronde Bevestigen', 'primary');
  submitBtn.className = 'btn btn--primary btn--large';
  submitBtn.disabled = true;

  function updateSubmitBtn() {
    submitBtn.disabled = selectedIds.size === 0;
  }

  submitBtn.addEventListener('click', () => {
    const pointsInput = form.querySelector('#points-input');
    const raw = pointsInput.value.trim();
    const points = parseInt(raw, 10);

    if (raw === '' || isNaN(points)) {
      showToast('Vul een geldig aantal punten in', 'error');
      return;
    }

    if (game && !isValidPoints(points, game)) {
      showToast('Ongeldige puntwaarde', 'error');
      return;
    }

    if (selectedIds.size === 0) {
      showToast('Selecteer minimaal één speler', 'error');
      return;
    }

    const entries = [...selectedIds].map(playerId => ({ playerId, points }));
    app.submitRound(entries);
  });

  form.appendChild(submitBtn);
  screen.appendChild(form);

  // Round count
  const roundCount = (active.rounds ?? []).length;
  if (roundCount > 0) {
    screen.appendChild(
      el('div', { class: 'round-count' }, `Ronde ${roundCount + 1}`)
    );
  }

  return screen;
}
