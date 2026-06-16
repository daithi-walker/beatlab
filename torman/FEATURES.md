# Torman — Local Dev Notes

Torman is based on [thunder-clapper/torman](https://thunder-clapper.github.io/torman/) — a canvas gesture bass synth by a collaborator. This directory tracks local tweaks on top of that upstream work. It is excluded from the BeatLab GitHub Pages deployment; run it locally via Docker.

## Changes on top of upstream (from commit `1c1e0b0`)

---

## Signal Chain

```
canvas gesture (X pos → pentatonic pitch, Y pos → register)
    │
    ▼
OscillatorNode (sawtooth, bass frequency)
    │
    ├──► OscillatorNode (sub, octave down, sine)
    │
    ▼
BiquadFilterNode (lowpass, resonant — "growl")
    │
    ▼
WaveShaperNode (soft-clip distortion)
    │
    ├──► GainNode ──► ConvolverNode (reverb)  ──┐
    │                                             │
    ▼                                             │
GainNode (dry mix) ◄──────────────────────────────┘
    │
    ▼
GainNode (master)
    │
    ├──► AnalyserNode (drives visual system — note grid, particles, pulse rings)
    │
    ▼
AudioContext.destination

Ambience (ocean / rain / birds):
AudioBufferSourceNode → GainNode (individual vol) → GainNode (ambience bus) → master
```

Audio file visualiser routes through a separate `AnalyserNode` alongside the bass synth chain.

---

## Demo Sequences

A **dropdown + Demo button** in the top bar lets you hear the bass synth in action without having to draw. Seven sequences are included:

| Sequence | Notes |
|---|---|
| Close Encounters | G A F F(low) C — the five-note motif |
| Jaws | E / F alternating, accelerating rhythm |
| Beethoven's 5th | G G G Eb · F F F D |
| Imperial March | Full Darth Vader bass line |
| Also Sprach Zarathustra | C → G → C (2001 sunrise) |
| Tubular Bells | Two-phrase riff from the Exorcist theme |
| Twin Peaks | Descending Badalamenti bass figure |

- Selecting from the dropdown immediately starts the sequence.
- The **Demo** button acts as a play/stop toggle.
- `D` keyboard shortcut also toggles demo playback.
- Each sequence loops continuously.
- The animated cursor traces the melody across the canvas, leaving coloured trails and triggering the note-grid and particle system.

---

## Audio File Visualizer

**Load Track** opens a file picker (any MP3, WAV, or browser-supported format). The audio routes through a Web Audio `AnalyserNode` and frequency data drives the existing visual system each frame:

- Sub-bass / bass energy → background glow + trail cursor movement
- Mids → particle bursts
- High-mids → pulse rings
- The filename is shown in the now-playing label.

Click **■ Stop Track** (the same button, which relabels itself) to stop playback and return to draw mode.

---

## Transposition

The **Transpose** row in the Bass Engine panel shifts demo sequence pitch in real time:

| Button | Effect |
|---|---|
| -8ve | Down one octave (−12 semitones) |
| ▼ | Down one semitone |
| 0 | Reset to original pitch |
| ▲ | Up one semitone |
| +8ve | Up one octave (+12 semitones) |

The **Root note** buttons (D / F / G / A / C) and the **Octave** buttons in the Bass panel also feed into demo pitch — all three stack. So Root note, Octave, and Transpose together give you full chromatic control over where the demo plays.

> Note: Root note and Octave only affect the *demo sequences*. For hand-drawing, Root note controls which pentatonic scale you draw from.

---

## Ambience Off by Default

Ocean waves and birds now start **off** when the page loads. Rain was already off. Enable any of them from the Ambience panel.

---

## Local Dev Setup

```bash
# serve with Docker (nginx)
cd torman/
docker compose up -d
# open http://localhost:8766

# stop
docker compose down
```

The nginx volume mount is live — edit `index.html` and reload; no container restart needed.
