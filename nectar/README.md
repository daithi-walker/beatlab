# Nectar

A guitar learning suite: explore scales and chords, identify chords, and learn licks by
playing along. Works for guitar (6, 7 and 12-string), bass (4 and 5-string), ukulele and
mandolin, in standard and alternate tunings.

**Open:** [live](https://daithi-walker.github.io/beatlab/nectar/) · local: `http://localhost:8765/nectar/` (see the root [README](../README.md#run-it-locally))

## Pages

| Page | What it is |
|---|---|
| `index.html` (Scales) | 10 scales in any key on the neck, a 4-fret "box" view, play a scale run, plain-English "mood" card |
| `chords.html` (Chords) | 10 chord qualities with two voicings, interval colours, every chord tone across the neck, strum to hear |
| `identify.html` (Identify) | Tap notes on the neck, get the chord (33 types) with alternatives, build a progression |
| `licks.html` (Licks) | Lick trainer: tab with beat counts, a neck showing the scale box and the playing/next note, play-along with loop, count-in, click, speed trainer, grace notes; 28 licks across every instrument, each with "why it works" notes |
| `tab.html` (Tab) | Tab editor: write tab by keyboard or by tapping the neck, or build a strummed chord chart from chord names; capo, time signature, sections; play it back; songs saved in your browser with export/import |

Every page has **Instrument**, **Tuning**, **Tone** (Acoustic / Clean / Blues / Rock amp) and **Volume** controls in the topbar, shared across pages. You can tap or strum the neck on every page.

## Code

All pages are built on one shared guitar core, `shared/` ([ADR-010](../docs/adr-010-nectar-shared-guitar-core.md)):

| Module | Owns |
|---|---|
| `shared/theory.js` | Instruments, tunings, scales, interval colours; live bindings for the current instrument/tuning |
| `shared/neck.js` | The SVG neck: dot layers, box, mute marks, playing/next notes, strum/tap |
| `shared/synth.js` | Karplus-Strong strings + amp tones; legato (hammer-ons/pull-offs/slides), bends, vibrato, paired strings |
| `shared/player.js` | Look-ahead scheduler: runs, licks, swing, grace notes |
| `shared/notation.js`, `shared/tab.js` | Tab notation (text ↔ events) and the SVG tab renderer (with an editable mode) |
| `shared/chords.js` | Chord names → shapes for any instrument/tuning; chord charts + strum patterns → timed strums |
| `shared/page.css` | Page shell for Licks and Tab (palette, topbar, transport, panels) |
| `shared/audio-ui.js`, `shared/instrument-ui.js` | Topbar controls and iOS audio unlock |

- `shared/notation.js` + `shared/tab.js`: the text tab notation (documented at the top of `notation.js`) and the tab renderer, used by Licks and the Tab editor.
- `licks/`: the Licks page (library in `licks/licks-data.js`). `tab/`: the Tab editor.
- Notes are always `{ string, fret }`, string 1 = top line of tab.
- `tests/smoke.py`: Playwright smoke test for every page (see the root README).

## More

- [features.md](features.md): full feature reference (signal chain, every page in detail).
- [`docs/nectar-instruments.md`](../docs/nectar-instruments.md): instruments and tunings design; next is a general chord-voicing search.
- [ROADMAP.md](ROADMAP.md): longer-term options (sound, tab viewer, theory chat).
