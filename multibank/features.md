# Multibank — Features & Next Steps

## Signal Chain

```
step trigger
    │
    ▼
OscillatorNode / AudioBufferSourceNode (noise)   [short-lived, per-hit]
    │
    ▼
GainNode (ADSR envelope baked per voice)
    │
    ▼
WaveShaperNode (distortion, per bank)
    │
    ▼
BiquadFilterNode (per-bank filter)
    │   ╲
    │    GainNode ──► OscillatorNode LFO   [only created when lfoRate > 0]
    │
    ▼
GainNode (panel volume)
    │
    ├──► GainNode ──► shared ConvolverNode (reverb, one for all banks)
    ├──► GainNode ──► shared DelayNode + feedback GainNode (one delay bus)
    └──► GainNode ──► shared chorus DelayNode + LFO (one chorus bus)
                              │
                              ▼
                     DynamicsCompressorNode
                              │
                              ▼
                    AudioContext.destination
```

Three buses are shared across all banks (reverb, delay, chorus). Each bank contributes a send gain to each. Per-bank nodes are distortion, filter, filterLFO (lazy), and volume only.

---

## Done

- **16 or 32 step sequencer** — toggle in topbar; rebuilds all grids in place, preserves patterns
- Dynamic bank add/remove — click Add Bank, configure inline; starts with one Kick bank pre-loaded
- 13 bank types: Kick, Snare, Hi-Hat, Clap, Tom Hi, Tom Lo, Open Hat, Crash, Bass, Sub, Lead, Pluck, Pad
- Per-panel type switcher — change type after adding, steps are preserved
- Drag across steps to paint/erase (sets intent on first touch, applies across drag)
- Mute per bank — speaker icon in panel header (crossed-out = muted)
- FX per bank — opens a side panel (desktop) or bottom sheet (mobile) with vertically-stacked sliders
  - Vol, Filter, LFO Rate, Reverb / Delay, Distortion, Chorus
- **Save / load patterns** — Patterns ▾ popover: name + Save, click to load, ✕ to delete; backed by `core/storage.js` / localStorage
- BPM enterable as a number — slider + editable number input, bidirectional sync
- Shared reverb/delay/chorus buses — eliminates per-bank oscillator and feedback-loop proliferation; audio stays clean with many banks open
- FilterLFO is lazily created only when LFO Rate is dialled above zero
- Delay bus time updates live when BPM changes
- Fullscreen button in topbar (Fullscreen API, expand/collapse icon)
- Mobile: step button contrast boosted at `(pointer: coarse)`
- Mobile: portrait rotate overlay — CSS media query + JS `maxTouchPoints` fallback
- Spacebar play/stop
- Lookahead scheduler (25ms tick, 100ms lookahead) — timing locked to audio clock, not JS

---

## Next Steps

### Sound / Synth (most impactful)

- **ADSR envelope per panel** — attack, decay, sustain, release sliders. Currently all voices have
  hardcoded envelopes. Exposing these transforms a pluck into a pad and vice versa.

- **Waveform picker for melodic panels** — sine / triangle / sawtooth / square selector.
  One line change per voice, huge range of timbres unlocked.

- **Per-step pitch** — each of the 16 steps could play a different note (not just on/off).
  Requires a second row of controls per melodic panel. This is the single biggest jump toward
  a melodic sequencer vs. a pattern trigger.

- **Delay division selector** — expose a note-division picker (1/4, 1/8, 1/16, dotted) instead of fixed 8th-note time. Delay already updates when BPM changes.

- **Octave shift per bank** — ±2 octave buttons in the meta column. Lets you run two bass
  banks an octave apart without the note picker.

### Sequencer

- **Variable pattern length per bank** — each bank loops at its own step count (e.g. kick=16,
  hat=8, pad=32). Creates natural polyrhythm when lengths are coprime. Each bank tracks its
  own current position mod its length.

- **Swing** — push odd-numbered steps slightly late. A single `swingAmount` (0–50%) added to
  `nextBeatTime` for odd steps in `scheduleStep`.

- **Pattern slots** (done — unlimited named patterns via Patterns ▾ popover)

### UI

- **Waveform visualiser per bank** — small canvas showing the oscilloscope or level meter
  next to the step grid, so you can see which banks are firing.

- **Randomise pattern button** — fills steps at a given density (e.g. 25%, 50%) randomly.
  Good for breaking out of habits.

- **Reorder banks by drag** — drag handle on the left of each panel.

- **Keyboard shortcuts** — number keys 1–8 could toggle steps on the focused bank; tab moves
  focus between banks.

### Infrastructure

- **Export to WAV** — use `OfflineAudioContext` to render the loop to a downloadable file.
  Surprisingly straightforward since the scheduler already queues events in clock time.

- **MIDI clock out** — emit MIDI beat-clock so hardware synths can sync to the browser BPM.

- **Per-step parameter locks (p-locks)** — inspired by Elektron workflow: hold a step to open a per-step
  override for filter, reverb, distortion, or pitch. The step plays its own sound colour rather than the
  panel default. Requires storing a small overrides object per step alongside the boolean on/off flag.

---

## BeatLab System Backlog (future, cross-app)

- **Live audio looper** — record mic / instrument input into a loop slot, set loop length, layer and
  mute loops independently. A separate app rather than a rename of Multibank.

- **Unified transport + arrangement view** — shared play clock across apps (Drums, Multibank, Synth),
  timeline lanes for each pattern, drag to rearrange, export to WAV via OfflineAudioContext.
  This would be the browser DAW layer: most comparable to Amped Studio / Soundtrap for web, or
  the modular vision of Tone.js. Added to long-term backlog.
