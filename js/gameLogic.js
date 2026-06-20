// Pure functions — no DOM, no localStorage.

export function isValidPoints(points, gameConfig) {
  if (typeof points !== 'number' || !Number.isInteger(points) || isNaN(points)) return false;
  if (!gameConfig.allowNegativePoints && points < 0) return false;
  if (gameConfig.maxPointsPerRound !== null && Math.abs(points) > gameConfig.maxPointsPerRound) return false;
  return true;
}

// entries: [{ playerId, points }]
// returns { scores: {...updated map}, pelted: [playerId] }
export function applyRoundEntry(scores, entries, gameConfig) {
  const updated = { ...scores };
  const pelted = [];

  for (const { playerId, points } of entries) {
    updated[playerId] = (updated[playerId] ?? 0) + points;
    // Pelt triggers when a player's score crosses the peltThreshold for the first time
    // We check if the new score >= peltThreshold AND the old score was below it
    const oldScore = scores[playerId] ?? 0;
    if (
      gameConfig.peltThreshold !== null &&
      oldScore < gameConfig.peltThreshold &&
      updated[playerId] >= gameConfig.peltThreshold
    ) {
      pelted.push(playerId);
    }
  }

  return { scores: updated, pelted };
}

// Returns array of playerIds whose running total >= losingScore
export function checkGameOver(scores, gameConfig) {
  return Object.entries(scores)
    .filter(([, score]) => score >= gameConfig.losingScore)
    .map(([playerId]) => playerId);
}

export function buildSessionResult(activeSession, scores) {
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    gameId: activeSession.gameId,
    date: new Date().toISOString(),
    players: activeSession.playerIds.map(playerId => ({
      playerId,
      finalScore: scores[playerId] ?? 0,
    })),
    losers: checkGameOver(scores, { losingScore: Infinity }), // caller passes actual losers
    rounds: activeSession.rounds ?? [],
  };
}
