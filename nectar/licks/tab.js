import { STRINGS, STRING_NAMES } from '../shared/theory.js';

// Renders a parsed song as SVG tablature, with beat counts underneath and a play cursor.

export const Tab = (() => {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const GUTTER = 30;   // room for string names
  const PAD = 14;      // gap between a bar line and the first note
  const TOP = 34;      // room above the top string for bend labels
  const GAP = 19;      // distance between strings

  function el(name, attrs, parent) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function text(parent, x, y, str, cls) {
    const t = el('text', { x, y, class: cls }, parent);
    t.textContent = str;
    return t;
  }

  const stringY = (s) => TOP + (s - 1) * GAP;
  const BEND_LABEL = { 1: '½', 2: 'full', 3: '1½', 4: '2' };

  function render(container, song, onNoteClick) {
    const HEIGHT = stringY(STRINGS.length) + 34;
    container.innerHTML = '';
    const width = Math.max(320, container.clientWidth);
    const usable = width - GUTTER - 10;
    const minDur = Math.min(...song.events.filter((e) => !e.grace).map((e) => e.dur));
    const isWhole = (v) => Math.abs(v - Math.round(v)) < 1e-6;
    const triplets = song.events.some((e) => isWhole(e.dur * 3) && !isWhole(e.dur * 2));

    const barsTotal = song.loopBeats / 4;
    const idealBeatPx = Math.max(56, 28 / minDur);
    let barsPerRow = Math.min(barsTotal, Math.max(1, Math.floor(usable / (idealBeatPx * 4))));
    const rowCount = Math.ceil(barsTotal / barsPerRow);
    barsPerRow = Math.ceil(barsTotal / rowCount);
    const ppb = usable / (barsPerRow * 4);
    const rowBeats = barsPerRow * 4;
    const xOf = (localBeat) => GUTTER + localBeat * ppb + PAD;

    const layout = { rows: [], events: [], ppb, current: -1 };

    for (let r = 0; r < rowCount; r++) {
      const svg = el('svg', { class: 'tab-row', width, height: HEIGHT, viewBox: `0 0 ${width} ${HEIGHT}` });
      container.appendChild(svg);
      const bars = Math.min(barsPerRow, barsTotal - r * barsPerRow);
      const right = GUTTER + bars * 4 * ppb;

      for (const s of STRINGS) {
        el('line', { x1: GUTTER, x2: right, y1: stringY(s), y2: stringY(s), class: 'tline' }, svg);
        text(svg, 12, stringY(s) + 4, STRING_NAMES[s], 'tname');
      }
      for (let b = 0; b <= bars; b++) {
        const x = GUTTER + b * 4 * ppb;
        el('line', { x1: x, x2: x, y1: stringY(1), y2: stringY(STRINGS.length), class: 'tbar' }, svg);
      }

      // Beat counts: "1 & 2 &" or "1 trip let" for triplet licks.
      const sub = triplets ? 3 : 2;
      const subLabels = triplets ? ['', 'tri', 'let'] : ['', '&'];
      for (let k = 0; k < bars * 4 * sub; k++) {
        const b = k / sub;
        const main = k % sub === 0;
        text(svg, xOf(b), stringY(STRINGS.length) + 26, main ? String((Math.round(b) % 4) + 1) : subLabels[k % sub],
          main ? 'tcount' : 'tcount sub');
      }

      const cursor = el('line', { x1: 0, x2: 0, y1: stringY(1) - 12, y2: stringY(STRINGS.length) + 12, class: 'tcursor' }, svg);
      layout.rows.push({ svg, cursor });
    }

    const prev = {}; // string -> { x, row, fret }
    song.events.forEach((ev, i) => {
      const row = Math.floor(ev.beat / rowBeats + 1e-9);
      // Grace notes sit small, just before their main note.
      const x = xOf(ev.beat - row * rowBeats) - (ev.grace ? 17 : 0);
      const svg = layout.rows[row].svg;
      const g = el('g', { class: 'tev' }, svg);
      layout.events.push({ row, x, g, dur: ev.dur });
      if (!ev.notes.length) return;

      g.addEventListener('click', () => onNoteClick(i));
      for (const n of ev.notes) {
        const y = stringY(n.string);
        const label = String(n.fret);
        const w = label.length * (ev.grace ? 6 : 8) + 6;
        el('rect', { x: x - w / 2, y: y - 8, width: w, height: 16, rx: 3, class: 'tbg' }, g);
        text(g, x, y + 4, label, ev.grace ? 'tnum grace' : 'tnum');

        const p = prev[n.string];
        if (n.tech) {
          let mark = n.tech;
          if (mark === '/' && p && n.fret < p.fret) mark = '\\';
          const mx = p && p.row === row ? (p.x + x) / 2 : x - 14;
          text(svg, mx, y - 6, mark, 'ttech');
        }
        let after = x + 8;
        if (n.bend) {
          el('path', { d: `M${x + 7} ${y} Q${x + 17} ${y} ${x + 17} ${y - 15}`, class: 'tbend' }, g);
          el('path', { d: `M${x + 13.5} ${y - 11} L${x + 17} ${y - 17} L${x + 20.5} ${y - 11}`, class: 'tbend head' }, g);
          text(g, x + 17, y - 20, BEND_LABEL[n.bend] || `${n.bend}`, 'tbendlabel');
          after = x + 22;
        }
        if (n.vibrato) text(g, after + 4, y + 4, '~~', 'tvib');
        prev[n.string] = { x, row, fret: n.fret };
      }
    });

    return layout;
  }

  function highlight(layout, i) {
    if (!layout) return;
    if (layout.current >= 0) layout.events[layout.current]?.g.classList.remove('on');
    layout.current = i;
    if (i >= 0) layout.events[i].g.classList.add('on');
  }

  function cursor(layout, i, progress = 0) {
    if (!layout) return;
    layout.rows.forEach((r) => r.cursor.classList.remove('show'));
    if (i < 0) return;
    const e = layout.events[i];
    const x = e.x + progress * e.dur * layout.ppb;
    const c = layout.rows[e.row].cursor;
    c.setAttribute('x1', x);
    c.setAttribute('x2', x);
    c.classList.add('show');
  }

  return { render, highlight, cursor };
})();
