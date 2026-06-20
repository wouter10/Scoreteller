// DOM rendering helpers. Never reads/writes localStorage directly.
// Screen render functions are registered here and called via renderScreen().

const screenRenderers = {};

export function registerScreen(name, fn) {
  screenRenderers[name] = fn;
}

export function renderScreen(name, props = {}) {
  const app = document.getElementById('app');
  if (!app) return;

  const fn = screenRenderers[name];
  if (!fn) {
    app.innerHTML = `<p style="color:red">Unknown screen: ${name}</p>`;
    return;
  }

  app.innerHTML = '';
  const el = fn(props);
  if (el) {
    el.classList.add('screen-enter');
    app.appendChild(el);
    // Trigger reflow so animation fires
    void el.offsetWidth;
    el.classList.add('screen-visible');
  }
}

export function showPeltAnimation(playerName) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'pelt-overlay';
    overlay.innerHTML = `
      <div class="pelt-content">
        <div class="pelt-emoji">⚠️</div>
        <div class="pelt-text">${escapeHtml(playerName)}</div>
        <div class="pelt-label">staat op PELT!</div>
        <div class="pelt-hint">Tik om door te gaan</div>
      </div>
    `;

    const dismiss = () => {
      overlay.classList.add('pelt-out');
      overlay.addEventListener('animationend', () => {
        overlay.remove();
        resolve();
      }, { once: true });
    };

    overlay.addEventListener('click', dismiss);
    setTimeout(dismiss, 2500);

    document.body.appendChild(overlay);
  });
}

export function showDelta(anchorEl, delta) {
  const badge = document.createElement('div');
  badge.className = `score-delta ${delta > 0 ? 'score-delta--pos' : 'score-delta--neg'}`;
  badge.textContent = (delta > 0 ? '+' : '') + delta;
  anchorEl.style.position = 'relative';
  anchorEl.appendChild(badge);
  badge.addEventListener('animationend', () => badge.remove(), { once: true });
}

export function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 2200);
  });
}

export function createButton(label, variant = 'primary', onClick) {
  const btn = document.createElement('button');
  btn.className = `btn btn--${variant}`;
  btn.innerHTML = label;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of children) {
    if (child == null) continue;
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else node.appendChild(child);
  }
  return node;
}
