# BeatLab — Agent Instructions

Instructions for AI agents working in this repo. Read this before touching anything.

## Architecture in one paragraph

BeatLab is a suite of browser-based music tools (Drums, Multibank, Synth, Nectar).
No build step: pages are HTML with native ES modules, served over HTTP. All audio is
Web Audio API synthesis; no samples, no audio libraries. Code shared across apps lives
in `core/`; Nectar's pages share `nectar/shared/`. GitHub Pages deploys on push to
`main` via `.github/workflows/pages.yml`. Full picture: `ARCHITECTURE.md`.

## Key files to know

| File | What it is |
|---|---|
| `README.md` | Project front page: apps, how to run locally, repo map, docs index |
| `ARCHITECTURE.md` | How it's built: layers, `core/`, audio patterns, persistence, ADR index |
| `CHANGELOG.md` | Version history — update this when shipping features |
| `docs/BACKLOG.md` | Prioritised feature backlog for all apps |
| `docs/share-encoding.md` | Binary bit-pack spec for Drums share links — read before touching encoding |
| `docs/adr-*.md` | Architecture Decision Records — read before making structural changes |
| `<app>/README.md` | Per-app overview: pages, which shared modules it uses |
| `<app>/features.md` | Per-app feature reference (what's built, how it works, signal chain) |
| `docs/groovebox.md` | Drums groovebox design (live looping, queued switching, scenes) |
| `docs/nectar-instruments.md` | Nectar instruments/tunings design and phases |
| `nectar/ROADMAP.md` | Detailed Nectar options (guitar sound, tab viewer, theory chat) |

## Before you start

1. **Read `docs/BACKLOG.md`** to understand priorities and avoid duplicating work.
2. **Read the relevant `features.md`** for the app you're touching — it documents
   non-obvious implementation details (scheduler, state format, encoding schema).
3. **Check `CHANGELOG.md`** for the current version and what's already shipped.
4. **Look for shared code before writing any.** Check `core/` (cross-app) and the
   app's own shared folder (e.g. `nectar/shared/`) for an engine, renderer or
   helper that already does the job. See "Reuse before you write" below.

## Mobile & cross-browser requirements

BeatLab is used on phones. iOS Safari and Android Chrome are first-class targets.
Always consider these when writing or reviewing any code:

### Web Audio
- Create `AudioContext` and call `.resume()` in the **same synchronous gesture handler** — iOS Safari requires both in one call stack or it refuses to unlock audio.
- Defer heavy buffer generation (`createBuffer`, `ConvolverNode` impulse responses, large noise buffers) with `setTimeout(0)` so the gesture handler returns fast.
- Listen for **both `touchstart` and `pointerdown`** to unlock audio — `pointerdown` alone is unreliable on iOS.
- Re-resume `AudioContext` on `visibilitychange` — iOS suspends it on screen lock, phone calls, and tab switches.
- Null-guard any `BufferSourceNode` that depends on a deferred buffer; skip silently rather than throw.

### Touch & interaction
- Use `touch-action: none` on any element that handles `pointermove` for drag/paint gestures.
- Use `pointer` events (not `mouse` or `touch` separately) — they work across all devices. Add `touchstart` only where needed for audio unlock.
- Test tap targets at ≥44px — iOS enforces this for reliable touch.
- `setPointerCapture` for drag operations so they survive leaving the source element.

### Layout
- Add `-webkit-backdrop-filter` alongside `backdrop-filter` — iOS Safari requires the prefix.
- Use `env(safe-area-inset-*)` for padding near screen edges (notch, home indicator).
- Avoid `vh` units for full-height layouts — use `height: 100%` on `html, body` instead; iOS Safari's dynamic toolbar changes `100vh`.
- `position: fixed` menus must be at `<body>` level if any ancestor has `overflow: hidden` — clipping is stricter on WebKit.

### ES Modules
- All apps use `<script type="module">` — supported on iOS 10.3+ and Android Chrome 61+. Safe for our audience.
- Module imports only work over HTTP(S), not `file://`. Always test via the local server or GitHub Pages.
- The local nginx serves with `Cache-Control: no-cache` (`nginx-dev.conf`), so a normal refresh loads edited modules. If a change "doesn't show up", check the container was recreated after that file was added, then hard-refresh.

## Rules

### Never break share links
The Drums share-link encoding is versioned. **If you change the bit layout in
`encodeState()` / `decodeV1()` you must bump `SHARE_VERSION` and add a new
`decodeVN()` function.** Never modify an existing decoder. See `docs/share-encoding.md`.

### Reuse before you write
Duplicated engines across pages are a bug, not a shortcut. Before adding audio,
rendering, scheduling or music-theory code to a page:
- Use what exists in `core/` or the app's shared folder.
- If it doesn't quite fit, **extend the shared module** (new option, layer or
  method, backwards compatible) instead of copying it into the page.
- If you find a second copy of something, consolidate it, or flag it in
  `docs/BACKLOG.md` if it's out of scope.
- Code used by more than one page of an app belongs in that app's shared folder.
  Code used by more than one app belongs in `core/`.

### Native ES modules, no build step
Pages may be a single `.html` file with inline `<style>`/`<script>`, or an
`.html` file that loads native ES modules (e.g. `nectar/licks.html` +
`nectar/licks/*.js`). Code shared across apps lives in `core/`; code shared
across pages of one app lives in that app's folder. Do not introduce a build
step, bundler, or npm runtime dependencies unless it's discussed first. See
`docs/adr-009-multi-file-modules.md` for when to revisit (Vite).

### No samples
All sound is synthesised via Web Audio API. Do not add audio sample files.
(Nectar's AlphaTab proof of concept with an SF2 soundfont was replaced by the Tab
editor; if AlphaTab returns for Guitar Pro import, use it to parse files, not to play
samples, unless that's discussed first.)

### Versioning
We use semantic versioning. While pre-1.0, minor bumps (`0.x`) = meaningful
feature milestones; patch bumps (`0.x.y`) = fixes. Update `CHANGELOG.md` when
shipping. Current version: **0.6.0**.

### Commit style
Prefix commits with the app name: `Drums:`, `Nectar:`, `Multibank:`,
`Platform:`, etc. Keep the subject line under 72 chars.

## App-specific notes

### Drums (`drums/index.html`)
- State format per track: `{ steps: [{on, prob}×32], muted, trackLen, trackPos }`
- `prob` values: 100, 75, 50, 25
- `trackLen = 0` means follow global `STEPS`
- Scheduler: 25ms tick, 100ms lookahead, audio-clock locked
- `STEPS_PER_BEAT = 4` (16th-note resolution, never changes)
- `BEATS_PER_BAR` is user-settable (1–32); `STEPS = BEATS_PER_BAR * STEPS_PER_BEAT`
- Kit order in `KITS` object is fixed — share-encoding depends on it

### Nectar (`nectar/`)
- Five pages: `index.html` (Scales), `chords.html`, `identify.html`, `licks.html`, `tab.html` (Tab editor).
- **All pages must use the shared guitar core in `nectar/shared/`** (ADR-010).
  Never draw a fretboard, synthesise a note, or schedule notes inside a page:

  | Need | Use |
  |---|---|
  | Tuning, note names, scales, interval colours/symbols | `shared/theory.js` (add new scales, tunings and instruments here, not in a page) |
  | A fretboard (dots, box, muted strings, playing/next notes, strum/tap) | `Neck` from `shared/neck.js` |
  | Any sound | `GuitarSynth` from `shared/synth.js` (via `setupAudio()`) |
  | Timed playback (runs, licks, strums longer than a chord) | `Player` from `shared/player.js` (no `setTimeout` note sequencing) |
  | Tab text ↔ events, drawing tab | `shared/notation.js`, `Tab` from `shared/tab.js` |
  | Volume / Tone controls, iOS audio unlock | `setupAudio()` from `shared/audio-ui.js` (needs `#vol-slider` + `#tone-select` in the topbar) |
  | Instrument + tuning controls | `setupInstrument()` from `shared/instrument-ui.js` (needs `#instrument-select` + `#tuning-select`); re-render in `onTuningChange()` |

- **String convention:** notes are `{ string, fret }` with string 1 = the top line
  of tab (high e in standard) and the last string = the bottom line. No 0-indexed
  arrays. Never assume 6 strings, a fret count, or that the last string is the
  lowest: use `STRINGS`, `OPEN_MIDI`, `FRET_COUNT`/`neck.frets`, `midiAt()`,
  `stringsLowToHigh()`. They are live bindings that follow the current
  instrument + tuning (see `docs/nectar-instruments.md`).
- New page? Copy the structure of `index.html`: topbar with the Nectar tabs
  (add the new tab to every page), `#instrument-select` + `#tuning-select` +
  `#tone-select` + `#vol-slider`, a
  `#fretboard-container` passed to `new Neck(...)`, and a `<script type="module">`
  that imports from `./shared/`.
- Licks: page code in `nectar/licks/`. Licks are authored in a text tab notation
  documented at the top of `nectar/shared/notation.js`. A lick's `instrument`
  decides which library it appears in (the Instrument select filters it); its
  `tuning` is applied while it's shown (not saved as the user's choice).
- **After touching `nectar/shared/` or any Nectar page, run the smoke test:**
  `python3 nectar/tests/smoke.py` (needs the local server: `docker compose up -d`
  at the repo root, port 8765; and
  `pip install playwright && playwright install chromium`). It drives every page
  and records the notes the synth plays.
- Consistent topbar pattern across all pages (see `nectar/features.md`).

### Multibank (`multibank/index.html`)
- Multi-voice step sequencer with per-channel sound shaping
- Patterns saved via `core/storage.js`
