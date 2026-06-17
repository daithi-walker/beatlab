/**
 * core/topnav.js — shared topbar nav for all BeatLab apps
 *
 * Usage:
 *   import { initTopnav } from '../core/topnav.js';
 *   initTopnav({ current: 'drums', root: '../' });
 *
 * Config:
 *   current  — which app is active: 'drums' | 'multibank' | 'nectar' | 'synth'
 *   root     — path prefix to beatlab root from this app (default '../')
 *
 * What it does:
 *   1. Injects shared CSS (topbar base, dropdown styles, BL logo button)
 *   2. Prepends the BL logo + app-nav dropdown to #topbar
 *   3. Appends the dropdown menu to <body> (avoids overflow:hidden clipping)
 *   4. Wires open/close and outside-click behaviour
 *
 * Dropdown menu: body-level, position:fixed, z-index:9000
 * App list order and colours are fixed — do not reorder without checking
 * any encoding schemas that depend on app identity (none currently).
 */

const APPS = [
  { id: 'drums',     label: 'Drums',     color: '#39ff6a', path: 'drums/index.html'     },
  { id: 'multibank', label: 'Multibank', color: '#00e5cc', path: 'multibank/index.html' },
  { id: 'synth',     label: 'Synth',     color: '#f5a623', path: 'synth/index.html'     },
  { id: 'nectar',    label: 'Nectar',    color: '#b06fff', path: 'nectar/index.html'    },
];

const CSS = `
  #bl-logo-btn {
    width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
    background: none; border: none; padding: 0; cursor: pointer;
    overflow: hidden; opacity: 0.85; transition: opacity 120ms;
  }
  #bl-logo-btn:hover, #bl-logo-btn.open { opacity: 1; }
  #bl-logo-btn img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 6px; }

  #bl-nav-menu {
    display: none; position: fixed; top: var(--topbar-h, 52px); left: auto;
    min-width: 170px; background: var(--surface, #0e1318);
    border: 1px solid var(--divider, #1a2830);
    border-radius: 8px; z-index: 9000; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    overflow: hidden; flex-direction: column;
  }
  #bl-nav-menu.open { display: flex; }
  .bl-nav-home {
    display: block; padding: 8px 14px 6px;
    font-size: 0.6rem; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--muted, #6a8f80); text-decoration: none;
    transition: color 120ms;
  }
  .bl-nav-home:hover { color: var(--text, #d4e8e0); }
  .bl-nav-divider { height: 1px; background: var(--divider, #1a2830); margin: 2px 0 4px; }
  .bl-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 14px; font-size: 0.72rem; color: var(--text, #d4e8e0);
    text-decoration: none; background: none; border: none;
    font-family: inherit; width: 100%; text-align: left; cursor: pointer;
    transition: background 100ms, color 100ms; white-space: nowrap;
  }
  .bl-nav-item:hover { background: rgba(0,229,204,0.08); color: var(--teal, #00e5cc); }
  .bl-nav-item.active { color: var(--teal, #00e5cc); }
  .bl-nav-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  /* Shared topbar divider — usable by all apps */
  .topbar-divider-v { width: 1px; height: 24px; background: var(--divider, #1a2830); flex-shrink: 0; }

  /* App name label injected by topnav */
  .bl-app-name {
    font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text, #d4e8e0); white-space: nowrap;
    flex-shrink: 0;
  }
  @media (max-width: 600px) { .bl-app-name { display: none; } }
`;

export function initTopnav({ current = '', root = '../', label = '' } = {}) {
  // Inject CSS once
  if (!document.getElementById('bl-topnav-css')) {
    const style = document.createElement('style');
    style.id = 'bl-topnav-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // Build logo button
  const logoBtn = document.createElement('button');
  logoBtn.id = 'bl-logo-btn';
  logoBtn.title = 'BeatLab apps';
  const img = document.createElement('img');
  img.src = root + 'icon.png';
  img.alt = 'BeatLab';
  logoBtn.appendChild(img);

  const divider = document.createElement('div');
  divider.className = 'topbar-divider-v';

  // Build nav menu (body-level to escape overflow clipping)
  const menu = document.createElement('div');
  menu.id = 'bl-nav-menu';

  const homeLink = document.createElement('a');
  homeLink.className = 'bl-nav-home';
  homeLink.href = root + 'index.html';
  homeLink.textContent = 'BeatLab Home';
  menu.appendChild(homeLink);

  const divEl = document.createElement('div');
  divEl.className = 'bl-nav-divider';
  menu.appendChild(divEl);

  APPS.forEach(app => {
    const item = document.createElement('a');
    item.className = 'bl-nav-item' + (app.id === current ? ' active' : '');
    item.href = root + app.path;

    const dot = document.createElement('span');
    dot.className = 'bl-nav-dot';
    dot.style.background = app.color;

    item.appendChild(dot);
    item.appendChild(document.createTextNode(app.label));
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  // Prepend logo [+ name] + divider to #topbar (supports id="topbar", id="top-bar", .topbar)
  const topbar = document.getElementById('topbar')
    || document.getElementById('top-bar')
    || document.querySelector('.topbar');
  if (topbar) {
    topbar.insertBefore(divider, topbar.firstChild);
    if (label) {
      const nameEl = document.createElement('span');
      nameEl.className = 'bl-app-name';
      nameEl.textContent = label;
      topbar.insertBefore(nameEl, topbar.firstChild);
    }
    topbar.insertBefore(logoBtn, topbar.firstChild);
  }

  // Wire open/close
  logoBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = menu.classList.contains('open');
    closeNav();
    if (!isOpen) {
      const rect = logoBtn.getBoundingClientRect();
      menu.style.left = rect.left + 'px';
      menu.classList.add('open');
      logoBtn.classList.add('open');
    }
  });

  function closeNav() {
    menu.classList.remove('open');
    logoBtn.classList.remove('open');
  }

  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#bl-logo-btn') && !e.target.closest('#bl-nav-menu')) closeNav();
  });

  return { closeNav };
}
