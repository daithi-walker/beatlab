// Nectar chord names → playable shapes on the current instrument/tuning.
//   chordNotes('Am')  → [{ string, fret }, ...]   (empty if the name can't be read)
// Standard-tuned guitar uses hand-picked open/barre shapes; anything else (other tunings,
// ukulele, mandolin, bass...) gets a searched voicing.

import { INSTRUMENT, TUNING, OPEN_MIDI, stringsLowToHigh, NOTE_NAMES } from './theory.js';

const QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], M7: [0, 4, 7, 11],
  9: [0, 4, 7, 10, 2], add9: [0, 4, 7, 2], sus2: [0, 2, 7], sus4: [0, 5, 7], sus: [0, 5, 7],
  '7sus4': [0, 5, 7, 10], dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], aug: [0, 4, 8], '+': [0, 4, 8],
};
const FLATS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const pcOf = (name) => NOTE_NAMES.indexOf(FLATS[name] ?? name);

// 'F#m7/C#' → { root: 6, intervals: [...], bass: 1 }   (null if it isn't a chord name we know)
export function parseChord(name) {
  const m = /^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/.exec(name.trim());
  if (!m || !(m[2] in QUALITIES)) return null;
  return { root: pcOf(m[1]), intervals: QUALITIES[m[2]], bass: m[3] ? pcOf(m[3]) : null };
}

// Standard guitar shapes, low E string first ('x' = not played).
const GUITAR = {
  C: 'x32010', D: 'xx0232', E: '022100', F: '133211', G: '320003', A: 'x02220', B: 'x24442',
  Cm: 'x35543', Dm: 'xx0231', Em: '022000', Fm: '133111', Gm: '355333', Am: 'x02210', Bm: 'x24432',
  'F#m': '244222', 'C#m': 'x46654', Bb: 'x13331',
  C7: 'x32310', D7: 'xx0212', E7: '020100', G7: '320001', A7: 'x02020', B7: 'x21202',
  Cmaj7: 'x32000', Dmaj7: 'xx0222', Fmaj7: 'xx3210', Gmaj7: '320002', Amaj7: 'x02120',
  Dm7: 'xx0211', Em7: '022030', Am7: 'x02010', Bm7: 'x20202',
  Asus2: 'x02200', Asus4: 'x02230', Dsus2: 'xx0230', Dsus4: 'xx0233', Esus4: '022200',
  Cadd9: 'x32033', E5: '022xxx', A5: 'x022xx', D5: 'xx023x',
  'G/B': 'x20003', 'D/F#': '200232', 'C/G': '332010',
};

function fromShape(shape) {
  const n = shape.length;
  return [...shape].flatMap((c, i) => (c === 'x' ? [] : [{ string: n - i, fret: parseInt(c, 10) }]));
}

export function chordNotes(name) {
  if (INSTRUMENT.id === 'guitar' && TUNING.id === 'standard' && GUITAR[name]) return fromShape(GUITAR[name]);
  const chord = parseChord(name);
  return chord ? searchVoicing(chord) : [];
}

// Try every 4-fret window and every choice of lowest string, and every combination of
// chord tones on the strings from there up. Keep the shape that covers the chord (5th
// optional), uses most strings and sits lowest on the neck, preferring the right bass note.
function searchVoicing({ root, intervals, bass }) {
  const tones = intervals.map((i) => (root + i) % 12);
  const essential = intervals.length > 2 ? tones.filter((_, k) => intervals[k] !== 7) : tones;
  const wantBass = bass ?? root;
  const strings = stringsLowToHigh();
  const maxMuted = Math.max(0, strings.length - 4);
  const pitch = (n) => OPEN_MIDI[n.string] + n.fret;
  let best = null;
  for (let w = 0; w <= 9; w++) {
    const window = w === 0 ? [0, 1, 2, 3] : [0, w, w + 1, w + 2, w + 3];
    for (let b = 0; b <= maxMuted; b++) {
      const used = strings.slice(b);
      const options = used.map((s) => window.filter((f) => tones.includes((OPEN_MIDI[s] + f) % 12)).map((f) => ({ string: s, fret: f })));
      if (options.some((o) => !o.length)) continue;
      const pick = (k, notes) => {
        if (k === options.length) {
          const pcs = notes.map((n) => pitch(n) % 12);
          if (!essential.every((t) => pcs.includes(t))) return;
          const low = notes.reduce((a, n) => (pitch(n) < pitch(a) ? n : a));
          const fretted = notes.filter((n) => n.fret > 0);
          const score = notes.length * 2 + (pitch(low) % 12 === wantBass ? 1 : 0)
            - Math.max(...notes.map((n) => n.fret)) * 0.3
            + (notes.length - fretted.length) * 0.3 - fretted.reduce((t, n) => t + n.fret, 0) * 0.05
            + (pcs.includes((root + 7) % 12) ? 0.3 : 0);
          if (!best || score > best.score) best = { score, notes: [...notes] };
          return;
        }
        for (const n of options[k]) pick(k + 1, [...notes, n]);
      };
      pick(0, []);
    }
  }
  return best ? best.notes : [];
}

// ---- chord charts → strummed events

// Strum patterns: one character per eighth note, D = down, U = up, - = let it ring.
export const STRUM_PATTERNS = {
  4: { 'Folk D-DU-UDU': 'D-DU-UDU', 'Down beats': 'D-D-D-D-', 'Ballad D---D-DU': 'D---D-DU', 'Eighths DUDU': 'DUDUDUDU', 'Whole bar': 'D-------' },
  3: { 'Waltz D-D-D-': 'D-D-D-', 'Waltz strum D-DUDU': 'D-DUDU', 'Whole bar': 'D-----' },
  2: { 'Polka D-DU': 'D-DU', 'Whole bar': 'D---' },
};

/*
 * A chord chart, one line per phrase, like a chord sheet without the lyrics:
 *   [Verse 1]            section marker for the next chord
 *   Am*2 F*2 G*2 Am*2    chord names; *N = N bars (default 1); "|" is ignored
 *   Am F G Am (x2)       (xN) or xN at the end repeats the line
 * Returns events: each bar of each chord strummed with `pattern`.
 */
export function chartEvents(text, pattern, beatsPerBar = 4) {
  if (pattern.length !== beatsPerBar * 2 || !/^[DU][DU-]*$/.test(pattern)) {
    throw new Error(`The strum pattern needs ${beatsPerBar * 2} characters (D, U or -), starting with D or U.`);
  }
  const events = [];
  const unknown = new Set();
  let marker = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const section = /^\[(.+)\]$/.exec(line);
    if (section) { marker = section[1].trim(); continue; }
    const rep = /\(?x(\d+)\)?\s*$/i.exec(line);
    const tokens = (rep ? line.slice(0, rep.index) : line).split(/\s+/).filter((t) => t && t !== '|');
    for (let r = 0; r < (rep ? +rep[1] : 1); r++) {
      for (const tok of tokens) {
        const [name, n] = tok.split('*');
        if (!parseChord(name)) { unknown.add(name); continue; }
        for (let bar = 0; bar < (+n || 1); bar++) {
          [...pattern].forEach((c, i) => {
            if (c === '-') return;
            let span = 1;
            while (i + span < pattern.length && pattern[i + span] === '-') span++;
            const ev = { dur: span * 0.5, notes: [], chord: name, strum: c === 'U' ? 'u' : 'd' };
            if (marker) { ev.marker = marker; marker = null; }
            events.push(ev);
          });
        }
      }
    }
  }
  if (unknown.size) throw new Error(`Unknown chord name${unknown.size > 1 ? 's' : ''}: ${[...unknown].join(', ')}`);
  return events;
}
