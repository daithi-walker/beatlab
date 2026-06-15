# Multibank — Features & Next Steps

## Done

- 16-step sequencer (industry standard — one bar of 4/4 at 16th-note resolution)
- Dynamic bank add/remove — click Add Bank, configure inline
- 13 bank types: Kick, Snare, Hi-Hat, Clap, Tom Hi, Tom Lo, Open Hat, Crash, Bass, Sub, Lead, Pluck, Pad
- Per-panel type switcher — change type after adding, steps are preserved
- Drag across steps to paint/erase (sets intent on first touch, applies across drag)
- Mute per bank
- Spacebar play/stop
- Per-panel effects (2-column layout):
  - Vol, Filter, LFO (filter modulation), Reverb
  - Delay (8th-note synced, 40% feedback), Distortion (soft-clip sigmoid), Chorus (LFO-modulated delay)
- Shared reverb convolver (send/return pattern — all panels feed one IR)
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

- **Delay sync to BPM** — delay time currently set at bank creation. Should update live when
  BPM slider moves. Also expose a note-division selector (1/4, 1/8, 1/16, dotted).

- **Octave shift per bank** — ±2 octave buttons in the meta column. Lets you run two bass
  banks an octave apart without the note picker.

### Sequencer

- **Variable pattern length per bank** — each bank loops at its own step count (e.g. kick=16,
  hat=8, pad=32). Creates natural polyrhythm when lengths are coprime. Each bank tracks its
  own current position mod its length.

- **Swing** — push odd-numbered steps slightly late. A single `swingAmount` (0–50%) added to
  `nextBeatTime` for odd steps in `scheduleStep`.

- **Pattern slots** — save/load up to 4 patterns per session and switch between them (like the
  loop bank in DubCanvas). localStorage for persistence.

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
