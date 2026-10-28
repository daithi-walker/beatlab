# Synth

A polyphonic keyboard synth with arpeggiator, LFO, ADSR and an XY filter pad, plus the Voice Lab for designing sounds.

**Open:** [live](https://daithi-walker.github.io/beatlab/synth/) · local: `http://localhost:8765/synth/` (see the root [README](../README.md#run-it-locally))

## Pages

| Page | What it is |
|---|---|
| `index.html` (Synth) | Play with the laptop keyboard, mouse or multi-touch. Poly or mono voices, arpeggiator (with latch), LFO, ADSR, XY filter pad, effects, oscilloscope, voice presets and a 🎲 random patch |
| `voice-lab.html` (Voice Lab) | Design a voice against a looping melody and drum pattern: presets (Thin, NIN Bass, Industrial Lead, Supersaw Pad), A/B against a plain oscillator, save patches for the Synth, WAV and MIDI export |

Patches saved in either page appear in both (shared storage).

## Code

- Both pages share the voice engine in `core/voice.js`: a unison stack of detuned oscillators + optional sub octave → drive → resonant lowpass with its own envelope → amp envelope. That richer voice is what replaced the thin "8-bit" single-oscillator sound.
- Also uses `core/audio.js`, `core/storage.js`, `core/topnav.js`; the Voice Lab uses `core/export.js`.
- Signal chain: voices → voice bus → distortion → XY filter → reverb/delay/chorus sends → compressor → master. Full diagram in [features.md](features.md#signal-chain).

## More

- [features.md](features.md): full feature reference, next steps and the sampler design.
