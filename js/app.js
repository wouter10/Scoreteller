import * as data from './data.js';
import * as logic from './gameLogic.js';
import { renderScreen, registerScreen, showPeltAnimation, showToast } from './ui.js';
import { registerHomeScreen } from './screens/home.js';
import { registerPlayersScreen } from './screens/players.js';
import { registerNewSessionScreen } from './screens/newSession.js';
import { registerScoreboardScreen } from './screens/scoreboard.js';
import { registerEndScreen } from './screens/end.js';
import { registerStatsScreen } from './screens/stats.js';
import { registerGamesScreen } from './screens/games.js';

// ── State ─────────────────────────────────────────────────────────────────────
let currentScreen = 'home';
let activeSession = null; // mirrors scoreteller_active_session during play

// ── Navigation ────────────────────────────────────────────────────────────────
export function navigate(screen, params = {}) {
  currentScreen = screen;
  renderScreen(screen, { ...params, app: appAPI });
}

// ── Session actions ───────────────────────────────────────────────────────────
export function startSession(gameId, playerIds) {
  const scores = {};
  for (const id of playerIds) scores[id] = 0;

  activeSession = { gameId, playerIds, scores, rounds: [] };
  data.saveActiveSession(activeSession);
  navigate('scoreboard');
}

export async function submitRound(entries, prevScores) {
  if (!activeSession) return;

  const game = data.getGames().find(g => g.id === activeSession.gameId);
  if (!game) return;

  const snapshotScores = prevScores ?? { ...activeSession.scores };
  const { scores, pelted } = logic.applyRoundEntry(activeSession.scores, entries, game);
  activeSession.scores = scores;
  activeSession.rounds.push({ entries });
  data.saveActiveSession(activeSession);

  // Show pelt animations sequentially
  const players = data.getPlayers();
  for (const pid of pelted) {
    const player = players.find(p => p.id === pid);
    if (player) await showPeltAnimation(player.name);
  }

  const losers = logic.checkGameOver(scores, game);
  if (losers.length > 0) {
    navigate('end', { losers });
  } else {
    navigate('scoreboard', { prevScores: snapshotScores });
  }
}

export function endSession(losers) {
  if (!activeSession) return;

  const game = data.getGames().find(g => g.id === activeSession.gameId);
  const session = logic.buildSessionResult(activeSession, activeSession.scores);
  session.losers = losers;

  const sessions = data.getSessions();
  sessions.push(session);
  data.saveSessions(sessions);

  // Update player stats
  const players = data.getPlayers();
  for (const pid of activeSession.playerIds) {
    const player = players.find(p => p.id === pid);
    if (!player) continue;
    if (!player.stats) player.stats = { gamesPlayed: 0, gamesLost: 0 };
    player.stats.gamesPlayed = (player.stats.gamesPlayed ?? 0) + 1;
    if (losers.includes(pid)) {
      player.stats.gamesLost = (player.stats.gamesLost ?? 0) + 1;
    }
  }
  data.savePlayers(players);

  data.clearActiveSession();
  activeSession = null;

  showToast('Sessie opgeslagen! 🎉', 'success');
  navigate('home');
}

export function playAgain() {
  if (!activeSession) { navigate('home'); return; }
  const { gameId, playerIds } = activeSession;
  data.clearActiveSession();
  activeSession = null;
  startSession(gameId, playerIds);
}

export function abandonSession() {
  data.clearActiveSession();
  activeSession = null;
  navigate('home');
}

export function undoLastRound() {
  if (!activeSession || activeSession.rounds.length === 0) {
    showToast('Geen ronde om ongedaan te maken', 'info');
    return;
  }
  const rounds = activeSession.rounds.slice(0, -1);
  const scores = {};
  for (const id of activeSession.playerIds) scores[id] = 0;
  for (const round of rounds) {
    for (const { playerId, points } of round.entries) {
      scores[playerId] = (scores[playerId] ?? 0) + points;
    }
  }
  activeSession.rounds = rounds;
  activeSession.scores = scores;
  data.saveActiveSession(activeSession);
  showToast('Laatste ronde ongedaan gemaakt', 'info');
  navigate('scoreboard');
}

// ── Player actions ────────────────────────────────────────────────────────────
export function addPlayer(name, color) {
  const players = data.getPlayers();
  const trimmed = name.trim();
  if (!trimmed) { showToast('Naam mag niet leeg zijn', 'error'); return false; }
  if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
    showToast('Speler bestaat al', 'error'); return false;
  }
  const usedColors = players.map(p => p.color).filter(Boolean);
  const autoColor = color ?? data.PLAYER_COLORS.find(c => !usedColors.includes(c)) ?? data.PLAYER_COLORS[0];
  players.push({
    id: data.generateId('p'),
    name: trimmed,
    color: autoColor,
    createdAt: new Date().toISOString(),
    stats: { gamesPlayed: 0, gamesLost: 0 },
  });
  data.savePlayers(players);
  return true;
}

export function editPlayer(id, name, color) {
  const players = data.getPlayers();
  const trimmed = name.trim();
  if (!trimmed) { showToast('Naam mag niet leeg zijn', 'error'); return false; }
  const idx = players.findIndex(p => p.id === id);
  if (idx === -1) return false;
  players[idx].name = trimmed;
  if (color) players[idx].color = color;
  data.savePlayers(players);
  return true;
}

export function deletePlayer(id) {
  const sessions = data.getSessions();
  const usedInSessions = sessions.some(s => s.players.some(p => p.playerId === id));
  const players = data.getPlayers().filter(p => p.id !== id);
  data.savePlayers(players);
  if (usedInSessions) {
    showToast('Speler verwijderd (sessies blijven bewaard)', 'info');
  }
  return true;
}

// ── Game actions ──────────────────────────────────────────────────────────────
export function addGame(config) {
  const games = data.getGames();
  games.push({ id: data.generateId('g'), ...config });
  data.saveGames(games);
}

export function editGame(id, config) {
  const games = data.getGames();
  const idx = games.findIndex(g => g.id === id);
  if (idx === -1) return;
  games[idx] = { ...games[idx], ...config };
  data.saveGames(games);
}

export function deleteGame(id) {
  const games = data.getGames().filter(g => g.id !== id);
  data.saveGames(games);
}

// ── Public API passed to all screens ─────────────────────────────────────────
export const appAPI = {
  navigate,
  startSession,
  submitRound,
  endSession,
  playAgain,
  abandonSession,
  addPlayer,
  editPlayer,
  deletePlayer,
  addGame,
  editGame,
  deleteGame,
  undoLastRound,
  getData: data,
  getActiveSession: () => activeSession,
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function init() {
  data.seedDefaultData();

  registerHomeScreen(registerScreen);
  registerPlayersScreen(registerScreen);
  registerGamesScreen(registerScreen);
  registerNewSessionScreen(registerScreen);
  registerScoreboardScreen(registerScreen);
  registerEndScreen(registerScreen);
  registerStatsScreen(registerScreen);

  // Restore active session from storage if browser was closed mid-game
  activeSession = data.getActiveSession();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  navigate('home');
}

document.addEventListener('DOMContentLoaded', init);
