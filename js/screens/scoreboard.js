import { el, showToast, showDelta } from '../ui.js';
import * as data from '../data.js';
import { isValidPoints } from '../gameLogic.js';

export function registerScoreboardScreen(registerScreen) {
  registerScreen('scoreboard', renderScoreboard);
}

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_CLASSES = ['suit--black', 'suit--red', 'suit--red', 'suit--black'];

function getSuitForIndex(i) {
  return { char: SUITS[i % 4], cls: SUIT_CLASSES[i % 4] };
}

function showScoreFlash(delta) {
  const flash = document.createElement('div');
  flash.className = `score-flash ${delta > 0 ? 'score-flash--pos' : 'score-flash--neg'}`;
  flash.textContent = (delta > 0 ? '+' : '') + delta;
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });
}

function buildLivesHtml(score, losingScore) {
  if (!losingScore) return '';
  const remaining = Math.max(0, losingScore - score);
  if (losingScore <= 8) {
    const lost = losingScore - remaining;
    return '♠'.repeat(remaining) + '<span class="life-empty">' + '○'.repeat(lost) + '</span>';
  }
  return `♠ ${remaining}/${losingScore}`;
}

function renderScoreboard({ app, prevScores }) {
  const active = app.getActiveSession();
  if (!active) { app.navigate('home'); return null; }

  const game = data.getGames().find(g => g.id === active.gameId);
  const players = data.getPlayers();

  const screen = el('div', { class: 'screen scoreboard-screen' });

  // ── Header ────────────────────────────────────────────────────────────────
  const roundCount = (active.rounds ?? []).length;

  const closeBtn = el('button', { class: 'btn btn--ghost btn--small' }, '✕');
  closeBtn.addEventListener('click', () => {
    if (confirm('Sessie verlaten zonder op te slaan?')) app.abandonSession();
  });

  const titleEl = el('h2', { class: 'screen-title' }, game?.name ?? 'Scoreboard');

  const undoBtn = el('button', { class: 'btn btn--ghost btn--small' }, '↩');
  undoBtn.title = 'Laatste ronde ongedaan maken';
  undoBtn.disabled = roundCount === 0;
  undoBtn.addEventListener('click', () => {
    if (confirm('Laatste ronde ongedaan maken?')) app.undoLastRound();
  });

  const roundCounter = el('span', { class: 'round-counter' }, `Ronde ${roundCount + 1}`);

  const header = el('div', { class: 'screen-header' },
    closeBtn,
    titleEl,
    roundCounter,
    undoBtn,
  );
  screen.appendChild(header);

  // ── Player order & leader detection ───────────────────────────────────────
  const sortedPlayers = active.playerIds
    .map(pid => ({ player: players.find(p => p.id === pid), score: active.scores[pid] ?? 0 }))
    .filter(x => x.player);

  // In penalty games, lowest score = leader
  const minScore = Math.min(...sortedPlayers.map(x => x.score));

  // ── Pending deltas (points to add this round) ──────────────────────────────
  const pendingDeltas = {};
  for (const { player } of sortedPlayers) pendingDeltas[player.id] = 0;

  // ── Player card grid ──────────────────────────────────────────────────────
  const grid = el('div', { class: 'player-grid' });
  const pendingEls = {}; // badge elements for in-place update

  sortedPlayers.forEach(({ player, score }, i) => {
    const isPelt = game && score >= game.peltThreshold;
    const isLeader = score === minScore;
    const suit = getSuitForIndex(i);

    // Corner pip element (reused top-left and bottom-right)
    function makePip() {
      const corner = document.createElement('div');
      corner.className = 'card-corner';
      const initial = document.createElement('div');
      initial.textContent = player.name.charAt(0).toUpperCase();
      const suitEl = document.createElement('div');
      suitEl.className = `card-corner-suit ${suit.cls}`;
      suitEl.textContent = suit.char;
      corner.appendChild(initial);
      corner.appendChild(suitEl);
      return corner;
    }

    const pipTL = makePip();
    pipTL.classList.add('card-corner--tl');

    const pipBR = makePip();
    pipBR.classList.add('card-corner--br');

    // Leader star
    const starEl = el('span', { class: 'card-leader-star' }, '★');

    // Score display
    const scoreEl = el('div', { class: 'card-score' }, String(score));

    // Name
    const nameEl = el('div', { class: 'card-name' }, player.name);

    // Lives
    const livesEl = document.createElement('div');
    livesEl.className = 'card-lives';
    livesEl.innerHTML = buildLivesHtml(score, game?.losingScore);

    // Pending delta badge
    const pendingBadge = el('div', { class: 'card-pending' }, '');
    pendingEls[player.id] = pendingBadge;

    // Score wrapper
    const scoreWrap = el('div', { class: 'card-score-wrap' }, scoreEl, nameEl, livesEl);

    // +/- buttons
    const minusBtn = el('button', { class: 'card-btn card-btn--minus' }, '−');
    const plusBtn = el('button', { class: 'card-btn card-btn--plus' }, '+');

    function updatePending() {
      const v = pendingDeltas[player.id];
      pendingBadge.textContent = (v > 0 ? '+' : '') + v;
      pendingBadge.className = 'card-pending' + (v > 0 ? ' card-pending--pos' : v < 0 ? ' card-pending--neg' : '');
    }

    minusBtn.addEventListener('click', () => {
      pendingDeltas[player.id] = Math.max(-99, pendingDeltas[player.id] - 1);
      updatePending();
      showScoreFlash(-1);
    });

    plusBtn.addEventListener('click', () => {
      pendingDeltas[player.id] = Math.min(99, pendingDeltas[player.id] + 1);
      updatePending();
      showScoreFlash(+1);
    });

    const controls = el('div', { class: 'card-controls' }, minusBtn, plusBtn);

    const card = el('div', { class: `player-card-felt${isPelt ? ' player-card-felt--pelt' : ''}` },
      pipTL,
      isLeader ? starEl : null,
      pendingBadge,
      scoreWrap,
      pipBR,
      controls,
    );

    // Show delta badge from previous round
    if (prevScores && prevScores[player.id] !== undefined) {
      const delta = score - prevScores[player.id];
      if (delta !== 0) {
        requestAnimationFrame(() => showDelta(scoreEl, delta));
      }
    }

    grid.appendChild(card);
  });

  screen.appendChild(grid);

  // ── Action buttons ────────────────────────────────────────────────────────
  const resetBtn = el('button', { class: 'btn--felt' }, 'Reset');
  const confirmBtn = el('button', { class: 'btn--felt btn--felt-primary' }, 'Volgende ronde ✓');

  resetBtn.addEventListener('click', () => {
    for (const pid of Object.keys(pendingDeltas)) pendingDeltas[pid] = 0;
    for (const pid of Object.keys(pendingEls)) {
      pendingEls[pid].textContent = '';
      pendingEls[pid].className = 'card-pending';
    }
  });

  confirmBtn.addEventListener('click', () => {
    const entries = [];
    for (const { player } of sortedPlayers) {
      const points = pendingDeltas[player.id] ?? 0;
      if (game && !isValidPoints(points, game)) {
        showToast(`Ongeldige puntwaarde voor ${player.name}`, 'error');
        return;
      }
      entries.push({ playerId: player.id, points });
    }
    confirmBtn.disabled = true;
    app.submitRound(entries, active.scores);
  });

  screen.appendChild(el('div', { class: 'scoreboard-actions' }, resetBtn, confirmBtn));

  // ── Round history (collapsible) ───────────────────────────────────────────
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
        el('div', { class: 'history-cell' }, player.name)
      ),
    );
    historyBody.appendChild(headerRow);

    rounds.forEach((round, idx) => {
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

  return screen;
}
