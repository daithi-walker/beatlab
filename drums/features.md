# Drums — Features & Next Steps

## Done

- **12-track TR-style sequencer** — Kick, Snare, Clap, Hi-Hat, Open Hat, Crash, Tom Hi, Tom Lo, Rim, Shaker, Cowbell, Clave
- **16 or 32 steps** — toggle in topbar, preserves patterns
- **Pure synthesis** — all voices synthesised via Web Audio API (no samples): sine/triangle oscillators for tonal drums, filtered noise for cymbals/claps
- **4 kits** — 808, Acoustic, Lo-Fi, Electronic; kits reparameterise all 12 voices simultaneously
- **Pads view** — Sequencer / Pads tab toggle in topbar; 3×4 grid of large tappable pads, one per instrument
- **Swipe across pads** — dragging a finger across the grid fires each pad it crosses
- **Save / load patterns** — Patterns ▾ popover, backed by `core/storage.js` / localStorage
- **Mute per track** — speaker icon per row in sequencer
- **Mute All / Unmute All** — single button to silence everything instantly
- **Pad recording with metronome** — hit ● Record in Pads view; 4-click count-in, then tap pads live
  - Loop length: 1 / 2 / 4 bars (selector in toolbar)
  - Quantize mode: snaps taps to nearest 16th note (toggle to free timing)
  - Takes saved as beat-relative events in `core/storage.js` under `beatlab:drums:rec:<name>`
  - **→ Seq** button loads a take into the step sequencer grid and switches to Sequencer view
- **BPM** — slider + editable number input, bidirectional sync
- **Master volume** — slider in topbar
- **Lookahead scheduler** — 25ms tick, 100ms lookahead; timing locked to audio clock
- Spacebar play/stop
- Mobile: touch-action:none on pad grid and step rows; portrait rotate overlay suppressed in Pads mode

---

## Next Steps

- **Swing** — offset odd 16th notes by a percentage; single `swingAmount` param in `scheduleStep()`
- **Per-step velocity** — a second row per track (or hold-to-set) lets steps play at different volumes
- **Take playback in Pads** — replay a saved take through the pads view so hits animate as they play
- **Overdub** — record additional taps on top of an existing take without clearing it
- **WAV export** — render the current pattern to a downloadable file via `OfflineAudioContext`
- **Variable pattern length per track** — each track loops at its own step count (polyrhythm)
