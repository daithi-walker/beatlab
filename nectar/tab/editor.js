// Nectar Tab editor: write tab by keyboard or by tapping the neck, hear it back, keep songs
// in this browser. Songs use the same notation as the lick library (shared/notation.js).

import { INSTRUMENT, TUNING, STRINGS, FRET_COUNT, setTuning, onTuningChange, noteName, midiOf } from '../shared/theory.js';
import { setupAudio } from '../shared/audio-ui.js';
import { setupInstrument } from '../shared/instrument-ui.js';
import { Player } from '../shared/player.js';
import { Neck, ghostDots } from '../shared/neck.js';
import { Tab } from '../shared/tab.js';
import { DURATIONS, parseTab, toTab, timed } from '../shared/notation.js';

const $ = (id) => document.getElementById(id);
const SONGS_KEY = 'nectar-songs';
const STATE_KEY = 'nectar-tab';
const ORDER = ['w', 'h', 'q', 'e', 's']; // for +/- (triplets are picked from the toolbar)

const songs = JSON.parse(localStorage.getItem(SONGS_KEY) || '{}'); // id -> { id, title, artist, instrument, tuning, bpm, tab }
const state = { songId: null, loop: true, countIn: false, metro: false, advance: true, ...JSON.parse(localStorage.getItem(STATE_KEY) || '{}') };
const saveState = () => localStorage.setItem(STATE_KEY, JSON.stringify(state));
const saveSongs = () => localStorage.setItem(SONGS_KEY, JSON.stringify(songs));

let song = null;        // the open song (an entry of `songs`)
let events = [];        // [{ dur, notes: [{ string, fret, tech, bend, vibrato }], grace? }]
let cur = { i: 0, string: 1 }; // edit cursor; i === events.length is "after the last beat"
let newDur = DURATIONS.e;      // length given to new beats
let layout = null;
const undo = [], redo = [];

const synth = setupAudio();
const player = new Player(synth);
setupInstrument();
const neck = new Neck($('fretboard'), {
  interaction: 'tap',
  onTap: (note) => {
    synth.audition([note]);
    neck.flash(note);
    if (player.playing) return;
    cur.string = note.string;
    setFret(note.fret);
    if (state.advance) move(1);
  },
});

// ---- song storage

function newSong() {
  const id = `s${Date.now().toString(36)}`;
  songs[id] = { id, title: 'Untitled', artist: '', instrument: INSTRUMENT.id, tuning: TUNING.id, bpm: 90, tab: '' };
  saveSongs();
  openSong(id);
}

function openSong(id) {
  player.stop();
  song = songs[id];
  state.songId = id;
  saveState();
  events = song.tab.trim() ? parseTab(song.tab).events.map(({ beat, ...e }) => e) : [];
  cur = { i: 0, string: 1 };
  undo.length = redo.length = 0;
  fillSongBar();
  setTuning(song.tuning, { instrument: song.instrument, persist: false }); // renders via onTuningChange
}

function store() {
  song.tab = toTab(events);
  saveSongs();
}

function fillSongBar() {
  const sel = $('song-select');
  sel.replaceChildren(...Object.values(songs)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((s) => new Option(s.artist ? `${s.title} · ${s.artist}` : s.title, s.id, false, s.id === song.id)));
  $('song-title').value = song.title;
  $('song-artist').value = song.artist;
  $('bpm').value = song.bpm;
}

// ---- editing (every change goes through edit() so it can be undone)

function edit(fn) {
  undo.push(JSON.stringify(events));
  if (undo.length > 200) undo.shift();
  redo.length = 0;
  fn();
  store();
  render();
}

function restore(from, to) {
  if (!from.length) return;
  to.push(JSON.stringify(events));
  events = JSON.parse(from.pop());
  cur.i = Math.min(cur.i, events.length);
  store();
  render();
}

// The beat at the cursor, creating one if the cursor is past the end.
function beatAtCursor() {
  if (cur.i >= events.length) {
    events.push({ dur: newDur, notes: [] });
    cur.i = events.length - 1;
  }
  return events[cur.i];
}

const noteAtCursor = () => events[cur.i]?.notes.find((n) => n.string === cur.string);

function setFret(fret) {
  edit(() => {
    const ev = beatAtCursor();
    const n = ev.notes.find((x) => x.string === cur.string);
    if (n) n.fret = fret;
    else ev.notes.push({ string: cur.string, fret, tech: null, bend: 0, vibrato: false });
    ev.notes.sort((a, b) => a.string - b.string);
  });
  if (!player.playing) synth.audition([{ string: cur.string, fret }]);
}

function removeNote() {
  if (!noteAtCursor()) return;
  edit(() => { events[cur.i].notes = events[cur.i].notes.filter((n) => n.string !== cur.string); });
}

function setDuration(code) {
  newDur = DURATIONS[code];
  if (cur.i >= events.length) return render();
  edit(() => {
    const ev = events[cur.i];
    ev.dur = newDur;
    ev.grace = false;
  });
}

function nudgeDuration(dir) {
  const ev = events[cur.i];
  const now = ORDER.find((c) => Math.abs(DURATIONS[c] - (ev && !ev.grace ? ev.dur : newDur)) < 1e-6) ?? 'e';
  const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(now) + dir))];
  setDuration(next);
}

// Techniques: h/p/slide are exclusive; bend cycles full → half → none; ~ vibrato; g grace; r rest.
function technique(t) {
  if (t === 'r') {
    if (cur.i < events.length) edit(() => { events[cur.i].notes = []; });
    return;
  }
  if (t === 'g') {
    if (cur.i >= events.length) return;
    return edit(() => {
      const ev = events[cur.i];
      ev.grace = !ev.grace;
      if (!ev.grace && !ev.dur) ev.dur = newDur;
    });
  }
  if (!noteAtCursor()) return;
  edit(() => {
    const n = noteAtCursor();
    if (t === 'b') n.bend = n.bend === 0 ? 2 : n.bend === 2 ? 1 : 0;
    else if (t === '~') n.vibrato = !n.vibrato;
    else n.tech = n.tech === t ? null : t;
  });
}

function insertBeat() {
  edit(() => { events.splice(Math.min(cur.i, events.length), 0, { dur: newDur, notes: [] }); });
}

function deleteBeat() {
  if (cur.i >= events.length) return;
  edit(() => {
    events.splice(cur.i, 1);
    cur.i = Math.min(cur.i, events.length);
  });
}

function move(di, ds = 0) {
  cur.i = Math.max(0, Math.min(events.length, cur.i + di));
  cur.string = Math.max(1, Math.min(STRINGS.length, cur.string + ds));
  showCursor();
}

// ---- rendering

// Notes on strings this instrument doesn't have (after switching instrument) are kept in the
// song but skipped for drawing and playback.
const playable = () => events.map((e) => ({ ...e, notes: e.notes.filter((n) => STRINGS.includes(n.string)) }));

function render() {
  cur.string = Math.min(cur.string, STRINGS.length);
  layout = Tab.render($('tab'), timed(playable()), null, {
    editable: true,
    onPick: (i, s) => {
      cur = { i, string: s };
      showCursor();
    },
  });
  neck.setLayer('ghost', ghostDots(neck.frets, 0.22));
  showCursor();
}

function showCursor() {
  if (!layout) return;
  Tab.select(layout, cur.i, cur.string);
  const notes = playable()[cur.i]?.notes ?? [];
  neck.setLayer('main', notes.map((n) => ({ ...n, size: 'label', fill: '#e8e8e8', label: noteName(midiOf(n)), labelColor: '#2a1d10' })));
  const n = noteAtCursor();
  neck.setNext(n && STRINGS.includes(n.string) ? [n] : []);
  syncToolbar();
}

function syncToolbar() {
  const ev = events[cur.i];
  const n = noteAtCursor();
  const len = ev && !ev.grace ? ev.dur : newDur;
  document.querySelectorAll('#dur-tools button').forEach((b) => b.classList.toggle('on', Math.abs(DURATIONS[b.dataset.dur] - len) < 1e-6 && !ev?.grace));
  document.querySelectorAll('#tech-tools button').forEach((b) => {
    const t = b.dataset.tech;
    const on = t === 'g' ? !!ev?.grace : t === 'r' ? !!ev && !ev.notes.length : t === 'b' ? !!n?.bend : t === '~' ? !!n?.vibrato : n?.tech === t;
    b.classList.toggle('on', on);
  });
  $('undo').disabled = !undo.length;
  $('redo').disabled = !redo.length;
}

// ---- playback

player.onEvent = (i) => {
  $('count').textContent = '';
  Tab.highlight(layout, i);
  neck.setActive(playable()[i].notes);
};
player.onFrame = (i, p) => Tab.cursor(layout, i, p);
player.onCount = (n) => { $('count').textContent = n; };
player.onStop = () => {
  $('play').classList.remove('on');
  $('play').querySelector('.icon').textContent = '▶';
  $('play').querySelector('.lbl').textContent = 'Play';
  $('count').textContent = '';
  Tab.highlight(layout, -1);
  Tab.cursor(layout, -1);
  neck.setActive([]);
};

function togglePlay() {
  if (player.playing) return player.stop();
  if (!events.length) return;
  player.load(timed(playable()));
  player.start({ bpm: song.bpm, loop: state.loop, countIn: state.countIn, metronome: state.metro });
  $('play').classList.add('on');
  $('play').querySelector('.icon').textContent = '■';
  $('play').querySelector('.lbl').textContent = 'Stop';
}

// ---- export / import (plain text: a few "key: value" lines, then the tab)

function exportSong() {
  const text = [
    '# Nectar tab',
    `title: ${song.title}`, `artist: ${song.artist}`, `instrument: ${song.instrument}`,
    `tuning: ${song.tuning}`, `bpm: ${song.bpm}`, `tab: ${song.tab}`, '',
  ].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = `${(song.title || 'tab').replace(/[^\w\- ]+/g, '').trim() || 'tab'}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importSong(file) {
  const text = await file.text();
  const meta = {};
  const tabAt = text.search(/^tab:/m);
  if (tabAt < 0) return alert('That file has no "tab:" line, so it isn\'t a Nectar tab export.');
  for (const line of text.slice(0, tabAt).split('\n')) {
    const m = /^(\w+):\s*(.*)$/.exec(line);
    if (m) meta[m[1]] = m[2].trim();
  }
  const tab = text.slice(tabAt + 4).replace(/\s+/g, ' ').trim();
  try { parseTab(tab); } catch (e) { return alert(`Couldn't read the tab: ${e.message}`); }
  const id = `s${Date.now().toString(36)}`;
  songs[id] = {
    id, title: meta.title || file.name.replace(/\.txt$/, ''), artist: meta.artist || '',
    instrument: meta.instrument || 'guitar', tuning: meta.tuning || 'standard', bpm: +meta.bpm || 90, tab,
  };
  saveSongs();
  openSong(id);
}

// ---- wiring

$('song-select').addEventListener('change', (e) => openSong(e.target.value));
$('song-new').addEventListener('click', newSong);
$('song-more').addEventListener('click', () => document.body.classList.toggle('song-open'));
$('song-title').addEventListener('input', (e) => { song.title = e.target.value; saveSongs(); });
$('song-title').addEventListener('change', fillSongBar);
$('song-artist').addEventListener('input', (e) => { song.artist = e.target.value; saveSongs(); });
$('song-artist').addEventListener('change', fillSongBar);
$('bpm').addEventListener('change', (e) => {
  song.bpm = Math.min(260, Math.max(30, +e.target.value || 90));
  e.target.value = song.bpm;
  saveSongs();
  player.setBpm(song.bpm);
});
$('song-export').addEventListener('click', exportSong);
$('song-import').addEventListener('change', (e) => { if (e.target.files[0]) importSong(e.target.files[0]); e.target.value = ''; });
$('song-delete').addEventListener('click', () => {
  if (!confirm(`Delete "${song.title}"? This can't be undone.`)) return;
  delete songs[song.id];
  saveSongs();
  const next = Object.keys(songs)[0];
  if (next) openSong(next); else newSong();
});

$('play').addEventListener('click', togglePlay);
for (const [elId, key] of [['loop', 'loop'], ['countin', 'countIn'], ['metro', 'metro'], ['advance', 'advance']]) {
  $(elId).checked = state[key];
  $(elId).addEventListener('change', (e) => {
    state[key] = e.target.checked;
    saveState();
    player.loop = state.loop;
    player.metronome = state.metro;
  });
}
document.querySelectorAll('#dur-tools button').forEach((b) => b.addEventListener('click', () => setDuration(b.dataset.dur)));
document.querySelectorAll('#tech-tools button').forEach((b) => b.addEventListener('click', () => technique(b.dataset.tech)));
$('ins-beat').addEventListener('click', insertBeat);
$('del-beat').addEventListener('click', deleteBeat);
$('undo').addEventListener('click', () => restore(undo, redo));
$('redo').addEventListener('click', () => restore(redo, undo));

// Two digits typed quickly on the same spot make one fret number (e.g. 1 then 2 = 12).
let lastDigit = null;
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? restore(redo, undo) : restore(undo, redo); }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); return restore(redo, undo); }
  if (mod || e.altKey) return;
  if (/^[0-9]$/.test(e.key)) {
    const d = +e.key, now = performance.now();
    const twoDigit = lastDigit && now - lastDigit.t < 700 && lastDigit.i === cur.i && lastDigit.s === cur.string
      && lastDigit.d * 10 + d <= FRET_COUNT;
    setFret(twoDigit ? lastDigit.d * 10 + d : d);
    lastDigit = twoDigit ? null : { d, t: now, i: cur.i, s: cur.string };
    return;
  }
  const keys = {
    ArrowLeft: () => move(-1), ArrowRight: () => move(1), ArrowUp: () => move(0, -1), ArrowDown: () => move(0, 1),
    Home: () => move(-Infinity), End: () => move(Infinity),
    ' ': togglePlay, Delete: () => (e.shiftKey ? deleteBeat() : removeNote()),
    Backspace: () => (noteAtCursor() ? removeNote() : (deleteBeat(), move(-1))),
    '+': () => nudgeDuration(-1), '=': () => nudgeDuration(-1), '-': () => nudgeDuration(1),
    h: () => technique('h'), p: () => technique('p'), s: () => technique('/'), b: () => technique('b'),
    v: () => technique('~'), g: () => technique('g'), r: () => technique('r'), i: insertBeat,
  };
  const fn = keys[e.key] ?? keys[e.key.toLowerCase()];
  if (!fn) return;
  e.preventDefault();
  fn();
});

// Instrument/tuning chosen in the topbar belongs to the open song.
onTuningChange(() => {
  if (!song) return;
  song.instrument = INSTRUMENT.id;
  song.tuning = TUNING.id;
  saveSongs();
  render();
});

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 120);
});

if (songs[state.songId]) openSong(state.songId);
else if (Object.keys(songs).length) openSong(Object.keys(songs)[0]);
else newSong();
