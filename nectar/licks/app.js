// Nectar Licks: wires the library, transport, tab and fretboard together.

import { NOTE_NAMES, SCALES, INSTRUMENT, TUNING, INSTRUMENTS, INTERVAL_SYMBOLS, midiOf, noteName, degree, positionsInScale, onTuningChange } from '../shared/theory.js';
import { setupAudio } from '../shared/audio-ui.js';
import { setupInstrument } from '../shared/instrument-ui.js';
import { Player } from '../shared/player.js';
import { Neck } from '../shared/neck.js';
import { buildSong } from './notation.js';
import { LICKS } from './licks-data.js';
import { Tab } from './tab.js';

{
  const $ = (id) => document.getElementById(id);
  const STYLE_ORDER = ['Foundation', 'Blues', 'Rock', 'Country', 'Melody', 'Technique', 'Bass', 'Ukulele'];
  const LEVELS = ['', 'Beginner', 'Intermediate', 'Advanced'];

  const defaults = {
    lickId: LICKS[0].id, speed: 100, loop: true, countIn: true, metro: false,
    trainer: false, neck: 'box', labels: 'notes', graceLen: 200,
  };
  const state = { ...defaults, ...JSON.parse(localStorage.getItem('nectar-licks') || '{}') };
  const save = () => localStorage.setItem('nectar-licks', JSON.stringify(state));

  const synth = setupAudio();
  const instrument = setupInstrument();
  const player = new Player(synth);
  player.graceSec = state.graceLen / 1000;
  const neck = new Neck($('fretboard'), {
    maxFrets: 17,
    interaction: 'strum',
    onPluck: (note) => {
      synth.audition([note]);
      neck.flash(note);
    },
  });
  let lick, song, layout;

  const bpm = () => Math.round((lick.bpm * state.speed) / 100);

  function positionLabel(l) {
    const [lo, hi] = l.position;
    return lo === 0 ? `open position, frets 0-${hi}` : `frets ${lo}-${hi}`;
  }

  // The topbar Instrument select filters the library; a lick's own field picks its tuning.
  const lickInstrument = (l) => l.instrument || 'guitar';
  const licksForInstrument = () => LICKS.filter((l) => lickInstrument(l) === INSTRUMENT.id);

  function renderLibrary() {
    const lib = $('library');
    lib.innerHTML = '';
    const mine = licksForInstrument();
    if (!mine.length) {
      const p = document.createElement('p');
      p.className = 'lib-empty';
      p.textContent = `No ${INSTRUMENT.name} licks yet.`;
      lib.appendChild(p);
    }
    for (const style of STYLE_ORDER) {
      const items = mine.filter((l) => l.style === style);
      if (!items.length) continue;
      const h = document.createElement('h4');
      h.textContent = style;
      lib.appendChild(h);
      for (const l of items) {
        const b = document.createElement('button');
        b.className = 'lick-item';
        b.dataset.id = l.id;
        b.innerHTML = `<span class="t"></span><span class="m"><span class="k"></span><span class="lvl">${'●'.repeat(l.level)}${'○'.repeat(3 - l.level)}</span></span>`;
        b.querySelector('.t').textContent = l.title;
        b.querySelector('.k').textContent = `${NOTE_NAMES[l.root]} ${SCALES[l.scale].name}`;
        b.addEventListener('click', () => selectLick(l.id));
        lib.appendChild(b);
      }
    }
  }

  // Empty state for instruments that have no licks yet.
  function showNoLicks() {
    lick = song = null;
    $('main').classList.add('no-licks');
    $('lick-style').textContent = 'Licks';
    $('lick-title').textContent = `No ${INSTRUMENT.name} licks yet`;
    const others = Object.keys(INSTRUMENTS).filter((id) => LICKS.some((l) => lickInstrument(l) === id));
    $('lick-chips').textContent = `Try ${others.map((id) => INSTRUMENTS[id].name).join(', ')} from the Instrument menu.`;
  }

  function selectLick(id) {
    player.stop();
    const mine = licksForInstrument();
    if (!mine.length) return showNoLicks();
    $('main').classList.remove('no-licks');
    lick = mine.find((l) => l.id === id) || mine[0];
    state.lickId = lick.id;
    save();
    song = null; // the tuning switch below re-renders; skip that until the new song is built
    instrument.lockTuning(lick.tuning || 'standard');
    song = buildSong(lick);
    player.load(song);

    document.querySelectorAll('.lick-item').forEach((b) => b.classList.toggle('active', b.dataset.id === lick.id));
    $('lick-style').textContent = `${lick.style} · ${LEVELS[lick.level]}`;
    $('lick-title').textContent = lick.title;
    const chips = [
      `Key of ${NOTE_NAMES[lick.root]}`,
      `${NOTE_NAMES[lick.root]} ${SCALES[lick.scale].name}`,
      positionLabel(lick),
      `${lick.bpm} BPM target`,
    ];
    if (INSTRUMENT.id !== 'guitar') chips.push(INSTRUMENT.name);
    if (TUNING.id !== 'standard') chips.push(`${TUNING.name} tuning`);
    if (lick.swing) chips.push('Swing feel');
    $('lick-chips').innerHTML = '';
    for (const c of chips) {
      const s = document.createElement('span');
      s.className = 'chip';
      s.textContent = c;
      $('lick-chips').appendChild(s);
    }
    $('lick-about').textContent = lick.about;
    $('lick-theory').textContent = lick.theory;
    $('lick-practice').textContent = lick.practice;

    syncSpeed();
    $('grace-ctl').hidden = !song.events.some((e) => e.grace);
    renderTab();
    renderBoard();
  }

  function renderTab() {
    layout = Tab.render($('tab'), song, audition);
  }

  // Label for a note on the neck, per the Notes / Intervals / Frets toggle.
  const labelFor = (n) => {
    const midi = midiOf(n);
    if (state.labels === 'intervals') return INTERVAL_SYMBOLS[degree(midi, lick.root)];
    if (state.labels === 'notes') return noteName(midi);
    return String(n.fret);
  };

  function renderBoard() {
    const [lo, hi] = lick.position;
    const box = state.neck === 'box';
    const dots = positionsInScale(lick.root, SCALES[lick.scale].intervals, neck.frets)
      .filter((p) => !box || (p.fret >= lo && p.fret <= hi))
      .map((p) => ({
        ...p,
        size: 'label',
        fill: p.degree === 0 ? '#ff9d3d' : '#e8e8e8',
        label: state.labels === 'off' ? null : labelFor(p),
        labelColor: p.degree === 0 ? '#fff' : '#2a1d10',
        opacity: 0.92,
      }));
    neck.setLayer('scale', dots);
    neck.setBox(box ? lick.position : null);

    const seen = new Set();
    const foot = [];
    for (const ev of song.events) for (const n of ev.notes) {
      const k = `${n.string}-${n.fret}`;
      if (!seen.has(k)) { seen.add(k); foot.push({ ...n, size: 14.5, stroke: '#f3e6cf', strokeWidth: 1.6, opacity: 0.55 }); }
    }
    neck.setLayer('foot', foot);
    showIdle();
  }

  function showNeck(now, next) {
    neck.setActive(now, labelFor);
    neck.setNext(next);
  }

  function nextNotes(i) {
    const n = song.events.length;
    for (let k = 1; k <= n; k++) {
      const e = song.events[(i + k) % n];
      if (e.notes.length) return e.notes;
    }
    return [];
  }

  function showIdle() {
    Tab.highlight(layout, -1);
    Tab.cursor(layout, -1);
    showNeck([], nextNotes(-1));
  }

  function showEvent(i) {
    Tab.highlight(layout, i);
    showNeck(song.events[i].notes, nextNotes(i));
  }

  function audition(i) {
    if (player.playing) return;
    synth.audition(song.events[i].notes);
    showEvent(i);
  }

  // ---- transport
  player.onEvent = (i) => {
    $('count').textContent = '';
    showEvent(i);
  };
  player.onFrame = (i, p) => Tab.cursor(layout, i, p);
  player.onCount = (n) => {
    $('count').textContent = n;
  };
  player.onLoop = (iter) => {
    $('loop-count').textContent = `Loop ${iter + 1}`;
    if (state.trainer && state.speed < 100) {
      state.speed = Math.min(100, state.speed + 5);
      save();
      syncSpeed();
      return bpm();
    }
    return null;
  };
  player.onStop = () => {
    $('play').classList.remove('on');
    $('play').querySelector('.icon').textContent = '▶';
    $('play').querySelector('.lbl').textContent = 'Play';
    $('count').textContent = '';
    $('loop-count').textContent = '';
    showIdle();
  };

  function togglePlay() {
    if (!song) return;
    if (player.playing) {
      player.stop();
      return;
    }
    player.start({ bpm: bpm(), loop: state.loop, countIn: state.countIn, metronome: state.metro });
    $('play').classList.add('on');
    $('play').querySelector('.icon').textContent = '■';
    $('play').querySelector('.lbl').textContent = 'Stop';
  }

  function syncSpeed() {
    $('speed').value = state.speed;
    $('speed-out').textContent = `${state.speed}% · ${bpm()} BPM`;
  }

  function setSpeed(v) {
    state.speed = Math.min(120, Math.max(40, v));
    save();
    syncSpeed();
    player.setBpm(bpm());
  }

  $('grace').value = state.graceLen;
  $('grace-out').textContent = `${state.graceLen} ms`;
  $('grace').addEventListener('input', (e) => {
    state.graceLen = +e.target.value;
    player.graceSec = state.graceLen / 1000;
    $('grace-out').textContent = `${state.graceLen} ms`;
    save();
  });

  $('play').addEventListener('click', togglePlay);
  $('speed').addEventListener('input', (e) => setSpeed(+e.target.value));

  const toggles = { loop: 'loop', countin: 'countIn', metro: 'metro', trainer: 'trainer' };
  for (const [elId, key] of Object.entries(toggles)) {
    $(elId).checked = state[key];
    $(elId).addEventListener('change', (e) => {
      state[key] = e.target.checked;
      // The trainer works up to full speed, so start it from 70%.
      if (key === 'trainer' && state.trainer && state.speed >= 100) setSpeed(70);
      save();
      player.loop = state.loop;
      player.metronome = state.metro;
    });
  }

  function bindSeg(elId, key, onChange) {
    const seg = $(elId);
    const sync = () => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === state[key]));
    seg.addEventListener('click', (e) => {
      const v = e.target.closest('button')?.dataset.v;
      if (!v) return;
      state[key] = v;
      save();
      sync();
      onChange();
    });
    sync();
  }
  bindSeg('neck-mode', 'neck', renderBoard);
  bindSeg('label-mode', 'labels', renderBoard);

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'range' && e.key.startsWith('Arrow')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'l' || e.key === 'L') {
      $('loop').click();
    } else if (e.key === 'ArrowRight') {
      setSpeed(state.speed + 5);
    } else if (e.key === 'ArrowLeft') {
      setSpeed(state.speed - 5);
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const i = layout?.current ?? -1;
      renderTab();
      if (i >= 0) Tab.highlight(layout, i);
    }, 120);
  });

  let shownInstrument = INSTRUMENT.id;
  onTuningChange(() => {
    if (INSTRUMENT.id !== shownInstrument) {
      shownInstrument = INSTRUMENT.id;
      renderLibrary();
      selectLick(state.lickId);
    } else if (song) {
      renderTab();
      renderBoard();
    }
  });

  renderLibrary();
  selectLick(state.lickId);
}
