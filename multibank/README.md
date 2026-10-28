# Multibank

A multi-voice step sequencer: add drum and synth "banks", paint steps, and shape each bank's sound with its own effects.

**Open:** [live](https://daithi-walker.github.io/beatlab/multibank/) · local: `http://localhost:8765/multibank/` (see the root [README](../README.md#run-it-locally))

## What it does

- **Banks:** add or remove banks of 13 types (kick, snare, hats, clap, toms, crash, bass, sub, lead, pluck, pad); change a bank's type without losing its steps.
- **Sequencer:** 16 or 32 steps, drag to paint or erase, mute per bank, BPM in the Timing menu.
- **Per-bank FX:** volume, filter, filter LFO, distortion, and sends to shared reverb, delay and chorus buses.
- **Patterns:** save and load (localStorage).
- **Export:** WAV, MP3, MIDI (drums on channel 10, each melodic bank on its own channel) and stems (ZIP).

## Code

- `index.html`: the whole app (inline styles and module script).
- Uses `core/audio.js`, `core/storage.js`, `core/export.js` and `core/topnav.js`.
- Signal chain: per-hit voices → per-bank distortion → filter → volume → shared reverb/delay/chorus buses → compressor. Full diagram in [features.md](features.md#signal-chain).

## More

- [features.md](features.md): full feature reference and next steps.
