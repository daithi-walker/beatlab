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
- **Mute All / Unmute All** — single button in topbar to silence all tracks instantly; turns pink when active
- **Pad recording with metronome** — tap ⏺ Rec in topbar (pads mode) to open a recording sheet
  - Sheet closes immediately on start so pads are visible and tappable during count-in
  - Floating pill over pad grid shows countdown (4 3 2 1) then ● REC
  - Loop length: 1 / 2 / 4 bars
  - **Snap to grid** — snaps each hit to nearest 16th note (with description)
  - **Free timing** — records exactly when you tap (with description)
  - Takes saved as beat-relative events in `core/storage.js` under `beatlab:drums:rec:<name>`
  - **→ Seq** button loads a take into the step sequencer grid and switches to Sequencer view
  - No-hits feedback: if nothing was recorded, sheet reopens with an amber hint
- **Cross-track drag** in sequencer — dragging in any direction (horizontal, vertical, diagonal) paints or erases steps across all tracks; single container listener with setPointerCapture
- **Time signature** — free number input (1–32 beats/bar) in topbar; changes step count live, rebuilds grid
- **Per-track step length (polymeter)** — each track has its own loop length independent of the global bar length. Set it per-track via a small input in the track label. Tracks drift in and out of phase automatically as they loop at different lengths.
- **Step probability** — right-click (or long-press on mobile) an active step to cycle its fire chance: 100% → 75% → 50% → 25%. Displayed as a darkening overlay + percentage label on the step button.
- **Euclidean rhythm generator** — per-track "E" button opens a popover: dial in hits and total steps, click Fill. Spaces hits as evenly as possible using Bresenham's line algorithm. Always starts on beat 1. Classic patterns: E(3,8) = son clave, E(5,8) = bossa nova, E(7,12) = cascara.
- **Kit selector in topbar** — 4 kits (808, Acoustic, Lo-Fi, Electronic) always visible in both Sequencer and Pads modes
- **Reset** — single button restores all steps, mutes, per-track lengths, time signature (4/4), and BPM (120) to defaults
- **BPM** — slider + editable number input, bidirectional sync
- **Master volume** — slider in topbar
- **Lookahead scheduler** — 25ms tick, 100ms lookahead; timing locked to audio clock
- Spacebar play/stop
- Mobile: touch-action:none on pad grid and step rows; portrait rotate overlay suppressed in Pads mode

---

## Backlog

See [`docs/BACKLOG.md`](../docs/BACKLOG.md) for prioritised next steps.
