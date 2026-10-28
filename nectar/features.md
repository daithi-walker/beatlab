# Nectar — Features

All features currently implemented in the app.

---

## Shared Guitar Core (`nectar/shared/`)

Every page uses the same neck, synth and scheduler (ADR-010):

| Module | What it does |
|---|---|
| `theory.js` | Tuning, note names, the 10 scales, interval colours/symbols, `positionsInScale()` |
| `neck.js` | `Neck`: SVG fretboard with dot layers, box frame, mute markers, playing/next notes, pluck flash; strum or tap interaction |
| `synth.js` | `GuitarSynth`: Karplus-Strong strings + amp tones |
| `player.js` | `Player`: audio-clock look-ahead scheduler (runs, licks) |
| `audio-ui.js` | `setupAudio()`: topbar Volume + Tone (shared across pages via localStorage `nectar-audio`), iOS unlock |

Notes are `{ string, fret }`, string 1 = top line of tab (tab order).

### Instruments and tunings

**Instrument** and **Tuning** selects in every topbar, shared across pages
(localStorage `nectar-instrument`):

| Instrument | Tunings | Frets | Sound |
|---|---|---|---|
| Guitar | Standard, Half step down, Drop D, DADGAD, Open G, Open D | 21 | reference |
| 7-string guitar | Standard (B), Drop A | 24 | as guitar |
| 12-string guitar | Standard, Half step down | 20 | brighter; octave pairs on the low 4 courses, unison on B/e |
| Bass (4-string) | Standard, Drop D | 20 | long sustain, soft, darker |
| Bass (5-string) | Standard (B) | 24 | as bass |
| Ukulele | Standard (re-entrant gCEA), Low G | 15 | short, soft |
| Mandolin | Standard (GDAE) | 17 | short, bright, unison pairs |

The neck takes its strings, frets and inlays from the instrument; the synth
takes its sustain, pluck position and softness from it.

**Paired strings (courses):** mandolin and 12-string have two strings per course,
fretted together, so tab and fingering show one string per course. Each note
plays both strings: the second at the pair's interval (unison, or an octave up),
3 cents apart and 6 ms later. The neck draws each course as two lines (an octave
string is the thin one).
 Changing it relabels the strings, re-pitches every note and
re-renders the page: Scales anchors its box on the lowest string, Chords labels
its shapes "Root on D / Root on A" outside standard, Identify re-identifies the
selected notes. On Licks, the Instrument select filters the library to that
instrument's licks, and the Tuning select is set by the lick (e.g. Drop D Chug)
without changing the saved choice. Design and roadmap (other instruments,
generic voicings): `docs/nectar-instruments.md`.

### Signal chain

```
neck tap / strum / Player event
    │
    ▼
AudioBufferSourceNode per note (Karplus-Strong buffer, cached per pitch + tone)
    │   playbackRate: exact pitch, plus slide / bend / vibrato automation
    │   one sounding note per string (a new note mutes the last)
    ▼
amp: highpass → body → mid hump → distCurve waveshaper → cab lowpass → presence → level
    │                                                        └─ reverb send (makeImpulse)
    ▼
compressor → volume → destination
```

**Legato:** hammer-ons, pull-offs and slides don't pick again. They retune the
note already ringing on that string (instantly, or gliding for a slide), so the
sound is continuous; a hammer adds a quiet, dull finger tap and a pull-off a
slightly brighter flick. With nothing ringing on the string they fall back to a
soft pick.

**Tone** (topbar select, every page): Acoustic / Clean / Blues / Rock set the
drive, mid hump, cab cutoff, reverb and string sustain.

---

## Guitar Neck

- One SVG neck component on every page, standard EADGBE tuning, high e on top
- 21 frets on Scales/Chords/Identify, 17 on Licks; real (tapered) fret spacing
- String labels (e B G D A E) on the left; inlays at 3, 5, 7, 9, 12 (double), 15, 17, 19, 21
- All fret numbers shown, landmark frets emphasised
- String gauge thicknesses — low E visually thicker than high e
- Rosewood gradient with gold nut
- On touch screens the neck is wider than the screen and scrolls sideways

---

## Scale Explorer

**10 scales available:**

| Scale | Character |
|---|---|
| Minor Pentatonic | Raw, emotive — foundation of rock and blues |
| Major Pentatonic | Open, safe — nothing clashes |
| Major (Ionian) | Bright, resolved |
| Natural Minor (Aeolian) | Melancholic, powerful |
| Blues Scale | Gritty — adds the ♭5 "blue note" to minor pentatonic |
| Dorian | Cool, funky — minor with a raised 6th |
| Phrygian | Tense, exotic — the ♭2 gives a flamenco/metal urgency |
| Mixolydian | Driving, anthemic — major with a flat 7th |
| Harmonic Minor | Dramatic, ornate — the augmented 2nd is the exotic sound |
| Whole Tone | Floating, ambiguous — no half steps, no home note |

**12 chromatic roots** — C through B.

**Note colours:**
- **Amber (orange)** — root notes
- **White** — other scale notes
- **Bright gold** — currently playing note (with expanding ring animation)
- **Subtle hollow dot** — non-scale fret positions (still playable)

**Box mode** — toggle highlights a 4-fret hand position (one finger per fret), the standard way guitarists learn a scale shape. Notes outside the box dim to 12% opacity. Each scale has its box correctly anchored relative to the root (major pentatonic and major scale start one fret below the root; all others start at the root).

---

## Playing Notes

**Click or tap** any position on the neck to pluck that note — scale or non-scale, any string, any fret. Works on Scales, Chords and Licks (Identify uses taps to select notes).

**Strum** — hold the mouse button (or touch) and drag:
- Dragging vertically across strings plays each string as you cross it
- Dragging horizontally along a string plays each new fret position
- Release or lift to stop strumming
- A tap without dragging snaps to the nearest fret and plays one note

All notes use the shared `GuitarSynth` (see Shared Guitar Core above). Zero sample files, fully algorithmic.

---

## Sequencer (Play button)

Pressing **Play** runs an ascending then descending scale run:

- **Box mode OFF** — plays every unique pitch across the neck (frets 0–12), one occurrence per pitch, lowest string preferred. Gives a full two-octave ascending sweep.
- **Box mode ON** — plays only notes within the 4-fret box position. Clean 2-notes-per-string pattern, the standard guitar scale exercise.

**BPM** control (40–200, default 80) — eighth-note timing, scheduled on the audio clock by the shared `Player`.

**Keyboard shortcuts:**
- `Space` — play / stop
- `← →` — cycle root note

---

## Mood Card

Below the neck, each scale shows:
- **Name** and **feel** descriptor
- **Genre** anchors
- **Famous examples**
- **Tip** — plain-English guidance on how to use the scale (e.g. for blues: explains the blue note and how to use it as a passing tone)
- **Legend** — amber dot = root note, white dot = scale note

---

## Chord Explorer (chords.html)

Separate page reachable via "Chords →" in the scale explorer top bar.

**10 chord qualities:**

| Chord | Symbol | Intervals |
|---|---|---|
| Major | (none) | R, maj3, P5 |
| Minor | m | R, min3, P5 |
| Dominant 7th | 7 | R, maj3, P5, min7 |
| Major 7th | maj7 | R, maj3, P5, maj7 |
| Minor 7th | m7 | R, min3, P5, min7 |
| Suspended 2nd | sus2 | R, maj2, P5 |
| Suspended 4th | sus4 | R, P4, P5 |
| Diminished | dim | R, min3, dim5 |
| Diminished 7th | °7 | R, min3, dim5, dim7 |
| Augmented | + | R, maj3, aug5 |

**12 chromatic roots** — C through B.

**Two voicings per chord** (E-shape / A-shape toggle):
- E-shape: root anchored on the low E string
- A-shape: root anchored on the A string (low E muted)
- Both computed algorithmically — no hardcoded shapes, works for any root

**Interval colours** — each chord tone is colour-coded by its role:
- **Amber** — Root (R)
- **Cyan** — Major 3rd
- **Blue** — Minor 3rd
- **Teal** — Perfect 5th
- **Purple** — Minor 7th
- **Light green** — Major 7th
- (and distinct colours for 4th, dim5, aug5, dim7, 9th)

**Two rendering layers:**
- Voicing notes: large filled circles with interval label (R / 3 / 5 / 7 / etc.) and glow
- All other chord tone positions on the neck: smaller, dimmed circles showing where else each interval appears
- Muted strings: X marker to the left of the nut

**Theory card** — below the neck, shows:
- Full chord name and symbol (e.g. "Am7 — A Minor 7th")
- Interval breakdown row: note name + interval name for each chord tone, colour-coded
- One-sentence plain-English explanation of what makes the chord sound the way it does

**Play button** — strums the voiced strings low E → high e at 60ms intervals, like a down-strum. Button flashes amber while playing. Space bar shortcut.

**Navigation** — "← Scales" link back to the scale explorer; "Chords →" link in the scale explorer top bar.

**Interactions** — same click-to-pluck and strum engine as the scale explorer. Strumming across the voicing plays the chord arpeggiated with expanding ring feedback.

---

## Chord Identifier (identify.html)

Separate page reachable via "Identify →" from the scale explorer or chord explorer top bars.

**Rule-based chord recognition** — 33 chord types derived from interval rules, covering:
- Triads: major, minor, diminished, augmented, sus2, sus4
- 7th chords: dom7, maj7, min7, dim7, half-dim (m7♭5), mM7, aug7, augmaj7
- 6th chords: 6, m6, 6/9
- Extended: 9, maj9, m9, add9, madd9, 7sus2, 7sus4, 11, m11, 13
- Alterations: 7♯9 (Hendrix), 7♭9, 7♭5, 7♯11
- Other: power (5), quartal

**How it works:**
1. Click fret positions on the neck to select notes — one note per string (selecting a new position on a string automatically clears the old one)
2. The app tries every selected pitch class as a candidate root and scores it against all 33 templates
3. Best match shown large in amber; up to 4 alternatives shown as smaller chips
4. Selected notes colour-coded by interval relative to the best match root

**Play button** — arpeggios all selected notes low→high at 60ms intervals using the same Karplus-Strong engine. Disabled until at least one note is selected.

**Progression builder:**
- Click an alternative chip to promote it as the chosen interpretation
- `Enter` or `A` — add current best match to the progression log
- `Escape` — clear selection for the next chord
- `Backspace` — remove last chord from progression
- `⎘ Copy` — copies "Am | F | C | G" style text to clipboard
- Click any logged chord chip to remove it individually

**Navigation** — "← Scales" and "← Chords" links in the top bar; "Identify →" links in both the scale and chord explorer top bars.

---

## Navigation & UI

- **Consistent topbar across all pages** — BeatLab home link | Nectar wordmark | Scales / Chords / Identify / Licks tab strip (active tab highlighted in amber) | page-specific controls | Tone select | Vol slider
- **Tone + Volume** — on every page, shared across pages (`setupAudio()`)

---

## Next Steps

### Chord Identifier
- **Show voicing variations** — given a matched chord, show alternative fingerings on the neck (similar to Chord Explorer's E-shape / A-shape toggle, but for the identified chord type). Would let you identify a shape and instantly see other ways to play it.

---

## Licks (licks.html)

A lick trainer: learn short riffs from tab, see them on the neck, and play along.
Code lives in `nectar/licks/` as native ES modules (ADR-009).

**Library** — 28 original licks: 16 for guitar (one in drop D, three with grace notes) and 2-3 each for 7-string, 12-string, 4- and 5-string bass, ukulele and mandolin grouped Foundation / Blues / Rock / Country /
Melody / Technique, each with a level, key, scale, position and target tempo,
plus three plain-English cards: What it is, Why it works, How to practise.

**Tab** — SVG tablature rendered from a compact text notation
(`3-7:q`, `h3-7`, `/3-9`, `2-8b2`, `4-7~`, `5-0+4-2`, `r`, and grace notes `3-5:g`,
which sound on the beat and push the next note ~200 ms later (Grace slider, 50-400 ms, at most 70% of the next note); full spec at the top
of `licks/notation.js`). Beat counts under the staff ("1 & 2 &" or "1 tri let").
Playback cursor + current-note highlight. Click a note to hear it.

**Fretboard** — same orientation as the tab (high e on top). Scale dots with
roots in amber, rings on every position the lick uses, the playing note in gold
and the next note as a teal ring. "This position" / "Whole neck" shows how the
box connects to the rest of the neck; labels switch between Notes / Intervals / Frets.

**Playback** — look-ahead scheduler (same pattern as ADR-003) with swing, loop,
1-bar count-in, click track, speed 40-120% (defaults to 100% so you hear the
lick as intended) and a Speed trainer that starts at 70% and adds 5% per loop.

**Sound** — the shared `GuitarSynth`; the lick's techniques (bends, slides,
hammer-ons/pull-offs, vibrato) are performed by `playbackRate` automation.
The neck is playable too (tap or strum).

**Keys** — `Space` play/stop, `L` loop, `←` / `→` speed. Settings persist in
localStorage (`nectar-licks`).

---

## Tab editor (tab.html)

Write tab and hear it back. Code: `tab/editor.js` on the shared core (it reuses the Licks
tab renderer and notation from `shared/tab.js` and `shared/notation.js`).

**Songs** — title, artist, instrument, tuning, BPM and the tab, saved in this browser
only (localStorage `nectar-songs`). New / switch / delete from the song bar; **Export**
downloads a plain-text file (`key: value` lines, then `tab:` in the lick notation) and
**Import** loads one back. The topbar Instrument/Tuning belong to the open song.

**Entering notes**
- Click a beat and string on the tab (or move with the arrow keys), then type a fret
  number; two digits typed quickly make one fret (1, 2 → 12).
- Or tap a fret on the neck: that note goes in at the cursor, and with **Advance** on
  the cursor moves to the next beat (fast melody entry on a phone).
- Note lengths from the toolbar (whole to sixteenth, triplets) or `+` / `-`; new beats
  take the last length chosen.
- Techniques from the toolbar or keys: `H` hammer, `P` pull, `S` slide, `B` bend
  (full → half → off), `V` vibrato, `G` grace note, `R` rest.
- `I` / "+ beat" inserts a beat, `Shift+Delete` / "− beat" removes one, `Delete` removes
  the note under the cursor; undo/redo with `Cmd/Ctrl+Z` / `Shift+Cmd/Ctrl+Z`.

**Playback** — the shared `Player` (loop, count-in, click), with the tab cursor and the
neck following along. On phones the transport is pinned to the bottom, the song details
fold behind "Edit", and the toolbar scrolls sideways.

---

## Local Dev

```bash
docker compose up -d        # from the repo root
# open http://localhost:8765/nectar/

docker compose down
```

nginx serves the repo with `Cache-Control: no-cache`, so edit any file and refresh; no container restart needed.
