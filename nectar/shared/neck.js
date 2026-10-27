// Nectar shared guitar neck (SVG). Every Nectar page draws its fretboard with this.
//
//   const neck = new Neck(container, { frets: 21, interaction: 'strum', onPluck: (note) => {...} });
//   neck.setLayer('scale', dots);     // dots: [{ string, fret, size, fill, stroke, opacity, label, labelColor, labelSize, glow }]
//   neck.setBox([5, 8]);              // dashed frame around a hand position (or null)
//   neck.setMuted([6]);               // X markers left of the nut
//   neck.setActive(notes, labelFn);   // the note(s) sounding now (gold, glowing)
//   neck.setNext(notes);              // the note(s) coming next (teal ring)
//   neck.flash(note);                 // expanding ring, e.g. when a note is plucked
//
// Notes are { string, fret } with string 1 = the top line of tab (see theory.js), drawn on top. interaction: 'strum' (press/drag across strings plays each, tap plays nearest),
// 'tap' (click plays/toggles nearest via onTap), or 'none'.

import { STRINGS, STRING_NAMES, OPEN_MIDI, FRET_COUNT, INSTRUMENT, onTuningChange } from './theory.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const W = 1240;
const NUT_X = 70, RIGHT = W - 16;
const TOP = 36, GAP = 30;
const OPEN_X = NUT_X - 30;
const SIZES = { xs: 3.5, sm: 7, md: 10, label: 11, lg: 13 };
const LAYERS = ['box', 'ghost', 'scale', 'foot', 'main', 'mute', 'next', 'active', 'rings'];

const CSS = `
  .nk-wrap { width: 100%; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
  .nk { width: 100%; min-width: 760px; display: block; user-select: none; -webkit-user-select: none; }
  @media (pointer: coarse) { .nk { min-width: var(--nk-touch-width, 1100px); } }
  .nk .fret { stroke: #b9b2a6; stroke-width: 2.4; }
  .nk .nut { fill: #d4a84a; }
  .nk .string { stroke: #d4cdbf; opacity: 0.85; }
  .nk .inlay { fill: #e8dcc4; opacity: 0.18; }
  .nk .fnum { fill: #7e6f5d; font: 11px Inter, system-ui, sans-serif; text-anchor: middle; }
  .nk .fnum.mark { fill: #bba98f; font-weight: 600; }
  .nk .sname { fill: #d8d4c8; font: 700 13px Inter, system-ui, sans-serif; text-anchor: middle; }
  .nk .boxframe { fill: rgba(255, 191, 71, 0.05); stroke: rgba(255, 191, 71, 0.35); stroke-dasharray: 4 4; }
  .nk .dlabel { font: 700 9px Inter, system-ui, sans-serif; text-anchor: middle; pointer-events: none; }
  .nk .mute line { stroke: #9a8d7a; stroke-width: 1.8; }
  .nk .next { fill: none; stroke: #5fd4c4; stroke-width: 3; }
  .nk .bend { fill: #ffcf6b; font: 700 11px Inter, system-ui, sans-serif; text-anchor: middle; }
  .nk .ring { fill: none; stroke: #ffcf6b; stroke-width: 1.5; transform-box: fill-box; transform-origin: center;
              animation: nk-ring 0.6s ease-out forwards; pointer-events: none; }
  @keyframes nk-ring { from { transform: scale(1); opacity: 0.8; } to { transform: scale(2.4); opacity: 0; } }
`;

function el(name, attrs, parent) {
  const e = document.createElementNS(SVGNS, name);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function text(parent, x, y, str, cls, fill) {
  const t = el('text', { x, y, class: cls, fill }, parent);
  t.textContent = str;
  return t;
}

export class Neck {
  constructor(container, { frets = FRET_COUNT, interaction = 'none', onPluck = null, onTap = null } = {}) {
    if (!document.getElementById('nk-css')) {
      const style = document.createElement('style');
      style.id = 'nk-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    this.frets = frets;
    this.onPluck = onPluck;
    this.onTap = onTap;
    this.id = 'nk'; // one neck per page

    // Real fret spacing (each fret ~5.6% narrower), scaled to fit.
    this.L = (RIGHT - NUT_X) / (1 - Math.pow(2, -frets / 12));

    const wrap = document.createElement('div');
    wrap.className = 'nk-wrap';
    container.appendChild(wrap);
    const svg = (this.svg = el('svg', { class: 'nk' }, wrap));
    svg.neck = this; // lets tests/devtools ask the neck for positions
    svg.style.setProperty('--nk-touch-width', `${Math.round(frets * 52)}px`);
    this.drawDefs();
    this.base = el('g', {}, svg);
    this.layers = {};
    for (const name of LAYERS) this.layers[name] = el('g', { class: `layer-${name}` }, svg);
    this.drawBase();
    // Tuning changes relabel the strings (and later may change their number). The page
    // redraws its own dots via its own onTuningChange handler.
    onTuningChange(() => this.drawBase());
    if (interaction !== 'none') this.bindPointer(interaction);
  }

  wireX(f) { return NUT_X + this.L * (1 - Math.pow(2, -f / 12)); }
  noteX(f) { return f === 0 ? OPEN_X : (this.wireX(f - 1) + this.wireX(f)) / 2; }
  stringY(s) { return TOP + (s - 1) * GAP; }

  get bottomY() { return this.stringY(STRINGS.length); }
  get boardH() { return GAP * (STRINGS.length - 1) + 30; }

  drawDefs() {
    const defs = el('defs', {}, this.svg);
    const grad = el('linearGradient', { id: `${this.id}-wood`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0%', 'stop-color': '#3a2414' }, grad);
    el('stop', { offset: '50%', 'stop-color': '#2c1b0d' }, grad);
    el('stop', { offset: '100%', 'stop-color': '#22140a' }, grad);
    const glow = el('filter', { id: `${this.id}-glow`, x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs);
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 4, result: 'b' }, glow);
    const merge = el('feMerge', {}, glow);
    el('feMergeNode', { in: 'b' }, merge);
    el('feMergeNode', { in: 'SourceGraphic' }, merge);
  }

  // Wood, frets, inlays, strings and labels, sized from the current instrument + tuning.
  drawBase() {
    const g = this.base;
    g.replaceChildren();
    this.svg.setAttribute('viewBox', `0 0 ${W} ${this.bottomY + 50}`);
    el('rect', { x: NUT_X, y: TOP - 15, width: RIGHT - NUT_X, height: this.boardH, fill: `url(#${this.id}-wood)`, rx: 2 }, g);
    const inlays = INSTRUMENT.inlays.filter((f) => f <= this.frets);
    const doubles = INSTRUMENT.doubleInlays.filter((f) => f <= this.frets);
    const midY = (TOP + this.bottomY) / 2;
    for (const f of inlays) el('circle', { cx: this.noteX(f), cy: midY, r: 6.5, class: 'inlay' }, g);
    for (const f of doubles) for (const dy of [-GAP, GAP]) el('circle', { cx: this.noteX(f), cy: midY + dy, r: 6.5, class: 'inlay' }, g);
    for (let f = 1; f <= this.frets; f++) {
      el('line', { x1: this.wireX(f), x2: this.wireX(f), y1: TOP - 15, y2: this.bottomY + 15, class: 'fret' }, g);
      const marked = inlays.includes(f) || doubles.includes(f);
      text(g, this.noteX(f), this.bottomY + 36, String(f), marked ? 'fnum mark' : 'fnum');
    }
    el('rect', { x: NUT_X - 5, y: TOP - 15, width: 7, height: this.boardH, class: 'nut' }, g);
    for (const s of STRINGS) {
      // Gauge by pitch: the lower the open note, the thicker the string.
      const thicker = STRINGS.filter((o) => OPEN_MIDI[o] > OPEN_MIDI[s]).length;
      el('line', { x1: NUT_X - 50, x2: RIGHT, y1: this.stringY(s), y2: this.stringY(s), class: 'string', 'stroke-width': 0.9 + thicker * 0.42 }, g);
      text(g, 12, this.stringY(s) + 4.5, STRING_NAMES[s], 'sname');
    }
  }

  clear(layer) { this.layers[layer].replaceChildren(); }

  drawDot(parent, d) {
    const r = typeof d.size === 'number' ? d.size : SIZES[d.size || 'md'];
    const x = this.noteX(d.fret), y = this.stringY(d.string);
    const g = el('g', { opacity: d.opacity ?? 1 }, parent);
    el('circle', {
      cx: x, cy: y, r,
      fill: d.fill ?? 'none', stroke: d.stroke, 'stroke-width': d.strokeWidth ?? (d.stroke ? 1.2 : null),
      filter: d.glow ? `url(#${this.id}-glow)` : null,
    }, g);
    if (d.label) {
      const t = text(g, x, y + (d.labelSize ?? 9) * 0.35, d.label, 'dlabel', d.labelColor ?? '#07080d');
      if (d.labelSize) t.style.fontSize = `${d.labelSize}px`;
    }
    return g;
  }

  // Replace a whole layer of dots. Dot layers: ghost, scale, foot, main (see LAYERS for draw order).
  setLayer(layer, dots) {
    this.clear(layer);
    for (const d of dots) this.drawDot(this.layers[layer], d);
  }

  setBox(range) {
    this.clear('box');
    if (!range) return;
    const [lo, hi] = range;
    const left = (lo === 0 ? NUT_X - 50 : this.wireX(lo - 1)) + 2;
    el('rect', { x: left, y: TOP - 20, width: this.wireX(hi) - left - 2, height: this.boardH + 10, rx: 10, class: 'boxframe' }, this.layers.box);
  }

  setMuted(strings) {
    this.clear('mute');
    for (const s of strings) {
      const g = el('g', { class: 'mute' }, this.layers.mute);
      const y = this.stringY(s), r = 5;
      el('line', { x1: OPEN_X - r, y1: y - r, x2: OPEN_X + r, y2: y + r }, g);
      el('line', { x1: OPEN_X + r, y1: y - r, x2: OPEN_X - r, y2: y + r }, g);
    }
  }

  setActive(notes, labelFn = null) {
    this.clear('active');
    for (const n of notes) {
      const g = this.drawDot(this.layers.active, { ...n, size: 'lg', fill: '#ffcf6b', glow: true, label: labelFn?.(n) ?? null });
      if (n.bend) text(g, this.noteX(n.fret), this.stringY(n.string) - 20, n.bend === 2 ? '↑ full' : '↑ ½', 'bend');
    }
  }

  setNext(notes) {
    this.clear('next');
    for (const n of notes) el('circle', { cx: this.noteX(n.fret), cy: this.stringY(n.string), r: 15, class: 'next' }, this.layers.next);
  }

  flash(note) {
    const c = el('circle', { cx: this.noteX(note.fret), cy: this.stringY(note.string), r: 13, class: 'ring' }, this.layers.rings);
    c.addEventListener('animationend', () => c.remove());
  }

  // ---- hit testing (SVG user units)
  toLocal(e) {
    const p = this.svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(this.svg.getScreenCTM().inverse());
  }

  stringAt(y) {
    const s = Math.round((y - TOP) / GAP) + 1;
    return s >= 1 && s <= STRINGS.length && Math.abs(y - this.stringY(s)) < GAP * 0.45 ? s : null;
  }

  fretAt(x) {
    if (x < NUT_X - 50 || x > RIGHT) return null;
    if (x < NUT_X) return 0;
    for (let f = 1; f <= this.frets; f++) if (x < this.wireX(f)) return f;
    return null;
  }

  nearest(x, y) {
    let best = null, bestD = 18;
    for (const s of STRINGS) {
      for (let f = 0; f <= this.frets; f++) {
        const d = Math.hypot(x - this.noteX(f), y - this.stringY(s));
        if (d < bestD) { bestD = d; best = { string: s, fret: f }; }
      }
    }
    return best;
  }

  bindPointer(mode) {
    const svg = this.svg;
    svg.style.touchAction = mode === 'strum' ? 'none' : 'manipulation';
    svg.style.cursor = 'pointer';
    let down = false, plucked = false, last = null;

    const strumAt = (p) => {
      const s = this.stringAt(p.y), f = this.fretAt(p.x);
      if (s === null || f === null) return;
      const key = `${s}:${f}`;
      if (key === last) return;
      last = key;
      plucked = true;
      this.onPluck?.({ string: s, fret: f });
    };

    svg.addEventListener('pointerdown', (e) => {
      down = true;
      plucked = false;
      last = null;
      svg.setPointerCapture(e.pointerId);
      if (mode === 'strum') strumAt(this.toLocal(e));
    });
    svg.addEventListener('pointermove', (e) => {
      if (down && mode === 'strum') strumAt(this.toLocal(e));
    });
    const end = (e) => {
      if (!down) return;
      down = false;
      if (e.type === 'pointercancel' || plucked) return;
      const p = this.toLocal(e);
      const hit = this.nearest(p.x, p.y);
      if (!hit) return;
      if (mode === 'tap') this.onTap?.(hit);
      else this.onPluck?.(hit);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }
}

// ---- dot builders shared by pages

// Faint hollow dot on every position: signals "the whole neck is playable".
export function ghostDots(frets = FRET_COUNT, opacity = 0.18) {
  const out = [];
  for (const string of STRINGS) for (let fret = 0; fret <= frets; fret++) {
    out.push({ string, fret, size: 'xs', stroke: 'rgba(255,255,255,0.6)', strokeWidth: 1, opacity });
  }
  return out;
}
