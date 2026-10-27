// Nectar shared theory: tuning, note names, scales, interval colours.
//
// String convention (all Nectar code): notes are { string, fret } where string 1 is the
// top line of tab (high e on a standard guitar) and the last string is the bottom line.

// ---- Instruments and tunings (docs/nectar-instruments.md)
// Tunings list the open notes from the bottom line of tab to the top (string 1 last): low → high
// on guitar and bass; ukulele's re-entrant high g comes first.
// sound: synth profile — sustain (× ring time), pick (pluck position, lower = brighter),
// soft (0-1, softer attack: fingers/nylon).
// courses: paired strings, one entry per string (string 1 first) giving the second string's
// interval in semitones: 0 = unison pair (mandolin), 12 = octave pair (12-string low courses).
const GUITAR_INLAYS = { inlays: [3, 5, 7, 9, 15, 17, 19, 21], doubleInlays: [12, 24] };
const SMALL_INLAYS = { inlays: [5, 7, 10, 15], doubleInlays: [12] };

export const INSTRUMENTS = {
  guitar: {
    name: 'Guitar', frets: 21, ...GUITAR_INLAYS,
    sound: { sustain: 1, pick: 0.13, soft: 0.55 },
    tunings: {
      standard: { name: 'Standard', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
      halfDown: { name: 'Half step down', notes: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'] },
      dropD: { name: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
      dadgad: { name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] },
      openG: { name: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'] },
      openD: { name: 'Open D', notes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'] },
    },
  },
  guitar7: {
    name: '7-string guitar', frets: 24, ...GUITAR_INLAYS,
    sound: { sustain: 1, pick: 0.13, soft: 0.55 },
    tunings: {
      standard: { name: 'Standard', notes: ['B1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
      dropA: { name: 'Drop A', notes: ['A1', 'E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    },
  },
  guitar12: {
    name: '12-string guitar', frets: 20, ...GUITAR_INLAYS,
    sound: { sustain: 1.2, pick: 0.13, soft: 0.5 },
    courses: [0, 0, 12, 12, 12, 12],
    tunings: {
      standard: { name: 'Standard', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
      halfDown: { name: 'Half step down', notes: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'] },
    },
  },
  bass: {
    name: 'Bass (4-string)', frets: 20, ...GUITAR_INLAYS,
    sound: { sustain: 1.5, pick: 0.22, soft: 0.75 },
    tunings: {
      standard: { name: 'Standard', notes: ['E1', 'A1', 'D2', 'G2'] },
      dropD: { name: 'Drop D', notes: ['D1', 'A1', 'D2', 'G2'] },
    },
  },
  bass5: {
    name: 'Bass (5-string)', frets: 24, ...GUITAR_INLAYS,
    sound: { sustain: 1.5, pick: 0.22, soft: 0.75 },
    tunings: {
      standard: { name: 'Standard', notes: ['B0', 'E1', 'A1', 'D2', 'G2'] },
    },
  },
  ukulele: {
    name: 'Ukulele', frets: 15, ...SMALL_INLAYS,
    sound: { sustain: 0.5, pick: 0.2, soft: 0.8 },
    tunings: {
      standard: { name: 'Standard (gCEA)', notes: ['G4', 'C4', 'E4', 'A4'] },
      lowG: { name: 'Low G', notes: ['G3', 'C4', 'E4', 'A4'] },
    },
  },
  mandolin: {
    name: 'Mandolin', frets: 17, ...SMALL_INLAYS,
    sound: { sustain: 0.6, pick: 0.1, soft: 0.4 },
    courses: [0, 0, 0, 0],
    tunings: {
      standard: { name: 'Standard (GDAE)', notes: ['G3', 'D4', 'A4', 'E5'] },
    },
  },
};

// Current instrument + tuning. These are live bindings: importers see new values
// after setTuning(). Subscribe with onTuningChange() to re-render.
export let INSTRUMENT, TUNING, STRINGS, OPEN_MIDI, STRING_NAMES, FRET_COUNT;

const STORE = 'nectar-instrument';
const listeners = [];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// Root choices as MIDI in octave 4 (C4 = 60). Only the pitch class matters for theory.
export const ROOT_MIDI = NOTE_NAMES.map((_, i) => 60 + i);

// Short interval symbols by semitone (used for fretboard labels).
export const INTERVAL_SYMBOLS = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];

// Interval colours by semitone (chords + identify).
export const INTERVAL_COLORS = {
  0: '#ff9d3d',  // Root — amber
  1: '#ff8a80',  // Min 2nd / ♭9 — salmon
  2: '#e8c96b',  // Maj 2nd / 9th — gold
  3: '#6ba3ff',  // Min 3rd — blue
  4: '#4fc3f7',  // Maj 3rd — cyan
  5: '#81c784',  // Perf 4th — green
  6: '#ff7043',  // Dim 5th / tritone — orange-red
  7: '#4db6ac',  // Perf 5th — teal
  8: '#ff8a65',  // Aug 5th — light orange
  9: '#ce93d8',  // 6th / dim 7th — lavender
  10: '#ba68c8', // Min 7th — purple
  11: '#a5d6a7', // Maj 7th — light green
  14: '#e8c96b', // Maj 9th (same as 2) — gold
};

export const midiAt = (string, fret) => OPEN_MIDI[string] + fret;
export const midiOf = (note) => OPEN_MIDI[note.string] + note.fret;
export const noteName = (midi) => NOTE_NAMES[((midi % 12) + 12) % 12];
export const degree = (midi, rootMidi) => (((midi - rootMidi) % 12) + 12) % 12;

export const SCALES = {
  'minor-pentatonic': {
    name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10],
    feel: 'Raw · Emotive · Immediate', genre: 'Blues, Rock, Funk',
    examples: 'Smoke on the Water · Black Magic Woman · Pride and Joy',
    tip: 'Start on an orange root note and you can\'t go wrong — every note in this scale works over a minor chord.',
    boxOffset: 0,
  },
  'major-pentatonic': {
    name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9],
    feel: 'Open · Optimistic · Singable', genre: 'Country, Folk, Pop',
    examples: 'My Girl · Stand By Me · Sweet Home Alabama',
    tip: 'Safe and singable — no half-steps means nothing clashes. Land on the root (orange) to resolve.',
    boxOffset: -1,
  },
  'major': {
    name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11],
    feel: 'Bright · Resolved · Happy', genre: 'Pop, Classical, Country',
    examples: "Don't Stop Me Now · Let It Be · Happy Birthday",
    tip: 'The 7th degree (one fret below the root) creates strong pull back home — use it to build tension before resolving.',
    boxOffset: -1,
  },
  'natural-minor': {
    name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10],
    feel: 'Melancholic · Serious · Powerful', genre: 'Rock, Classical, Metal',
    examples: 'Nothing Else Matters · Stairway to Heaven · Summertime Sadness',
    tip: 'The ♭3 and ♭7 are the dark notes — lean on them for emotional weight. Resolve to the root (orange) for finality.',
    boxOffset: 0,
  },
  'blues': {
    name: 'Blues Scale', intervals: [0, 3, 5, 6, 7, 10],
    feel: 'Gritty · Bent · Expressive', genre: 'Blues, Soul, Jazz',
    examples: 'The Thrill Is Gone · Crossroads · Red House',
    tip: 'The ♭5 "blue note" (between the 4th and 5th) is the tension note — bend it up toward the 5th, or slide through it quickly. Don\'t land on it; use it as a passing tone.',
    boxOffset: 0,
  },
  'dorian': {
    name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10],
    feel: 'Cool · Sophisticated · Groovy', genre: 'Jazz, Funk, Modal Rock',
    examples: 'So What · Oye Como Va · Smooth',
    tip: 'Like natural minor but the 6th is raised — that one note lifts the mood. Compare it to natural minor to hear the difference.',
    boxOffset: 0,
  },
  'phrygian': {
    name: 'Phrygian', intervals: [0, 1, 3, 5, 7, 8, 10],
    feel: 'Tense · Exotic · Dangerous', genre: 'Flamenco, Metal, Spanish',
    examples: 'White Zombie · flamenco guitar · Wherever I May Roam',
    tip: 'The ♭2 — just one half-step above the root — is the defining sound. That tight interval gives it a Spanish or metal urgency.',
    boxOffset: 0,
  },
  'mixolydian': {
    name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10],
    feel: 'Driving · Anthemic · Unresolved', genre: 'Classic Rock, Folk, Blues',
    examples: 'Sweet Home Alabama · Sympathy for the Devil · Norwegian Wood',
    tip: 'Major scale with a flat 7th — keeps the brightness but the lowered 7th stops it fully resolving, giving that driving, open-road feel.',
    boxOffset: 0,
  },
  'harmonic-minor': {
    name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11],
    feel: 'Dramatic · Ornate · Classical', genre: 'Metal, Flamenco, Classical',
    examples: "Eruption · Spanish guitar · Bach's minor compositions",
    tip: 'The raised 7th creates a wide gap (augmented 2nd) between the ♭6 and 7 — that leap is the exotic, cinematic sound you hear in flamenco and metal.',
    boxOffset: 0,
  },
  'whole-tone': {
    name: 'Whole Tone', intervals: [0, 2, 4, 6, 8, 10],
    feel: 'Floating · Ambiguous · Dreamlike', genre: 'Impressionist, Jazz, Film Score',
    examples: "Debussy's La Mer · jazz improvisation · film tension cues",
    tip: 'No half-steps anywhere, and no perfect 5th — the scale has no real home note, which is why it sounds unmoored. Every note is equal.',
    boxOffset: 0,
  },
};

// Every { string, fret } on the neck whose pitch is in `intervals` relative to rootMidi.
export function positionsInScale(rootMidi, intervals, frets = FRET_COUNT) {
  const out = [];
  for (const string of STRINGS) {
    for (let fret = 0; fret <= frets; fret++) {
      const midi = midiAt(string, fret);
      const deg = degree(midi, rootMidi);
      if (intervals.includes(deg)) out.push({ string, fret, midi, degree: deg });
    }
  }
  return out;
}

// 'E2' → 40, 'D#4' → 63
function noteToMidi(n) {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  return NOTE_NAMES.indexOf(m[1]) + 12 * (+m[2] + 1);
}

// Switch instrument, using its first tuning.
export function setInstrument(id) {
  setTuning(Object.keys(INSTRUMENTS[id].tunings)[0], { instrument: id });
}

// Switch tuning, on the current instrument unless another is given.
// persist=false for temporary switches (Licks).
export function setTuning(tuningId, { instrument = INSTRUMENT.id, persist = true } = {}) {
  const inst = INSTRUMENTS[instrument];
  const midis = inst.tunings[tuningId].notes.map(noteToMidi).reverse(); // string 1 first
  INSTRUMENT = { id: instrument, ...inst };
  TUNING = { id: tuningId, ...inst.tunings[tuningId] };
  STRINGS = midis.map((_, i) => i + 1);
  OPEN_MIDI = Object.fromEntries(midis.map((m, i) => [i + 1, m]));
  const names = midis.map(noteName);
  if (names.slice(1).includes(names[0])) names[0] = names[0].toLowerCase(); // e … E
  STRING_NAMES = Object.fromEntries(names.map((n, i) => [i + 1, n]));
  FRET_COUNT = inst.frets;
  if (persist) localStorage.setItem(STORE, JSON.stringify({ instrument, tuning: tuningId }));
  for (const fn of listeners) fn();
}

export function onTuningChange(fn) {
  listeners.push(fn);
}

// Strings ordered from lowest to highest open pitch (the last string isn't always the
// lowest, e.g. re-entrant ukulele tuning).
export function stringsLowToHigh() {
  return [...STRINGS].sort((a, b) => OPEN_MIDI[a] - OPEN_MIDI[b]);
}

{
  const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
  setTuning(saved.tuning ?? 'standard', { instrument: saved.instrument ?? 'guitar', persist: false });
}
