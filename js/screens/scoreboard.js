import { el, createButton, showToast, showDelta } from '../ui.js';
import * as data from '../data.js';
import { isValidPoints } from '../gameLogic.js';

export function registerScoreboardScreen(registerScreen) {
  registerScreen('scoreboard', renderScoreboard);
}

function renderScoreboard({ app, prevScores }) {
  const active = app.getActiveSession();
  if (!active) { app.navigate('home'); return null; }

  const game = data.getGames().find(g => g.id === active.gameId);
  const players = data.getPlayers();
  const screen = el('div', { class: 'screen scoreboard-screen' });

  // Header
  const roundCount = (active.rounds ?? []).length;
  const undoBtn = createButton('↩', 'ghost');
  undoBtn.title = 'Laatste ronde ongedaan maken';
  undoBtn.className = 'btn btn--ghost btn--small';
  undoBtn.disabled = roundCount === 0;
  undoBtn.addEventListener('click', () => {
    if (confirm('Laatste ronde ongedaan maken?')) app.undoLastRound();
  });

  const header = el('div', { class: 'screen-header' },
    createButton('✕', 'ghost', () => {
      if (confirm('Sessie verlaten zonder op te slaan?')) {
        app.abandonSession();
      }
    }),
    el('h2', { class: 'screen-title' }, game?.name ?? 'Scoreboard'),
    undoBtn,
  );
  screen.appendChild(header);

  // Score table — sorted by score ascending (lower is better in penalty games)
  const sortedPlayers = active.playerIds
    .map(pid => ({ player: players.find(p => p.id === pid), score: active.scores[pid] ?? 0 }))
    .filter(x => x.player)
    .sort((a, b) => a.score - b.score);

  const table = el('div', { class: 'score-table' });
  const scoreRowWraps = {};

  sortedPlayers.forEach(({ player, score }, i) => {
    const isPelt = game && score >= game.peltThreshold;
    const progress = game ? Math.min(score / game.losingScore, 1) : 0;

    const scoreValueEl = el('div', { class: 'score-value' }, String(score));
    const avatarStyle = player.color && !isPelt ? `background:${player.color};color:#0f0f13` : '';

    const row = el('div', { class: `score-row ${isPelt ? 'score-row--pelt' : ''}` },
      el('div', { class: 'score-row-left' },
        el('div', { class: 'score-avatar', style: avatarStyle }, player.name.charAt(0).toUpperCase()),
        el('div', { class: 'score-player-info' },
          el('div', { class: 'score-player-name' }, player.name),
          isPelt ? el('div', { class: 'pelt-badge' }, '⚠️ PELT') : null,
        ),
      ),
      scoreValueEl,
    );

    const bar = el('div', { class: 'score-progress-bar' },
      el('div', {
        class: `score-progress-fill ${isPelt ? 'score-progress-fill--pelt' : ''}`,
        style: `width: ${Math.round(progress * 100)}%`,
      }),
    );
    const rowWrap = el('div', {
      class: 'score-row-wrap',
      style: `animation-delay: ${i * 50}ms`,
    }, row, bar);
    rowWrap.classList.add('score-row-enter');
    scoreRowWraps[player.id] = { wrap: rowWrap, scoreEl: scoreValueEl };
    table.appendChild(rowWrap);

    // Show delta badge if we just came from a round submission
    if (prevScores && prevScores[player.id] !== undefined) {
      const delta = score - prevScores[player.id];
      if (delta !== 0) {
        requestAnimationFrame(() => showDelta(scoreValueEl, delta));
      }
    }
  });

  screen.appendChild(table);

  if (game) {
    screen.appendChild(
      el('div', { class: 'losing-score-hint' }, `Verloren bij ${game.losingScore} punten`)
    );
  }

  // Round history (collapsible)
  const rounds = active.rounds ?? [];
  if (rounds.length > 0) {
    const historySection = el('div', { class: 'round-history' });
    let expanded = false;

    const toggleBtn = el('button', { class: 'round-history-toggle' },
      `🕐 Rondegeschiedenis (${rounds.length})`
    );

    const historyBody = el('div', { class: 'round-history-body hidden' });

    const headerRow = el('div', { class: 'history-header-row' },
      el('div', { class: 'history-cell history-cell--round' }, '#'),
      ...sortedPlayers.map(({ player }) =>
        el('div', { class: 'history-cell', style: player.color ? `color:${player.color}` : '' }, player.name)
      ),
    );
    historyBody.appendChild(headerRow);

    const runningTotals = {};
    for (const { player } of sortedPlayers) runningTotals[player.id] = 0;

    rounds.forEach((round, idx) => {
      for (const entry of round.entries) {
        runningTotals[entry.playerId] = (runningTotals[entry.playerId] ?? 0) + entry.points;
      }
      const row = el('div', { class: 'history-row' },
        el('div', { class: 'history-cell history-cell--round' }, String(idx + 1)),
        ...sortedPlayers.map(({ player }) => {
          const entry = round.entries.find(e => e.playerId === player.id);
          const pts = entry?.points ?? 0;
          return el('div', {
            class: `history-cell ${pts > 0 ? 'history-cell--pos' : pts < 0 ? 'history-cell--neg' : ''}`,
          }, pts !== 0 ? (pts > 0 ? `+${pts}` : String(pts)) : '—');
        }),
      );
      historyBody.appendChild(row);
    });

    toggleBtn.addEventListener('click', () => {
      expanded = !expanded;
      historyBody.classList.toggle('hidden', !expanded);
      toggleBtn.classList.toggle('round-history-toggle--open', expanded);
    });

    historySection.appendChild(toggleBtn);
    historySection.appendChild(historyBody);
    screen.appendChild(historySection);
  }

  // Round input form
  screen.appendChild(el('h3', { class: 'section-label' }, '➕ Ronde invoeren'));

  const form = el('div', { class: 'round-form card' });

  // Per-player stepper rows
  const pointValues = {};
  for (const { player } of sortedPlayers) {
    pointValues[player.id] = 0;
  }

  const stepperList = el('div', { class: 'stepper-list' });

  for (const { player } of sortedPlayers) {
    const inputEl = el('input', {
      class: 'stepper-input',
      type: 'number',
      min: '-99',
      max: '99',
      value: '0',
    });

    inputEl.addEventListener('input', () => {
      const v = parseInt(inputEl.value, 10);
      pointValues[player.id] = isNaN(v) ? 0 : v;
      updateRowHighlight(stepperRow, pointValues[player.id]);
    });

    inputEl.addEventListener('blur', () => {
      if (inputEl.value === '' || isNaN(parseInt(inputEl.value, 10))) {
        inputEl.value = '0';
        pointValues[player.id] = 0;
        updateRowHighlight(stepperRow, 0);
      }
    });

    const minusBtn = el('button', { class: 'stepper-btn stepper-btn--minus' }, '−');
    const plusBtn = el('button', { class: 'stepper-btn stepper-btn--plus' }, '+');

    minusBtn.addEventListener('click', () => {
      const cur = pointValues[player.id] ?? 0;
      const next = Math.max(-99, cur - 1);
      pointValues[player.id] = next;
      inputEl.value = String(next);
      updateRowHighlight(stepperRow, next);
    });

    plusBtn.addEventListener('click', () => {
      const cur = pointValues[player.id] ?? 0;
      const next = Math.min(99, cur + 1);
      pointValues[player.id] = next;
      inputEl.value = String(next);
      updateRowHighlight(stepperRow, next);
    });

    const stepperAvatarStyle = player.color ? `background:${player.color};color:#0f0f13` : '';
    const stepperRow = el('div', { class: 'stepper-row' },
      el('div', { class: 'stepper-player' },
        el('div', { class: 'stepper-avatar', style: stepperAvatarStyle }, player.name.charAt(0).toUpperCase()),
        el('span', { class: 'stepper-name' }, player.name),
      ),
      el('div', { class: 'stepper-controls' },
        minusBtn,
        inputEl,
        plusBtn,
      ),
    );

    stepperList.appendChild(stepperRow);
  }

  form.appendChild(stepperList);

  const submitBtn = createButton('✓ Ronde Bevestigen', 'primary');
  submitBtn.className = 'btn btn--primary btn--large';

  submitBtn.addEventListener('click', () => {
    const entries = [];
    for (const { player } of sortedPlayers) {
      const points = pointValues[player.id] ?? 0;
      if (game && !isValidPoints(points, game)) {
        showToast(`Ongeldige puntwaarde voor ${player.name}`, 'error');
        return;
      }
      entries.push({ playerId: player.id, points });
    }

    const hasAnyNonZero = entries.some(e => e !== 0);
    // Allow all-zero round (e.g. everyone tied), just submit as-is
    animateSubmitBtn(submitBtn);
    app.submitRound(entries, active.scores);
  });

  form.appendChild(submitBtn);
  screen.appendChild(form);

  screen.appendChild(
    el('div', { class: 'round-count' }, `Ronde ${roundCount + 1}`)
  );

  return screen;
}

function updateRowHighlight(row, value) {
  if (value > 0) {
    row.classList.add('stepper-row--positive');
    row.classList.remove('stepper-row--negative');
  } else if (value < 0) {
    row.classList.add('stepper-row--negative');
    row.classList.remove('stepper-row--positive');
  } else {
    row.classList.remove('stepper-row--positive', 'stepper-row--negative');
  }
}

function animateSubmitBtn(btn) {
  btn.classList.add('btn--confirm-pulse');
  btn.addEventListener('animationend', () => btn.classList.remove('btn--confirm-pulse'), { once: true });
}
