# BeatLab — Product Backlog

Consolidated feature backlog for all apps. Organised by theme, not app, since
platform features affect everything. App-specific work is tagged **[Drums]**,
**[Nectar]**, **[Multibank]**, **[Synth]**, or **[Platform]**.

Items within each section are roughly priority-ordered (top = do soonest).

---

## Export

- **[Platform] WAV export** — render current pattern to a downloadable WAV via
  `OfflineAudioContext`. No dependencies. ~1–2 days. Do this first; it unlocks
  everything below.
- **[Platform] MIDI export** — export step patterns as a `.mid` file for DAW
  import (Ableton, Logic, GarageBand). Drums use channel 10 + GM note mapping
  (kick=36, snare=38, etc.). BPM-agnostic; preserves timing and velocity.
  ~1–2 days. The "mixing format" users will ask for.
- **[Platform] MP3/AAC export** — encode the WAV buffer client-side.
  WebCodecs API for AAC (patchy browser support); `lamejs` WASM for MP3
  (reliable, ~200 KB bundle). Requires WAV export first. ~2–4 days.
- **[Platform] Stem export** — render each track independently (mute all
  others, run OfflineAudioContext N times), bundle as a ZIP via `JSZip`.
  ~3–5 days.

---

## Share & Collaboration

- **[Platform] Beat library** — curated JSON file of preset patterns (bundled,
  no server). A "Load example" dropdown that calls `applyState()`. Easy to
  author and ship. ~1 day.
- **[Platform] Community library** — user-submitted patterns with browse and
  preview. Requires a backend (DB, auth or rate-limiting, moderation). Weeks.
- **[Drums] Shareable links** ✅ — done. See `docs/share-encoding.md`.

---

## Drums — Rhythm & Playback

- **Swing** — offset even 16th notes by a percentage (0–100%). Single
  `swingAmount` param in `scheduleStep()`. Makes patterns feel human and loose.
- **Per-step velocity** — each step fires at a set volume (ghost notes, accents).
  Encode as a third state alongside `on` and `prob`.
- **Overdub** — record additional pad taps on top of an existing take without
  clearing it first.
- **Take playback in Pads** — replay a saved take so pad animations play back
  in time. Useful for review before loading into the sequencer.

---

## Drums — Sound

- **Additional kits** — more synthesis presets beyond the current four.
  No samples needed; kits are just parameter objects.
- **Per-track tuning** — a pitch offset per track (e.g. tune the kick lower,
  raise the hi-hat). Small number input or drag.
- **Reverb / send effects** — a global reverb bus via `ConvolverNode`; per-track
  send amount. Gives the kit a sense of space.

---

## Nectar — Sound

- **Improved guitar synthesis** — current Karplus-Strong is generic.
  Options (see `nectar/ROADMAP.md` for full analysis):
  1. BiquadFilter EQ chain to differentiate acoustic/electric/nylon (low effort)
  2. Lightweight custom sampler with a small MP3 set (medium)
  3. AlphaTab/alphaSynth SF2 soundfont (high quality, ~5–15 MB download)
- **Voicing variations in Chord Identifier** — given a matched chord, show
  alternative fingerings on the neck (E-shape / A-shape and others).

---

## Nectar — Theory & Learning

- **Music Theory Chat** — floating chat panel backed by Claude via a small
  backend proxy. Context-aware: automatically includes current scale/chord/
  identified notes so answers are grounded in what the user sees.
  See `nectar/ROADMAP.md` for full implementation path.
- **Loop region** — select a fret range and loop just those notes for practice.
- **Metronome** — audible click track independent of scale playback.
- **MIDI output** — emit MIDI events so external synths/DAWs can use Nectar
  as a controller.
- **Enharmonic spelling** — respell note names using correct accidentals for
  the detected key (G# in E major vs Ab in F minor).

---

## Nectar — Tab Viewer

Tab viewer (`tab.html`) is a proof-of-concept using AlphaTab. See
`nectar/ROADMAP.md` for the full library analysis and integration path.

- **Song library** — curated set of `.gp5` files or alphaTex strings; picker UI
- **Fretboard sync** — highlight the currently playing note on the Nectar neck
- **Mobile layout** — vertical scrollable neck, touch-optimised controls

---

## Platform & Infrastructure

- **Intro / onboarding** — a first-launch explainer for each app. Requested by
  users who found Nectar confusing. Could be a dismissable overlay or a short
  tooltip tour.
- **Synth completion** — polyphonic keyboard synth is "in progress". Arp, LFO,
  ADSR, and XY filter pad are partially built.
- **Shared transport** — long-term vision: a unified BPM/play/stop bus so
  Drums and Multibank stay in sync when open together. Requires a
  `SharedArrayBuffer` or BroadcastChannel message bus.
- **Progressive Web App (PWA)** — add a service worker + manifest so BeatLab
  installs to the home screen and works offline.
- **Versioning** — see `CHANGELOG.md`. Currently on `0.4.0`.

---

## Completed (recently shipped)

- ✅ Drums: Euclidean rhythm generator (Bresenham)
- ✅ Drums: Step probability (100/75/50/25%)
- ✅ Drums: Polymeter (per-track step length)
- ✅ Drums: Time signature (1–32 beats/bar)
- ✅ Drums: Shareable links (binary bit-pack encoding, versioned)
- ✅ Drums: Topbar dropdowns (View, Kit, Timing, App nav)
- ✅ Drums: Reset button
- ✅ Drums: Cross-track drag
- ✅ Drums: Pad recording with metronome
- ✅ Nectar: Consistent topbar + volume slider across all pages
- ✅ Multibank: Mute All
- ✅ Platform: BeatLab icon + favicon
