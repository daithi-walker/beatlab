# Nectar — Features

All features currently implemented in the app.

---

## Signal Chain

```
fretboard click / strum gesture
    │
    ▼
AudioWorklet (Karplus-Strong synthesis, inline blob)
    │   delay buffer (length = sample rate / frequency)
    │   feedback loop → BiquadFilterNode (lowpass, per-string damping)
    │   noise burst seeds the buffer on each new note
    │
    ▼
GainNode (per-string output)
    │
    ▼
GainNode (master)
    │
    ▼
AudioContext.destination
```

Each string pluck is a separate AudioWorkletNode. The worklet holds its own ring buffer — no OscillatorNode is used. Damping coefficients (0.493–0.498) are tuned per string so lower strings decay more slowly, matching physical behaviour.

---

## Guitar Neck

- Full 21-fret neck in standard EADGBE tuning
- String labels (e B G D A E) on the left, bold and clearly separated from note circles
- Fret position dots at 3, 5, 7, 9 (single), 12 (double), 15, 17, 19, 21
- Fret numbers shown at landmark positions
- String gauge thicknesses — low E visually thicker than high e
- Rosewood neck background with gold nut

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

**Click or tap** any position on the neck to pluck that note — scale or non-scale, any string, any fret.

**Strum** — hold the mouse button (or touch) and drag:
- Dragging vertically across strings plays each string as you cross it
- Dragging horizontally along a string plays each new fret position
- Release or lift to stop strumming
- A tap without dragging snaps to the nearest fret and plays one note

All notes use **Karplus-Strong synthesis** — a physical string model running in an AudioWorklet. A delay buffer filled with noise feeds back through a low-pass filter; buffer length encodes frequency, damping coefficient controls decay. Per-string damping values give lower strings slightly longer sustain. Zero sample files, fully algorithmic.

---

## Sequencer (Play button)

Pressing **Play** runs an ascending then descending scale run:

- **Box mode OFF** — plays every unique pitch across the neck (frets 0–12), one occurrence per pitch, lowest string preferred. Gives a full two-octave ascending sweep.
- **Box mode ON** — plays only notes within the 4-fret box position. Clean 2-notes-per-string pattern, the standard guitar scale exercise.

**BPM** control (40–200, default 80) — eighth-note timing.

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

**Progression builder:**
- Click an alternative chip to promote it as the chosen interpretation
- `Enter` or `A` — add current best match to the progression log
- `Escape` — clear selection for the next chord
- `Backspace` — remove last chord from progression
- `⎘ Copy` — copies "Am | F | C | G" style text to clipboard
- Click any logged chord chip to remove it individually

**Navigation** — "← Scales" and "← Chords" links in the top bar; "Identify →" links in both the scale and chord explorer top bars.

---

## Tab Viewer (tab.html)

Separate page (`/tab.html`) using AlphaTab loaded from CDN:
- Renders guitar tablature and standard notation
- Audio playback via alphaSynth (SF2 soundfont, sampled instruments)
- Smoke on the Water intro as a proof of concept in alphaTex format
- Play / Stop controls
- Links back to the scale explorer

---

## Local Dev

```bash
cd nectar/
docker compose up -d
# open http://localhost:8767
# tab viewer: http://localhost:8767/tab.html

docker compose down
```

nginx serves the directory with live reload — edit any file and refresh, no container restart needed.
