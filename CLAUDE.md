# BeatLab — Agent Instructions

Instructions for AI agents working in this repo. Read this before touching anything.

## Architecture in one paragraph

BeatLab is a suite of browser-based music tools. No build step — every app is
a self-contained single HTML file. All audio is Web Audio API; no samples, no
external audio libraries. Apps share `core/storage.js` for localStorage pattern
persistence. GitHub Pages deploys on push to `main` via `.github/workflows/pages.yml`.

## Key files to know

| File | What it is |
|---|---|
| `CHANGELOG.md` | Version history — update this when shipping features |
| `docs/BACKLOG.md` | Prioritised feature backlog for all apps |
| `docs/share-encoding.md` | Binary bit-pack spec for Drums share links — read before touching encoding |
| `docs/adr-*.md` | Architecture Decision Records — read before making structural changes |
| `drums/features.md` | Drums feature reference (what's built, how it works) |
| `nectar/FEATURES.md` | Nectar feature reference |
| `nectar/ROADMAP.md` | Detailed Nectar options (guitar sound, tab viewer, theory chat) |

## Before you start

1. **Read `docs/BACKLOG.md`** to understand priorities and avoid duplicating work.
2. **Read the relevant `features.md`** for the app you're touching — it documents
   non-obvious implementation details (scheduler, state format, encoding schema).
3. **Check `CHANGELOG.md`** for the current version and what's already shipped.

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

## Rules

### Never break share links
The Drums share-link encoding is versioned. **If you change the bit layout in
`encodeState()` / `decodeV1()` you must bump `SHARE_VERSION` and add a new
`decodeVN()` function.** Never modify an existing decoder. See `docs/share-encoding.md`.

### One HTML file per app
Apps are single `.html` files with inline `<style>` and `<script>`. Do not
introduce a build step, bundler, or external JS dependencies unless there is
a very strong reason and it's discussed first. `core/storage.js` is the only
shared module.

### No samples
All sound is synthesised via Web Audio API. Do not add audio sample files.
Exception: Nectar's tab viewer uses AlphaTab + SF2 soundfont (documented in
`nectar/ROADMAP.md`) — that's a deliberate opt-in.

### Versioning
We use semantic versioning. While pre-1.0, minor bumps (`0.x`) = meaningful
feature milestones; patch bumps (`0.x.y`) = fixes. Update `CHANGELOG.md` when
shipping. Current version: **0.4.0**.

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
- Three pages: `index.html` (Scales), `chords.html`, `identify.html`
- Karplus-Strong synthesis in an inline AudioWorklet blob
- Consistent topbar pattern across all three pages (see `nectar/FEATURES.md`)

### Multibank (`multibank/index.html`)
- Multi-voice step sequencer with per-channel sound shaping
- Patterns saved via `core/storage.js`
