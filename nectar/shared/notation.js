// Nectar tab notation: text tab <-> events, and events -> a playable song (see player.js).
// Used by Licks (lick library) and the Tab editor (songs).

// Durations in beats. Sticky: a duration applies until the next one is given.
export const DURATIONS = {
  w: 4, h: 2, q: 1, e: 0.5, s: 0.25,
  t: 1 / 3,  // eighth-note triplet
};

/*
 * Tab notation, whitespace separated:
 *   3-7        string 3, fret 7 (string 1 = top line of tab)
 *   3-7:q      ...as a quarter note (duration sticks for following notes)
 *   3-5:g      grace note: takes no time on the grid; sounds on the beat and the next note
 *              follows ~200 ms later (Grace slider on the Licks page) (e.g. "3-5:g h3-7:q" = quick hammer-on into a quarter)
 *   h3-7 p3-5  hammer-on / pull-off into this note
 *   /3-9       slide into this note from the previous note on that string
 *   2-8b2      bend up 2 semitones (b1 = half step)
 *   4-7~       vibrato
 *   5-0+4-2    notes played together (chord / double-stop)
 *   r          rest
 *   |          bar line (ignored, just for readability)
 */
const NOTE_RE = /^([hp/])?([1-9])-(\d{1,2})(?:b(\d))?(~)?$/;

function parseNote(tok) {
  const m = NOTE_RE.exec(tok);
  if (!m) throw new Error(`Bad tab note "${tok}"`);
  return {
    string: +m[2],
    fret: +m[3],
    tech: m[1] || null,
    bend: m[4] ? +m[4] : 0,
    vibrato: !!m[5],
  };
}

export function parseTab(src) {
  const events = [];
  let beat = 0;
  let dur = DURATIONS.e;
  for (const raw of src.trim().split(/\s+/)) {
    if (raw === '|') continue;
    // "4-7:h~" is accepted as shorthand for "4-7~:h"
    const trailingVib = raw.includes(':') && raw.endsWith('~');
    const [rawBody, d0] = raw.split(':');
    const body = trailingVib ? `${rawBody}~` : rawBody;
    const d = trailingVib ? d0.slice(0, -1) : d0;
    const notes = body === 'r' ? [] : body.split('+').map(parseNote);
    if (d === 'g') {
      events.push({ beat, dur: 0, notes, grace: true }); // doesn't move the beat or the sticky duration
      continue;
    }
    if (d !== undefined) {
      if (!(d in DURATIONS)) throw new Error(`Bad duration "${d}" in "${raw}"`);
      dur = DURATIONS[d];
    }
    events.push({ beat, dur, notes });
    beat += dur;
  }
  return { events, length: beat };
}

// Beat positions + loop length for a list of events (grace notes take no grid time).
export function timed(events, swing = false) {
  let beat = 0;
  const out = events.map((ev) => {
    const e = { ...ev, beat };
    if (!ev.grace) beat += ev.dur;
    return e;
  });
  return { events: out, length: beat, loopBeats: Math.max(4, Math.ceil(beat / 4 - 1e-9) * 4), swing };
}

export function buildSong(lick) {
  return timed(parseTab(lick.tab).events, !!lick.swing);
}

const CODES = Object.fromEntries(Object.entries(DURATIONS).map(([k, v]) => [v.toFixed(4), k]));

function noteToken(n) {
  return `${n.tech || ''}${n.string}-${n.fret}${n.bend ? `b${n.bend}` : ''}${n.vibrato ? '~' : ''}`;
}

// Events -> notation text (the inverse of parseTab), with a bar line every 4 beats.
export function toTab(events) {
  const out = [];
  let dur = null, beat = 0, nextBar = 4;
  for (const ev of events) {
    if (!ev.grace && beat >= nextBar - 1e-6) {
      out.push('|');
      nextBar += 4;
    }
    const body = ev.notes.length ? ev.notes.map(noteToken).join('+') : 'r';
    let code = '';
    if (ev.grace) code = ':g';
    else if (dur === null || Math.abs(ev.dur - dur) > 1e-6) {
      code = `:${CODES[ev.dur.toFixed(4)]}`;
      dur = ev.dur;
    }
    out.push(body + code);
    if (!ev.grace) beat += ev.dur;
  }
  return out.join(' ');
}
