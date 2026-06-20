import { el, createButton } from '../ui.js';
import * as data from '../data.js';

export function registerHomeScreen(registerScreen) {
  registerScreen('home', renderHome);
}

function renderHome({ app }) {
  const active = data.getActiveSession();
  const players = data.getPlayers();
  const sessions = data.getSessions();
  const games = data.getGames();

  const screen = el('div', { class: 'screen home-screen' });

  // Header
  screen.appendChild(el('div', { class: 'home-header' },
    el('div', { class: 'home-logo' }, '🃏'),
    el('h1', { class: 'home-title' }, 'Scoreteller'),
    el('p', { class: 'home-subtitle' }, 'Bijhoud app voor kaartspellen'),
  ));

  // Resume banner
  if (active) {
    const game = games.find(g => g.id === active.gameId);
    const resumeCard = el('div', { class: 'card resume-card' },
      el('div', { class: 'resume-info' },
        el('span', { class: 'resume-icon' }, '▶️'),
        el('div', {},
          el('div', { class: 'resume-title' }, 'Lopende sessie'),
          el('div', { class: 'resume-meta' }, game ? game.name : 'Onbekend spel'),
        ),
      ),
      createButton('Doorgaan', 'primary', () => app.navigate('scoreboard')),
    );
    screen.appendChild(resumeCard);
  }

  // Quick stats
  const statsBar = el('div', { class: 'stats-bar' },
    el('div', { class: 'stat-chip' },
      el('span', { class: 'stat-value' }, String(players.length)),
      el('span', { class: 'stat-label' }, 'Spelers'),
    ),
    el('div', { class: 'stat-chip' },
      el('span', { class: 'stat-value' }, String(sessions.length)),
      el('span', { class: 'stat-label' }, 'Sessies'),
    ),
    el('div', { class: 'stat-chip' },
      el('span', { class: 'stat-value' }, String(games.length)),
      el('span', { class: 'stat-label' }, 'Spellen'),
    ),
  );
  screen.appendChild(statsBar);

  // Main actions
  const mainActions = el('div', { class: 'main-actions' });

  if (players.length < 2) {
    const notice = el('div', { class: 'card notice-card' },
      el('p', {}, '👥 Voeg minimaal 2 spelers toe om een sessie te starten.'),
    );
    mainActions.appendChild(notice);
  }

  const startBtn = createButton('🎮 Nieuwe Sessie Starten', 'primary', () => app.navigate('newSession'));
  startBtn.className = 'btn btn--primary btn--large';
  if (players.length < 2) startBtn.disabled = true;
  mainActions.appendChild(startBtn);

  screen.appendChild(mainActions);

  // Nav grid
  const navGrid = el('div', { class: 'nav-grid' },
    navCard('👥', 'Spelers', 'Beheer je spelers', () => app.navigate('players')),
    navCard('🎮', 'Spellen', 'Voeg spellen toe of bewerk ze', () => app.navigate('games')),
    navCard('📊', 'Statistieken', 'Bekijk scores & history', () => app.navigate('stats')),
  );
  screen.appendChild(navGrid);

  return screen;
}

function navCard(icon, title, desc, onClick) {
  const card = el('button', { class: 'nav-card', onclick: onClick },
    el('span', { class: 'nav-card-icon' }, icon),
    el('span', { class: 'nav-card-title' }, title),
    el('span', { class: 'nav-card-desc' }, desc),
  );
  return card;
}
