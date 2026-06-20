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
    return '●'.repeat(remaining) + '<span class="life-empty">' + '○'.repeat(lost) + '</span>';
  }
  return `● ${score}`;
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

  const minScore = Math.min(...sortedPlayers.map(x => x.score));

  // ── Pending deltas (points to add this round) ──────────────────────────────
  const pendingDeltas = {};
  for (const { player } of sortedPlayers) pendingDeltas[player.id] = 0;

  // ── Zone 1: Tussenstand label ─────────────────────────────────────────────
  screen.appendChild(el('div', { class: 'zone-label' }, 'Tussenstand'));

  // ── Player card grid ──────────────────────────────────────────────────────
  const grid = el('div', { class: 'player-grid' });
  const pendingEls = {};

  sortedPlayers.forEach(({ player, score }, i) => {
    const isPelt = game && score >= game.peltThreshold;
    const isLeader = score === minScore;
    const suit = getSuitForIndex(i);

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

    const starEl = el('span', { class: 'card-leader-star' }, '★');

    const scoreEl = el('div', { class: 'card-score' }, String(score));
    const nameEl = el('div', { class: 'card-name' }, player.name);

    const livesEl = document.createElement('div');
    livesEl.className = 'card-lives';
    livesEl.innerHTML = buildLivesHtml(score, game?.losingScore);

    const pendingBadge = el('div', { class: 'card-pending' }, '');
    pendingEls[player.id] = pendingBadge;

    const scoreWrap = el('div', { class: 'card-score-wrap' }, scoreEl, nameEl, livesEl);

    let cardClass = 'player-card-felt';
    if (isPelt) cardClass += ' player-card-felt--pelt';
    else if (isLeader) cardClass += ' player-card-felt--leader';

    const card = el('div', { class: cardClass },
      pipTL,
      isLeader ? starEl : null,
      pendingBadge,
      scoreWrap,
      pipBR,
    );

    if (prevScores && prevScores[player.id] !== undefined) {
      const delta = score - prevScores[player.id];
      if (delta !== 0) {
        requestAnimationFrame(() => showDelta(scoreEl, delta));
      }
    }

    grid.appendChild(card);
  });

  screen.appendChild(grid);

  // ── Zone 2: Scheidingslijn ────────────────────────────────────────────────
  const divider = el('div', { class: 'round-divider' },
    el('span', { class: 'round-divider-label' }, 'Punten deze ronde'),
  );
  screen.appendChild(divider);

  // ── Zone 2: Scoreinvoer met pill-controls ─────────────────────────────────
  const inputZone = el('div', { class: 'score-input-zone' });
  const pillValueEls = {};

  sortedPlayers.forEach(({ player }, i) => {
    const suit = getSuitForIndex(i);

    const suitEl = el('span', { class: `pill-suit ${suit.cls}` }, suit.char);
    const nameEl = el('span', { class: 'pill-name' }, player.name);
    const pillPlayer = el('div', { class: 'pill-player' }, suitEl, nameEl);

    const minusBtn = el('button', { class: 'pill-btn pill-btn--minus' }, '−');
    const valueEl = el('span', { class: 'pill-value' }, '0');
    const plusBtn = el('button', { class: 'pill-btn pill-btn--plus' }, '+');

    pillValueEls[player.id] = valueEl;

    function updatePill() {
      const v = pendingDeltas[player.id];
      valueEl.textContent = (v > 0 ? '+' : '') + v;
      // also sync pending badge on card
      const badge = pendingEls[player.id];
      if (badge) {
        badge.textContent = (v > 0 ? '+' : '') + v;
        badge.className = 'card-pending' + (v > 0 ? ' card-pending--pos' : v < 0 ? ' card-pending--neg' : '');
      }
    }

    minusBtn.addEventListener('click', () => {
      pendingDeltas[player.id] = Math.max(-99, pendingDeltas[player.id] - 1);
      updatePill();
      showScoreFlash(-1);
    });

    plusBtn.addEventListener('click', () => {
      pendingDeltas[player.id] = Math.min(99, pendingDeltas[player.id] + 1);
      updatePill();
      showScoreFlash(+1);
    });

    const pillControl = el('div', { class: 'pill-control' }, minusBtn, valueEl, plusBtn);
    const pillRow = el('div', { class: 'pill-row' }, pillPlayer, pillControl);
    inputZone.appendChild(pillRow);
  });

  screen.appendChild(inputZone);

  // ── Footer: actieknoppen ──────────────────────────────────────────────────
  const resetBtn = el('button', { class: 'btn--felt' }, 'Wis invoer');
  const confirmBtn = el('button', { class: 'btn--felt btn--felt-primary' }, 'Bevestigen ✓');

  resetBtn.addEventListener('click', () => {
    for (const pid of Object.keys(pendingDeltas)) pendingDeltas[pid] = 0;
    for (const pid of Object.keys(pillValueEls)) {
      pillValueEls[pid].textContent = '0';
    }
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
