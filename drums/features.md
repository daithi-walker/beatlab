# Drums — Features & Next Steps

## Done

- **12-track TR-style sequencer** — Kick, Snare, Clap, Hi-Hat, Open Hat, Crash, Tom Hi, Tom Lo, Rim, Shaker, Cowbell, Clave
- **16 or 32 steps** — toggle in Timing dropdown, preserves patterns
- **Pure synthesis** — all voices synthesised via Web Audio API (no samples): sine/triangle oscillators for tonal drums, filtered noise for cymbals/claps
- **4 kits** — 808, Acoustic, Lo-Fi, Electronic; kits reparameterise all 12 voices simultaneously
- **Pads view** — Sequencer / Pads toggle in topbar; 3×4 grid of large tappable pads, one per instrument
- **Swipe across pads** — dragging a finger across the grid fires each pad it crosses
- **Save / load patterns** — Patterns ▾ dropdown in topbar, backed by `core/storage.js` / localStorage
- **Mute per track** — speaker icon per row in sequencer
- **Mute All / Unmute All** — single button to silence all tracks; turns pink when active
- **Pad recording with metronome**
  - ⏺ Rec button above pad grid (always visible in pads view, desktop and mobile)
  - Countdown pill sits between Rec button and pad grid (not over any pad)
  - Metronome count-in (1 bar), then records while metronome continues
  - Loop length: 1 / 2 / 4 / 8 bars
  - **Free timing** (default) — records exactly when you tap
  - **Snap to grid** — snaps each hit to nearest 16th note
  - Progress bar counts down by ~1/8 beat during recording so you know time remaining
  - After recording: save state appears with ▶ (loop on pads) and name+save input; no save required to hear it
  - Pending take survives preview — pressing ▶ to audition does not discard the take; stopping playback re-shows the save form
  - Backdrop tap does not dismiss sheet while a pending unsaved take exists — prevents accidental loss
  - ✕ explicitly discards the pending take
  - Takes saved as beat-relative events under `beatlab:drums:rec:<name>`; BPM-agnostic so playback is correct at any tempo
  - No-hits feedback: amber hint if nothing was tapped during recording
  - Any action (Record, play a take) stops existing playback first
  - Delete take requires confirmation to prevent accidental loss
- **Live take looping** — saved takes can be looped directly on the pads without converting to the step grid; BPM-aware (stretches/compresses live with tempo changes); animates pads in sync; runs independently alongside the step sequencer
- **Takes in Patterns dropdown** — saved takes appear in a "Takes" section of the Patterns menu so they're accessible without opening the Rec sheet
- **→ Seq** — loads a take into the step sequencer grid (converts beat-relative events to step indices) and switches to Sequencer view
- **Desktop right panel** (≥900px) — permanent 280px panel on the right side of the screen:
  - **Pads mode**: recording controls (loop length, timing, ⏺ Rec) + saved takes list; play/stop buttons sync with pad animations
  - **Sequencer mode**: built-in presets + saved patterns list + name-and-save input
  - Mobile (<900px): panel hidden; existing bottom sheet and Patterns topbar dropdown unchanged
  - View separation: takes never appear in Sequencer panel; step patterns never appear in Pads panel
- **Cross-track drag** in sequencer — paint or erase steps across all tracks in any direction; single container listener with setPointerCapture
- **Time signature** — 1–32 beats/bar; changes step count live, rebuilds grid
- **Per-track step length (polymeter)** — each track loops independently; tracks drift in and out of phase automatically
- **Step probability** — right-click (or long-press) an active step to cycle fire chance: 100% → 75% → 50% → 25%
- **Euclidean rhythm generator** — per-track "E" button; Bjorklund algorithm; grey zone past `trackLen` shows repeating pattern (read-only). Classic patterns: E(3,8) = son clave, E(5,8) = bossa nova, E(7,12) = cascara
- **Kit dropdown** — active kit highlighted; visible in Sequencer and Pads modes; selection persists across page refresh
- **Patterns dropdown** — built-in presets + user-saved patterns + saved takes
  - **Built-in presets**: Four on the Floor, Polyrhythm 3/5/7, Clave Groove
  - Polyrhythm preset uses per-track loop lengths to demonstrate independent phase drift
  - Dirty-state tracking: warns before loading over unsaved changes
- **BPM** — slider + number input in Timing dropdown; bidirectional sync
- **Master volume** — slider, defaults to 50%; persists across refresh and is shared across all BeatLab apps via `beatlab:settings:volume`
- **Reset** — restores steps, mutes, per-track lengths, time signature, and BPM to defaults
- **Lookahead scheduler** — 25ms tick, 100ms lookahead; audio-clock locked
- **View mode persistence** — last view (Sequencer / Pads) restored on page refresh; first visit defaults to Pads on mobile, Sequencer on desktop (`pointer: fine`)
- **Spacebar** play/stop
- **Keyboard pad triggers** — Q W E R / A S D F / Z X C V map to the 3×4 pad grid; works during recording so takes can be captured from keyboard; key labels shown on each pad on desktop only (`pointer: fine`)
- **Escape** stops any playing take and closes open dropdowns
- **iOS Safari compatibility** — pad grid uses non-passive `touchstart` for audio unlock so `ctx.resume()` runs in the synchronous gesture frame; `touchmove` handles swipe; pointer events handle mouse/stylus only; document-level `touchstart` unlock also non-passive; null-guards on all noise-buffer voices
- **Shared app nav** — BeatLab logo + app name in topbar via `core/topnav.js`; app name hidden on mobile; consistent across all apps
- Mobile: touch-action:none on pad grid and step rows; `-webkit-backdrop-filter` for topbar blur on iOS

---

## Backlog

See [`docs/BACKLOG.md`](../docs/BACKLOG.md) for prioritised next steps.
