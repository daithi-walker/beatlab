# Changelog

All notable changes to BeatLab are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the project is pre-1.0, minor version bumps (`0.x`) represent meaningful
feature milestones; patch bumps (`0.x.y`) are fixes and polish.

---

## [Unreleased]

---

## [0.4.0] — 2026-06-16

### Added — Drums
- **Shareable links** — Share button encodes the full pattern (BPM, time sig,
  kit, all steps, probabilities, per-track lengths) into a compact URL hash.
  Binary bit-pack encoding (~150 base64url chars vs ~2700 for raw JSON).
  Versioned encoding schema (v1) with decoder registry — old links always work.
  See `docs/share-encoding.md` for the full specification.
- **BeatLab icon** — Flask logo generated and cropped to square; wired as
  favicon on all pages and as the topbar nav button in Drums.
- **Topbar dropdowns** — View (Sequencer/Pads), Kit (808/Acoustic/Lo-Fi/
  Electronic), and Timing (steps + beats/bar) consolidated into dropdowns.
  App nav dropdown (BL icon) links to all four apps.
- **Platform roadmap** added to README — share links, beat library, WAV/MP3/
  MIDI export, stem export (based on user feedback from TJ).

### Fixed — Drums
- Euclidean fill algorithm replaced with Bresenham line — correct for all
  inputs including E(1,N); previously used broken Bjorklund implementation.
- Kit selector now visible in both Sequencer and Pads modes (was Pads-only).
- Reset button (renamed from Clear) now also restores time signature, BPM,
  per-track lengths, and mute state to defaults.
- Time signature cap raised from 16 to 32 beats/bar (min 1).
- Dropdown menus moved to body level to escape topbar `overflow:hidden` clipping.

---

## [0.3.0] — 2026-06-16

### Added — Drums
- **Polymeter** — each track has its own loop length independent of the global
  bar. Tracks drift in and out of phase automatically.
- **Step probability** — right-click / long-press an active step to cycle fire
  chance: 100% → 75% → 50% → 25%. Shown as darkening overlay + % label.
- **Euclidean rhythm generator** — per-track "E" button. Dial in hits and
  total steps; algorithm spaces them as evenly as possible.
- **Time signature** — free number input replaces preset cycle button.
  Rebuilds step grid live.
- **Cross-track drag** in sequencer — paint/erase steps across all tracks
  in any direction (horizontal, vertical, diagonal).
- **Spacebar** play/stop in both Drums and Multibank.

### Added — Nectar
- Consistent topbar across Scales, Chords, and Identify pages — tab strip
  with active highlight, volume slider on all three pages.

### Added — Multibank
- Mute All / Unmute All button.

### Fixed — Drums
- Count-in sheet blocked the pad grid during recording. Fixed: sheet closes
  on start, floating pill overlays the pads instead.
- Silent recording failure when no hits captured — now reopens sheet with hint.
- Pads squashed on desktop — `min()` sizing on both axes maintains 3:4 ratio.

---

## [0.2.0] — 2026-06-15

### Added — Drums
- **Pads view** — 3×4 grid of tappable pads, one per instrument. Swipe across
  pads fires each pad crossed (Pointer Events API + `elementFromPoint`).
- **Pad recording with metronome** — count-in, loop length selection (1/2/4
  bars), snap-to-grid or free timing. Takes saved to localStorage and loadable
  into the step sequencer.
- **4 kits** — 808, Acoustic, Lo-Fi, Electronic. Reparameterises all 12 voices.
- **Mute All / Unmute All** button.
- **Master volume** slider.
- **BPM** editable number input (bidirectional sync with slider).
- **Save / load patterns** — Patterns popover backed by `core/storage.js`.

### Fixed
- Multibank drag-to-paint on mobile (touch-action: none).
- Synth stuck notes.
- Portrait rotate overlay cross-browser.

---

## [0.1.0] — 2026-06-14

### Added
- **Drums** — 12-track TR-style step sequencer. Pure Web Audio synthesis
  (no samples). 16/32 steps. Lookahead scheduler.
- **Multibank** — multi-voice step sequencer with per-channel sound shaping
  and save/load patterns.
- **Nectar** — guitar theory suite: Scale Explorer, Chord Explorer, Chord
  Identifier. Karplus-Strong synthesis via AudioWorklet.
- **Synth** — polyphonic keyboard synth with arpeggiator, LFO, ADSR, XY pad.
- **Core** — shared `storage.js` (localStorage pattern persistence).
- **GitHub Pages** deployment via Actions on push to main.
- Architecture Decision Records (ADRs 001–007).
