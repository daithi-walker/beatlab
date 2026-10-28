import { STRINGS, STRING_NAMES } from './theory.js';

// Renders a parsed song as SVG tablature, with beat counts underneath and a play cursor.
// Injects its own styles (uses the page's Nectar CSS variables).

const CSS = `
.tab { width: 100%; }
.tab-row { display: block; }
.tline { stroke: #6d5d4b; stroke-width: 1; }
.tbar { stroke: #8e7c66; stroke-width: 1.4; }
.tname { fill: var(--muted); font: 12px var(--mono); text-anchor: middle; }
.tbg { fill: var(--panel); }
.tnum { fill: var(--text); font: 600 13.5px var(--mono); text-anchor: middle; }
.tnum.grace { font-size: 10.5px; fill: #c9bfae; }
.tev { cursor: pointer; }
.tev:hover .tbg { fill: #3a2e22; }
.tev.on .tbg { fill: var(--accent); }
.tev.on .tnum { fill: var(--accent-ink); }
.ttech { fill: #e0b872; font: italic 11px var(--serif); text-anchor: middle; }
.tbend { fill: none; stroke: #e0b872; stroke-width: 1.3; }
.tbendlabel { fill: #e0b872; font: 10px var(--sans); text-anchor: middle; }
.tvib { fill: #e0b872; font: 12px var(--mono); }
.tcount { fill: #9d8c77; font: 600 11px var(--sans); text-anchor: middle; }
.tcount.sub { fill: #6c5e4e; font-weight: 400; font-size: 10px; }
.tcursor { stroke: var(--accent); stroke-width: 2; opacity: 0; }
.tcursor.show { opacity: 0.55; }
.tab-row.editable { cursor: crosshair; }
.trest { fill: var(--muted); font: 600 13px var(--mono); text-anchor: middle; opacity: 0.6; }
.tchord { fill: var(--accent); font: 700 13px var(--sans); text-anchor: middle; }
.tstrum { fill: #e0b872; font: 700 15px var(--sans); text-anchor: middle; }
.tmark { fill: var(--root); font: 700 9.5px var(--sans); letter-spacing: 0.12em; text-transform: uppercase; }
.tev.on .tstrum { fill: var(--accent); }
.tlyric { fill: var(--text); font: 13px var(--sans); }
.tsel { fill: rgba(255, 207, 107, 0.18); stroke: var(--accent); stroke-width: 1.5; rx: 4; pointer-events: none; }
`;

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

  // opts.editable: rests are drawn, and clicking anywhere calls opts.onPick(eventIndex, string),
  // where eventIndex === song.events.length means "after the last beat" (append).
  function render(container, song, onNoteClick, opts = {}) {
    if (!document.getElementById('tab-css')) {
      const style = document.createElement('style');
      style.id = 'tab-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const lyrics = song.events.some((e) => e.lyric);
    const HEIGHT = stringY(STRINGS.length) + (lyrics ? 54 : 34);
    container.innerHTML = '';
    const width = Math.max(320, container.clientWidth);
    const usable = width - GUTTER - 10;
    const minDur = Math.min(...song.events.filter((e) => !e.grace).map((e) => e.dur));
    const isWhole = (v) => Math.abs(v - Math.round(v)) < 1e-6;
    const triplets = song.events.some((e) => isWhole(e.dur * 3) && !isWhole(e.dur * 2));

    const bpb = song.beatsPerBar || 4;
    const barsTotal = song.loopBeats / bpb;
    const idealBeatPx = Math.max(56, 28 / minDur);
    let barsPerRow = Math.min(barsTotal, Math.max(1, Math.floor(usable / (idealBeatPx * bpb))));
    const rowCount = Math.ceil(barsTotal / barsPerRow);
    barsPerRow = Math.ceil(barsTotal / rowCount);
    const ppb = usable / (barsPerRow * bpb);
    const rowBeats = barsPerRow * bpb;
    const xOf = (localBeat) => GUTTER + localBeat * ppb + PAD;

    const layout = { rows: [], events: [], ppb, current: -1, append: null, sel: null };

    for (let r = 0; r < rowCount; r++) {
      const svg = el('svg', { class: opts.editable ? 'tab-row editable' : 'tab-row', width, height: HEIGHT, viewBox: `0 0 ${width} ${HEIGHT}` });
      container.appendChild(svg);
      const bars = Math.min(barsPerRow, barsTotal - r * barsPerRow);
      const right = GUTTER + bars * bpb * ppb;

      for (const s of STRINGS) {
        el('line', { x1: GUTTER, x2: right, y1: stringY(s), y2: stringY(s), class: 'tline' }, svg);
        text(svg, 12, stringY(s) + 4, STRING_NAMES[s], 'tname');
      }
      for (let b = 0; b <= bars; b++) {
        const x = GUTTER + b * bpb * ppb;
        el('line', { x1: x, x2: x, y1: stringY(1), y2: stringY(STRINGS.length), class: 'tbar' }, svg);
      }

      // Beat counts: "1 & 2 &" or "1 trip let" for triplet licks.
      const sub = triplets ? 3 : 2;
      const subLabels = triplets ? ['', 'tri', 'let'] : ['', '&'];
      for (let k = 0; k < bars * bpb * sub; k++) {
        const b = k / sub;
        const main = k % sub === 0;
        text(svg, xOf(b), stringY(STRINGS.length) + 26, main ? String((Math.round(b) % bpb) + 1) : subLabels[k % sub],
          main ? 'tcount' : 'tcount sub');
      }

      const cursor = el('line', { x1: 0, x2: 0, y1: stringY(1) - 12, y2: stringY(STRINGS.length) + 12, class: 'tcursor' }, svg);
      layout.rows.push({ svg, cursor, right });
      if (opts.editable) svg.addEventListener('click', (e) => pick(layout, r, svg, e, opts.onPick));
    }

    const prev = {}; // string -> { x, row, fret }
    let lastChord = null;
    song.events.forEach((ev, i) => {
      const row = Math.floor(ev.beat / rowBeats + 1e-9);
      // Grace notes sit small, just before their main note.
      const x = xOf(ev.beat - row * rowBeats) - (ev.grace ? 17 : 0);
      const svg = layout.rows[row].svg;
      const g = el('g', { class: 'tev' }, svg);
      layout.events.push({ row, x, g, dur: ev.dur });
      if (ev.marker) text(svg, x - 6, 8, ev.marker, 'tmark');
      if (ev.lyric) text(svg, x - 4, stringY(STRINGS.length) + 46, ev.lyric, 'tlyric');
      if (ev.chord) {
        // Chord strum: the name when it changes, and a down/up arrow across the strings.
        if (ev.chord !== lastChord || ev.marker) text(g, x, stringY(1) - 10, ev.chord, 'tchord');
        lastChord = ev.chord;
        text(g, x, (stringY(1) + stringY(STRINGS.length)) / 2 + 5, ev.strum === 'u' ? '↑' : '↓', 'tstrum');
        if (!opts.editable) g.addEventListener('click', () => onNoteClick(i));
        return;
      }
      if (!ev.notes.length) {
        if (opts.editable) text(g, x, (stringY(1) + stringY(STRINGS.length)) / 2 + 4, '–', 'trest');
        return;
      }

      if (!opts.editable) g.addEventListener('click', () => onNoteClick(i));
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

    // Where a new beat would go: just after the last one (or the start of an empty song).
    const end = song.events.length ? song.events[song.events.length - 1].beat + song.events[song.events.length - 1].dur : 0;
    const arow = Math.min(rowCount - 1, Math.floor(end / rowBeats + 1e-9));
    layout.append = { row: arow, x: Math.min(xOf(end - arow * rowBeats), layout.rows[arow].right - 8) };
    return layout;
  }

  function pick(layout, r, svg, e, onPick) {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(svg.getScreenCTM().inverse());
    const string = Math.min(STRINGS.length, Math.max(1, Math.round((q.y - TOP) / GAP) + 1));
    let best = -1, bestD = Infinity;
    layout.events.forEach((ev, i) => {
      const d = Math.abs(ev.x - q.x);
      if (ev.row === r && d < bestD) { bestD = d; best = i; }
    });
    if (layout.append.row === r && Math.abs(layout.append.x - q.x) < bestD) best = layout.events.length;
    if (best >= 0) onPick(best, string);
  }

  // Edit cursor: a box on event i (or the append position), string s.
  function select(layout, i, s) {
    layout.sel?.remove();
    const pos = i < layout.events.length ? layout.events[i] : layout.append;
    const y = stringY(s);
    layout.sel = el('rect', { x: pos.x - 12, y: y - 10, width: 24, height: 20, class: 'tsel' }, layout.rows[pos.row].svg);
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

  return { render, highlight, cursor, select };
})();
