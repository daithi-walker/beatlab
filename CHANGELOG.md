# Changelog

All notable changes to BeatLab are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

While the project is pre-1.0, minor version bumps (`0.x`) represent meaningful
feature milestones; patch bumps (`0.x.y`) are fixes and polish.

---

## [Unreleased]

### Added — Export (Drums & Multibank)
- **WAV / MIDI / stem export** — both the Drums and Multibank sequencers now have
  an Export dropdown in the topbar. WAV renders the full pattern (Drums renders a
  complete polymeter cycle — the LCM of track lengths — capped) through an
  `OfflineAudioContext` that mirrors the live graph exactly, so the file sounds
  like what you hear. MIDI writes a Standard MIDI File (Drums: GM percussion on
  channel 10, step probability → velocity; Multibank: drums on channel 10, each
  melodic panel on its own channel with its note). Stems render each track/panel
  in isolation and bundle them as a ZIP. All pure Web Audio + hand-written byte
  encoders in the new shared `core/export.js` — no libraries, no samples.

### Added — Voice Lab
- **WAV export** — the transport's ⬇ WAV button renders the current loop (two
  passes plus a reverb tail) to a 16-bit stereo WAV and downloads it. Uses an
  `OfflineAudioContext` mirroring the live graph (voice engine, convolution
  reverb, synth drums); pure Web Audio, no libraries or samples.
- **MIDI export** — the ⬇ MIDI button writes the loop as a Standard MIDI File
  (format 0): melody on channel 1, drums on GM channel 10 (kick 36, hat 42),
  tempo baked in. Pure byte-writing, no libraries. Drop it straight into a DAW.

### Added — Synth
- **🎲 RANDOM in the Synth** — the voice panel now rolls a fresh playable patch
  in one tap (same `randomPatch()` the Voice Lab uses), auditioning it on any
  held notes.
- **SPREAD and RES knobs** — stereo width (SPR) and filter resonance (RES) are
  now on the Synth UI, not just carried silently by presets. Both update held
  notes live.
- **Portable patches (copy/paste JSON)** — COPY puts the current patch on the
  clipboard as JSON; PASTE loads one from pasted JSON. Patches now move between
  devices and browsers, not just within one origin's `localStorage`. Available
  in both the Synth and the Voice Lab. `patchToJSON()` / `patchFromJSON()` in
  `core/voice.js`.

## [0.5.0] - 2026-08-09

### Added — Synth (rich synthesis, no samples)
- **Shared voice engine** (`core/voice.js`) — a single pure-synthesis voice:
  unison stack of detuned oscillators + optional sub-octave sine → waveshaper
  drive → resonant lowpass with its own envelope → amp envelope. This is the
  thickness a single oscillator lacks; it escapes the old "8-bit" timbre with
  zero samples. Node teardown on note end prevents the render-load creep that
  used to make the sound drop out. Both the Synth and the Voice Lab import it.
- **Synth voice controls** — new Oscillator panel (unison, detune, sub, drive)
  and per-voice filter (cutoff, filter-envelope amount). The XY pad and effect
  sends remain global on top. Defaults (unison 1, open filter) preserve the
  classic single-oscillator tone.
- **Preset picker + patch bank in the Synth** — the Voice/Preset panel's
  dropdown loads factory presets (Init, NIN Bass, Industrial Lead, Supersaw Pad)
  and, under "Your patches", anything you've saved. A Save-as field + SAVE/DEL
  buttons let you save and remove patches right from the Synth; the bank is
  shared with the Voice Lab, so patches saved in either show up in both.
- **Save patches in the Voice Lab** — dial a sound in, name it, save it. Patches
  persist to shared `localStorage` (`beatlab:voice:<name>`) so they appear in the
  Synth's preset picker automatically. A "Voice Lab ↗" link in the Synth opens
  the bench; the lab is intentionally not on the home grid or app-nav.
- **Live voice controls on held notes** — waveform, detune, drive, cutoff (and
  resonance/spread) now update a note that's already sounding, so sweeping a
  slider while holding a key is audible immediately. Structural knobs (unison,
  sub) and envelopes (ADSR, filter-envelope amount) still apply from the next
  note, as on hardware synths. `handle.update()` in `core/voice.js`.
- **Voice Lab randomiser** — a 🎲 RANDOM button rolls a fresh, playable patch
  (log-uniform frequencies/times, weighted wave/unison picks so results stay
  musical), auditions it, and makes it the new RESET baseline. `randomPatch()`
  in `core/voice.js`, so the Synth can adopt it later too.
- **Voice Lab sequencer** — the fixed demo riff is now an editable, scale-
  constrained melodic step sequencer with editable kick/hat lanes. Pick root,
  scale, octave, step count (8/16) and gate length; a playhead tracks the loop.
  A 🎲 RANDOM button rolls a musical pattern (beat-biased notes, anchored kick,
  offbeat hats) using the current scale and range.
  Purpose-built and lightweight (drives the shared engine directly) rather than
  embedding the Drums app, which is percussion-specific and share-link encoded.

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
