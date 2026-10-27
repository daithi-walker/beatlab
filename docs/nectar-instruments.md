# Nectar: instruments and tunings

How Nectar goes from "standard-tuned guitar" to any fretted instrument and tuning.
Builds on the shared guitar core (ADR-010).

## Where we start

Every note is `{ string, fret }` and every pitch comes from `midiAt()` in
`nectar/shared/theory.js`, so most code is already instrument-agnostic. The
guitar assumptions are concentrated in a few places:

| Where | Guitar assumption | Fix |
|---|---|---|
| `shared/theory.js` | 6 strings, EADGBE, 21 frets as constants | Instrument + tuning definitions; derived exports |
| `shared/neck.js` | Geometry sized for 6 strings; inlays between specific strings | Height and inlays derived from string count / instrument |
| `shared/synth.js` | Ring time tuned to guitar range; guitar amp tones | Per-instrument sound profile (phase 2) |
| Licks `tab.js` / `notation.js` | 6 tab lines; parser accepts strings 1-6 | Line count from instrument; each lick declares its tuning |
| Scales (`index.html`) | Box anchored on low E (string 6) | Anchor on the lowest-pitched string |
| Chords (`chords.html`) | E-shape / A-shape = shapes rooted on strings 6 / 5 | Generic voicing search (phase 3) |
| Identify | — | Already generic |

## Design

One `Instrument` definition, tunings as variations of it (in `theory.js`):

```js
guitar: {
  name: 'Guitar', frets: 21,
  inlays: [3, 5, 7, 9, 15, 17, 19, 21], doubleInlays: [12],
  tunings: {
    standard: { name: 'Standard', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] },  // low → high
    dropD:    { name: 'Drop D',   notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'] },
    ...
  },
}
```

- Tunings are written low → high, the way players say them. String 1 is the
  last (highest) note: the top line of tab, as now.
- `theory.js` keeps one current instrument + tuning and exposes `STRINGS`,
  `OPEN_MIDI`, `STRING_NAMES`, `FRET_COUNT` as **live ES-module bindings**, so
  existing imports keep working and update when the tuning changes.
- `setTuning(id)` persists to localStorage (`nectar-instrument`) and notifies
  subscribers (`onTuningChange`). The neck redraws itself; pages re-render.
- A `#tuning-select` in every topbar (via `setupTuning()`), shared across pages
  like Tone.
- Licks carry a `tuning` field. The Licks page switches to the lick's tuning
  (without saving it) and shows the select as locked.
- String labels are note names; if the top and bottom strings share a name,
  the top one is lowercase (e … E, d … D).

## Phases

**Phase 1 — Instrument abstraction + guitar tunings.** Standard, Half step
down, Drop D, DADGAD, Open G, Open D. Neck geometry derived from string count.
Scales box anchors on the lowest-pitched string. Chords keeps its two shapes,
labelled by the strings they're rooted on outside standard tuning. One drop-D
lick to prove lick tunings. Smoke-test checks for tuning pitch and labels.

**Phase 2 — Other fretted instruments.** Bass (4/5), 7-string, ukulele
(re-entrant GCEA), mandolin. Per-instrument `sound` profile (sustain,
brightness, `courses: 2` = paired strings as two detuned plucks), inlay sets,
tab line count from the instrument, an instrument select. Anything that
assumes "last string is lowest" switches to "lowest open pitch".

**Phase 3 — Generic chord voicings.** Replace E/A-shape with a search: one
note per string within a ~4-fret span, root (or chosen inversion) in the bass,
essential tones covered, mutes allowed; rank and step through results. Also
delivers the backlog's "voicing variations".

**Not planned:** banjo (short 5th string needs a per-string start fret),
fretless and bowed instruments (no frets, different synthesis).

## Status

- Phase 1: done (branch `nectar-licks`). `INSTRUMENTS` + live tuning bindings in
  `theory.js`, `setupTuning()` in `shared/tuning-ui.js`, neck and Licks tab sized
  from the string count, six guitar tunings, the Drop D Chug lick, 11 tuning
  checks in `nectar/tests/smoke.py`.
- Phases 2-3: not started.
