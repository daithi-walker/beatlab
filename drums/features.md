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
- **BPM** — slider + editable number input, bidirectional sync
- **Master volume** — slider in topbar
- **Lookahead scheduler** — 25ms tick, 100ms lookahead; timing locked to audio clock
- Spacebar play/stop
- Mobile: touch-action:none on pad grid and step rows; portrait rotate overlay suppressed in Pads mode

---

## Next Steps

- **Per-track step length (polymeter)** — each track loops at its own step count independently of the global. Kick at 16, hi-hat at 12, cowbell at 7 — they drift in and out of phase creating evolving patterns. Each track needs its own `currentStep` counter mod its own length; scheduler already calls per-track so the change is contained.

- **Step probability** — each step gets a 0–100% chance of firing on any given pass through the loop. The most musical form of "randomness" — a ghost snare at 30%, cowbell at 15% — generative without being chaotic. Store a `vel` (0–100) alongside the boolean `on` per step; scheduler rolls `Math.random()` on fire.

- **Euclidean rhythm generator** — distribute N hits as evenly as possible across M steps (Bjorklund algorithm). Automatically generates clave, bossa nova, Afrobeat patterns. "3 hits in 8 steps" = son clave. Add a small popover per track: hits / steps → fill button.

- **Swing** — offset odd 16th notes by a percentage; single `swingAmount` param in `scheduleStep()`
- **Per-step velocity** — a second row per track (or hold-to-set) lets steps play at different volumes
- **Take playback in Pads** — replay a saved take through the pads view so hits animate as they play
- **Overdub** — record additional taps on top of an existing take without clearing it
- **WAV export** — render the current pattern to a downloadable file via `OfflineAudioContext`
- **Variable pattern length per track** — each track loops at its own step count (polyrhythm)
