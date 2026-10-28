# Drums

A 12-track TR-style drum machine, entirely synthesised (no samples).

**Open:** [live](https://daithi-walker.github.io/beatlab/drums/) · local: `http://localhost:8765/drums/` (see the root [README](../README.md#run-it-locally))

## What it does

- **Sequencer:** 12 tracks (kick, snare, clap, hats, crash, toms, rim, shaker, cowbell, clave), 16 or 32 steps, 1-32 beats per bar, per-track step length (polymeter), per-step velocity and probability, swing.
- **Pads:** a 3×4 grid of tappable pads (swipe across to roll), with count-in recording of live takes that loop on the pads or convert to the step grid.
- **Kits:** 808, Acoustic, Lo-Fi, Electronic. A kit re-parameterises all 12 synthesised voices.
- **Groovebox:** queued pattern switching on the next bar and a scene launcher ([design](../docs/groovebox.md)).
- **Share links:** the whole pattern encoded in the URL ([format](../docs/share-encoding.md); versioned, never break old links).
- **Export:** WAV, MP3, MIDI (GM drum channel) and per-track stems (ZIP).

## Code

- `index.html`: the whole app (inline styles and module script).
- Uses `core/audio.js` (noise buffers, reverb impulse), `core/storage.js` (patterns, volume), `core/export.js` (WAV/MP3/MIDI/ZIP) and the vendored `core/vendor/lamejs.min.js` for MP3 ([ADR-008](../docs/adr-008-lamejs-mp3.md)).
- Look-ahead scheduler: 25 ms tick, 100 ms horizon, 16th-note steps ([ADR-003](../docs/adr-003-lookahead-scheduler.md)).

## More

- [features.md](features.md): full feature reference (state format, scheduler details, iOS notes).
- [`CLAUDE.md`](../CLAUDE.md): rules for this app, including share-link versioning.
