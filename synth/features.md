# Synth — Features & Next Steps

## Signal Chain

```
keyboard / touch / arp tick
    │
    ▼
OscillatorNode (per voice, per waveform)
    │
    ▼
GainNode (ADSR envelope, per voice)
    │
    ▼
GainNode (voiceBus — all voices sum here)
    │
    ▼
WaveShaperNode (global distortion)
    │
    ▼
BiquadFilterNode (global filter — XY pad)
    │
    ├──► GainNode ──► ConvolverNode (convolution reverb)  ──┐
    ├──► GainNode ──► DelayNode + feedback GainNode        ┤
    ├──► GainNode ──► delay + BiquadFilter (chorus)        ┤
    │                                                        │
    ▼                                                        │
DynamicsCompressorNode ◄────────────────────────────────────┘
    │
    ▼
GainNode (master)
    │
    ▼
AudioContext.destination
```

LFO (when on) modulates either filter cutoff or master gain via a `GainNode` depth controller.

---

## Done

- Polyphonic keyboard synth — multiple notes simultaneously
- Laptop keyboard: home-row layout (A–J = white keys, W E T Y U = black keys, K–; = upper notes)
- Arrow keys shift octave (← →); right-click on piano = octave up
- Drag / slide on piano with mouse or touch to glide between notes
- Multi-touch: each finger plays an independent note
- Octave shift buttons in topbar and flanking the keyboard (◀ ▶)
- Waveform: sine, triangle, sawtooth, square
- Filter: 2D XY pad — X = cutoff (log 80Hz–14kHz), Y = resonance (Q 0–18)
- ADSR envelope per note with compact live canvas visualization
- Effects: reverb (convolution), delay (8th-note, 40% feedback), distortion (soft-clip sigmoid), chorus (LFO delay)
- Oscilloscope — always-visible dark background, live waveform once audio starts
- Reset button — returns all params to a known good state
- iOS / browser audio unlock banner
- Audio chain: voice gains → distortion → filter → compressor → master, with reverb/delay/chorus sends
- **Polyphonic hum fix** — `DynamicsCompressorNode` after filter (-18dB threshold, 6:1 ratio); per-voice peak gain reduced 0.75 → 0.45 to prevent summing clips
- **Voice mode** — Poly (up to 8 simultaneous, configurable max) or Mono (voice steal)
- **Arpeggiator** — On/Off, BPM (60–240), patterns: Up / Down / Up↕Down / Random, Latch mode
- **LFO** — On/Off, rate (0.1–20 Hz), depth, target: Filter cutoff / Amp
- **Piano key latch** — touch quick-tap toggles a note on (amber); tap again to release. Mouse always play-and-release.
- **Octave warmth** — range box, OCT badge, topbar counter, and ◀ ▶ buttons all shift colour across the spectrum (red → amber → teal → blue → violet) as octave changes
- **Note labels on keys** — white keys show note name (C4, D, E…); black keys show accidental name (C#, D#…); NOTES toggle in piano bar shows/hides all labels
- **Layout** — fixed left column (Waveform / Voice / Arpeggiator) + right top (Filter | ADSR | Effects) + right bottom (Scope | LFO | Chord | Sequencer)
- **Panel separation** — gap-based dividers with darker header bands per panel

---

## Next Steps

### Expressiveness

- **Portamento / glide** — ramp oscillator frequency when sliding between notes.
  `osc.frequency.linearRampToValueAtTime(newFreq, now + 0.04)` gives a smooth pitch slide.

- **Velocity via touch Y-position** — tap near top of key = soft, bottom = loud. Maps to gain envelope peak.

- **Pitch bend** — strip above keyboard or drag outside keys to bend pitch up/down.

- **Sustain pedal** — spacebar holds all active notes until released.

### Sound

- **Unison / detune** — multiple oscillators per voice, detuned ±5–20 cents. Dramatically thickens pads and leads.

- **Sub oscillator** — octave-down sine blended under each voice.

- **Noise blend** — white/pink noise mixed into each voice; useful for breath sounds and percussive attacks.

- **Filter envelope** — separate ADSR controlling filter cutoff over the note's lifetime.

- **LFO → pitch** — vibrato on individual oscillator frequencies (currently only filter/amp wired).

### Sampler

Record audio from the microphone and play it back chromatically across the keyboard — turning any sound (voice, instrument, found sound) into a playable instrument.

#### Recording
```js
// 1. Request mic access
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// 2. Record via MediaRecorder
const recorder = new MediaRecorder(stream);
const chunks = [];
recorder.ondataavailable = e => chunks.push(e.data);
recorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const arrayBuf = await blob.arrayBuffer();
  sampleBuffer = await ctx.decodeAudioData(arrayBuf); // → AudioBuffer
  stream.getTracks().forEach(t => t.stop());          // release mic
};
recorder.start();
// ... user taps Stop ...
recorder.stop();
```

#### Playback (per voice)
```js
// Replaces OscillatorNode in noteOn() when sampler mode is active
function noteOnSampler(vkey, name, oct) {
  const src = ctx.createBufferSource();
  src.buffer = sampleBuffer;

  // Transpose: playback rate = target frequency / root note frequency
  const rootFreq = noteToFreq(rootNoteName, rootNoteOct); // e.g. C4 = 261.63 Hz
  src.playbackRate.value = noteToFreq(name, oct) / rootFreq;

  // Loop the sustain region so held notes don't cut off
  src.loop = true;
  src.loopStart = loopStart; // seconds into buffer — set manually or auto-detect zero crossings
  src.loopEnd   = loopEnd;

  const g = ctx.createGain();
  // ... same ADSR envelope as oscillator voices ...
  src.connect(g);
  g.connect(distNode); g.connect(reverbSend); // same effects chain
  src.start();
  voices.set(vkey, { osc: src, g, noteName: name, noteOct: oct });
}
```

#### UI additions (Waveform panel)
- Add **SAMP** as a fifth waveform button alongside SINE / TRI / SAW / SQR
- When SAMP is selected, show:
  - **[● REC]** button — tap to start, tap again to stop; indicator pulses red while recording
  - **Root note** selector — which key the sample was recorded on (e.g. C4); playback rates are relative to this
  - **Loop** toggle — ON = sustain indefinitely (good for pads/voices); OFF = one-shot (good for drums/hits)
  - **Loop start / end** sliders — trim the loop region to avoid clicks at boundaries; ideally auto-snapped to zero crossings
  - Waveform thumbnail — draw the recorded `AudioBuffer` as a miniature waveform so you can see what was captured

#### Transposition limits
A single recording transposes cleanly ±1 octave from root. Beyond that:
- Going up sounds "chipmunk" (shortened, brighter)
- Going down sounds "slow-motion" (stretched, darker)

This is normal and can be a creative tool, but for natural-sounding instruments across the full keyboard, **multi-sampling** is needed:

#### Multi-sampling (advanced)
Record the same sound at multiple root notes (e.g. C2, C3, C4, C5, C6). The engine picks the nearest recording and transposes only within ±6 semitones — transposition artefacts become imperceptible.

```js
// Map of rootMidi → AudioBuffer
const sampleMap = new Map();

function getSampleForNote(targetMidi) {
  // Find the nearest recorded root
  let nearest = null, minDist = Infinity;
  for (const rootMidi of sampleMap.keys()) {
    const d = Math.abs(targetMidi - rootMidi);
    if (d < minDist) { minDist = d; nearest = rootMidi; }
  }
  return { buffer: sampleMap.get(nearest), rootMidi: nearest };
}

// In noteOnSampler():
const targetMidi = 12 * oct + CHROMATIC.indexOf(name);
const { buffer, rootMidi } = getSampleForNote(targetMidi);
src.buffer = buffer;
src.playbackRate.value = Math.pow(2, (targetMidi - rootMidi) / 12);
```

#### Feature panels (placeholder → real)

- **Chord mode** — single key triggers a chord (major / minor / dominant 7th / sus4).

- **Step sequencer** — 8–16 step grid with note + octave per step. BPM shared with arp.

### UI

- **Preset system** — save/load named presets to localStorage. Default set: pad, lead, bass, pluck, bell, noise.

- **Responsive keyboard** — key width scales to fill viewport rather than fixed 58px + horizontal scroll.

### Infrastructure

- **Share with multibank** — `noteToFreq`, `makeImpulse`, `distCurve` are identical across apps. Extract to `core/audio.js` when ready.

- **MIDI input** — `navigator.requestMIDIAccess()` maps hardware noteOn/noteOff to voices.
