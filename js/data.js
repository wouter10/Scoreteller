// All localStorage reads/writes go through this module exclusively.
const KEYS = {
  players: 'scoreteller_players',
  games: 'scoreteller_games',
  sessions: 'scoreteller_sessions',
  activeSession: 'scoreteller_active_session',
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getPlayers() { return read(KEYS.players) ?? []; }
export function savePlayers(arr) { write(KEYS.players, arr); }

export function getGames() { return read(KEYS.games) ?? []; }
export function saveGames(arr) { write(KEYS.games, arr); }

export function getSessions() { return read(KEYS.sessions) ?? []; }
export function saveSessions(arr) { write(KEYS.sessions, arr); }

export function getActiveSession() { return read(KEYS.activeSession); }
export function saveActiveSession(s) { write(KEYS.activeSession, s); }
export function clearActiveSession() { localStorage.removeItem(KEYS.activeSession); }

export const PLAYER_COLORS = [
  '#f5c542',
  '#e8534a',
  '#4ade80',
  '#60a5fa',
  '#f97316',
  '#a78bfa',
  '#f472b6',
  '#22d3ee',
];

export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function seedDefaultData() {
  const games = getGames();
  if (games.length === 0) {
    saveGames([{
      id: 'g_toepen',
      name: 'Toepen',
      losingScore: 15,
      peltThreshold: 14,
      maxPointsPerRound: null,
      allowNegativePoints: true,
    }]);
  }
}
