# Synth — Features & Next Steps

## Done

- Polyphonic keyboard synth — multiple notes simultaneously
- Laptop keyboard: home-row layout (A–J = white keys, W E T Y U = black keys, K–; = upper notes)
- Arrow keys shift octave (← ▶); right-click on piano = octave up
- Drag / slide on piano with mouse or touch to glide between notes
- Multi-touch: each finger plays an independent note
- Octave shift buttons in topbar and flanking the keyboard (◀ ▶)
- Waveform: sine, triangle, sawtooth, square
- Filter: 2D XY pad — X = cutoff (log 80Hz–14kHz), Y = resonance (Q 0–18)
- ADSR envelope per note with live canvas visualization
- Effects: reverb (convolution), delay (8th-note, 40% feedback), distortion (soft-clip sigmoid), chorus (LFO delay)
- Oscilloscope showing live waveform output
- Reset button — returns all params to a known good "normal" state
- Three-row layout: control panels | feature panels | keyboard (~equal height each)
- iOS / browser audio unlock banner
- Shared audio architecture: distortion → filter → master, with reverb/delay/chorus sends
- **Voice mode** — Poly (up to 8 simultaneous, configurable max) or Mono (voice steal)
- **Arpeggiator** — On/Off, BPM (60–240), patterns: Up / Down / Up↕Down / Random, Latch mode
- **LFO** — On/Off, rate (0.1–20 Hz), depth, target: Filter cutoff / Pitch / Amp

---

## Next Steps

### Expressiveness

- **Portamento / glide** — when sliding between notes (drag), ramp the oscillator frequency instead of jumping.
  `osc.frequency.linearRampToValueAtTime(newFreq, now + 0.04)` gives a smooth pitch slide.

- **Velocity via touch pressure or Y-position** — tap near the top of a key = soft, bottom = loud.
  Maps to initial gain envelope peak.

- **Pitch bend** — drag anywhere outside the keys to bend pitch up/down.
  Or dedicate a small strip at the top of the keyboard area.

- **Sustain pedal** — spacebar holds all active notes (sustain mode), release on spacebar up.

### Sound

- **Unison / detune** — multiple oscillators per voice, slightly detuned (±5–20 cents).
  Makes pads and leads dramatically thicker. Configurable count (1–4 osc) and detune amount.

- **Sub oscillator** — octave-down sine blended under each voice. Classic for bass sounds.

- **Noise blend** — mix white/pink noise into each voice. Useful for breath sounds, percussive attacks.

- **Filter envelope** — ADSR controlling filter cutoff (separate from amp ADSR). Standard on every hardware synth.

- **LFO → pitch target** — LFO vibrato on individual oscillator frequencies (currently only filter/amp targets wired).

### Feature panels (placeholder → real)

- **Chord mode** — single key triggers a chord (major / minor / dominant 7th / sus4). Stack voices on top of the held note.

- **Step sequencer** — 8–16 step grid, each step locks a note. BPM controls shared with arp. Toggle steps on/off to build patterns; sequence plays alongside live keyboard input.

### UI

- **Preset system** — save/load named presets to localStorage.
  Could ship with 6–8 default presets: pad, lead, bass, pluck, bell, noise.

- **Keyboard note labels** — currently shows the laptop key shortcut. Could also show note name (C4, D4, etc.) on white keys.

- **Responsive keyboard** — keyboard key width scales to fill the screen width,
  rather than fixed 58px with horizontal scroll.

### Infrastructure

- **Share with multibank** — `noteToFreq`, `makeImpulse`, `distCurve` are already identical.
  Extract to `core/audio.js` when ready to import across apps.

- **MIDI input** — `navigator.requestMIDIAccess()` + map noteOn/noteOff messages to voices.
  Hardware keyboard plays the synth directly.
